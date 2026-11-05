// Liquid mixtures, % w/w. Generic AU GHS 7 screening for SDS Section 2.
// Sources: Safe Work Australia, Classifying hazardous chemicals (June 2023),
// sections 3.5/3.6 and Appendix B; UN GHS 7, section 4.1.3.5.5.
// https://www.safeworkaustralia.gov.au/sites/default/files/2023-06/classifying_hazardous_chemicals_national_guide.pdf
// https://unece.org/DAM/trans/danger/publi/ghs/ghs_rev07/English/04e_part4.pdf
// Test data, non-additive effects, specific limits and other SDS disclosures
// can change the result. Unsupported or incomplete cases remain Review.

const epsilon = 1e-10
const atLeast = (value, limit) => value + epsilon >= limit
const asNumber = value => value != null && String(value).trim() !== "" && Number.isFinite(Number(value)) ? Number(value) : null
const atoms = code => String(code || "").split("+").map(value => value.trim()).filter(Boolean)
const unique = values => [...new Set(values)]
const category = value => String(value ?? "").trim().toUpperCase()

function specificLimit(material, code) {
  const limits = material.record.ghsSpecificLimits ?? material.record.specificConcentrationLimits
  const value = Array.isArray(limits) ? limits.find(limit => limit?.code === code)?.minPercent : limits?.[code]
  const number = asNumber(value && typeof value === "object" ? value.minPercent : value)
  return number != null && number > 0 ? number : null
}

function chemicalKey(material) {
  const cas = (Array.isArray(material.record.cas) ? material.record.cas : [material.record.cas]).filter(Boolean)
  return cas.length === 1 && /^\d{2,7}-\d{2}-\d$/.test(String(cas[0])) ? `cas:${cas[0]}` : material.key
}

export function assessGhsMixture(materials, { incomplete = false } = {}) {
  // A generic reproductive code and a specific variant on the same chemical
  // describe one endpoint. Keep the more informative variant, not a conflict.
  const reproductiveVariants = new Map()
  for (const material of materials) {
    const key = chemicalKey(material)
    const codes = material.hazards.flatMap(hazard => atoms(hazard.code))
    const variants = reproductiveVariants.get(key) || new Set()
    for (const code of codes) if (/^H36[01].+/.test(code)) variants.add(code)
    reproductiveVariants.set(key, variants)
  }
  materials = materials.map(material => ({
    ...material,
    hazards: material.hazards.flatMap(hazard => atoms(hazard.code).flatMap(code => {
      const variants = /^H36[01]$/.test(code)
        ? [...reproductiveVariants.get(chemicalKey(material))].filter(variant => variant.startsWith(code)) : []
      return (variants.length ? variants : [code]).map(variant => ({ ...hazard, code: variant }))
    }))
  }))
  const assessments = new Map()
  const has = (material, code) => material.hazards.some(hazard => atoms(hazard.code).includes(code))
  const classified = codes => materials.filter(material => codes.some(code => has(material, code)))
  const allCodes = unique(materials.flatMap(material => material.hazards.flatMap(hazard => atoms(hazard.code))))
  const pct = (material, bound) => bound === "min" ? material.minPercent : material.maxPercent
  const sum = (pool, bound) => pool.reduce((total, material) => total + pct(material, bound), 0)
  const sources = pool => unique(pool.map(material => material.key))
  const savedCategory = (material, code) => category(material.hazards.find(hazard => atoms(hazard.code).includes(code))?.category)

  function set(code, status, reason, pool, extra = {}) {
    if (status === "below" && incomplete) {
      status = "review"
      reason += " Missing recipe hazard information prevents excluding this code."
    }
    assessments.set(code, { code, status, reason, sourceKeys: sources(pool), ...extra })
  }

  // Each level is ordered from most to least severe. Evaluating both bounds
  // avoids treating an uncertain stock concentration/basis as a known dilution.
  function family(inputCodes, levels, reason, { reviewReason = "", forceReview = false, uncertainBelow = false, ignoredCodes = [], assumptions = [] } = {}) {
    const pool = classified(inputCodes)
    if (!pool.length) return
    const rank = bound => {
      const index = levels.findIndex(level => level.test(bound))
      return index < 0 ? levels.length : index
    }
    const weak = rank("min")
    const strong = rank("max")
    const possible = new Set(levels.slice(strong, weak + 1).map(level => level.code))
    const requested = new Set(allCodes.filter(code => inputCodes.includes(code)))
    for (const code of possible) requested.add(code)
    const certain = possible.size === 1 && weak < levels.length ? [...possible][0] : null
    for (const code of requested) {
      if (ignoredCodes.includes(code)) continue
      let status = certain === code ? "include" : possible.has(code) ? "review" : "below"
      if (forceReview || uncertainBelow && status === "below") status = "review"
      set(code, status, reason + " The highest applicable category is selected." + (reviewReason ? " " + reviewReason : ""), pool, { derived: !allCodes.includes(code), assumptions })
    }
  }

  function groups(pool) {
    const result = new Map()
    for (const material of pool) {
      const key = chemicalKey(material)
      if (!result.has(key)) result.set(key, [])
      result.get(key).push(material)
    }
    return [...result.values()]
  }

  // Sensitisers and CMR thresholds apply to each chemical, not to the sum
  // of unrelated chemicals. The same chemical in separate stocks is combined.
  function individual(code, limits, explanation, relatedCodes = [code]) {
    const pool = classified(relatedCodes)
    if (!pool.length) return
    const perChemical = groups(pool)
    const meets = bound => perChemical.some(group => {
      const limit = Math.min(...group.map(material => {
        const explicitLimits = relatedCodes.filter(related => has(material, related)).map(related => specificLimit(material, related)).filter(value => value != null)
        const explicit = explicitLimits.length ? Math.min(...explicitLimits) : null
        if (explicit != null) return explicit
        const [low, high] = limits(material)
        return bound === "min" ? high : low
      }))
      return atLeast(sum(group, bound), limit)
    })
    let status = meets("min") ? "include" : meets("max") ? "review" : "below"
    if (status === "below" && pool.some(material => !String(chemicalKey(material)).startsWith("cas:"))) {
      status = "review"
      explanation += " A stock without a single chemical CAS may conceal overlapping components; exclusion needs its composition."
    }
    set(code, status, explanation, pool)
  }

  for (const code of ["H317", "H334"]) individual(code, material => {
    const cat = savedCategory(material, code)
    return cat === "1A" ? [0.1, 0.1] : ["1", "1B"].includes(cat) ? [1, 1] : [0.1, 1]
  }, "AU liquid-mixture sensitiser limit: 0.1% per chemical for category 1A, or 1% for category 1/1B. A saved specific limit overrides the generic limit; unrelated sensitisers are not summed.")

  const fixed = { H340: 0.1, H341: 1, H350: 0.1, H350i: 0.1, H351: 1, H362: 0.3 }
  for (const code of allCodes) {
    const limit = fixed[code] ?? (/^H360/.test(code) ? 0.3 : /^H361/.test(code) ? 3 : null)
    if (limit != null) individual(code, () => [limit, limit], `AU generic limit: ${limit}% per chemical. A saved specific concentration limit takes priority.`, ["H350", "H350i"].includes(code) ? ["H350", "H350i"] : [code])
  }

  const reproductivePool = classified(allCodes.filter(code => /^H36[01]/.test(code)))
  for (const group of groups(reproductivePool)) {
    const variants = unique(group.flatMap(material => material.hazards.flatMap(hazard => atoms(hazard.code))).filter(code => /^H36[01]/.test(code)))
    if (variants.length > 1) for (const code of variants) set(code, "review", "The same chemical has multiple reproductive-toxicity code variants. Fertility and developmental effects must be assessed together.", reproductivePool)
  }
  for (const [higher, lower] of [[["H340"], "H341"], [["H350", "H350i"], "H351"]]) {
    if (higher.some(code => assessments.get(code)?.status === "include") && assessments.has(lower)) {
      assessments.set(lower, { ...assessments.get(lower), status: "below", reason: "Superseded by the category 1 classification for the same hazard class." })
    }
  }

  const corrosives = classified(["H314"])
  const skinIrritants = classified(["H315"]).filter(material => !has(material, "H314"))
  const additivePool = classified(["H314", "H315", "H318", "H319"])
  const additiveReview = additivePool.some(material => material.record.ghsAdditivity === false ||
    ["H314", "H315", "H318", "H319"].some(code => specificLimit(material, code) != null))
  const skinReason = "Additive skin criteria: Σ corrosion category 1 ≥5%, otherwise 10×Σ corrosion category 1 + Σ irritation category 2 ≥10%."
  family(["H314", "H315"], [
    { code: "H314", test: bound => atLeast(sum(corrosives, bound), 5) },
    { code: "H315", test: bound => atLeast(10 * sum(corrosives, bound) + sum(skinIrritants, bound), 10) }
  ], skinReason, { forceReview: additiveReview, reviewReason: additiveReview ? "Specific limits or non-additive behaviour require assessment." : "" })

  const eyeDamagers = classified(["H314", "H318"])
  const eyeIrritants = classified(["H319"]).filter(material => !has(material, "H314") && !has(material, "H318"))
  const unknownEyeCategory = classified(["H320"]).length > 0
  family(["H314", "H318", "H319"], [
    { code: "H318", test: bound => atLeast(sum(eyeDamagers, bound), 3) },
    { code: "H319", test: bound => atLeast(10 * sum(eyeDamagers, bound) + sum(eyeIrritants, bound), 10) }
  ], "Additive eye criteria: Σ skin corrosion/eye damage category 1 ≥3%, otherwise 10×Σ category 1 + Σ eye irritation category 2 ≥10%. Each stock is counted once.",
  { forceReview: additiveReview || unknownEyeCategory, ignoredCodes: ["H314"], reviewReason: additiveReview ? "Specific limits or non-additive behaviour require assessment." : unknownEyeCategory ? "Category 2B eye-irritant contributions require assessment." : "" })

  for (const [route, inputCodes, converted, cutoffs] of [
    ["oral", ["H300", "H301", "H302", "H303"], [0.5, 5, 100, 500, 2500], [5, 50, 300, 2000]],
    ["dermal", ["H310", "H311", "H312", "H313"], [5, 50, 300, 1100, 2500], [50, 200, 1000, 2000]]
  ]) {
    const pool = classified(inputCodes)
    if (!pool.length) continue
    function toxicityLoad(bound) {
      return pool.reduce((total, material) => {
        const explicit = material.record.ghsAcuteToxicity?.[route]
        const ate = asNumber(explicit && typeof explicit === "object" ? explicit.ate : explicit)
        const values = material.hazards.flatMap(hazard => atoms(hazard.code).flatMap(code => {
          const index = inputCodes.indexOf(code)
          if (index < 0) return []
          const cat = Number(category(hazard.category))
          return index === 0 ? [cat === 1 || cat === 2 ? converted[cat - 1] : bound === "min" ? converted[1] : converted[0]] : [converted[index + 1]]
        }))
        const point = ate != null && ate > 0 ? ate : Math.min(...values)
        return total + pct(material, bound) / point
      }, 0)
    }
    // Category 5 contributes using its measured ATE or the 2500 mg/kg
    // conversion value. Its code is omitted from the mandatory AU screen;
    // its presence does not, by itself, make the calculation uncertain.
    family(inputCodes, cutoffs.map((limit, index) => ({
      code: inputCodes[Math.max(0, index - 1)],
      test: bound => atLeast(toxicityLoad(bound), 100 / limit)
    })), `Acute toxicity (${route}): ATEmix = 100 / Σ(Ci/ATEi). Uses saved ATE values, otherwise GHS category point estimates; category 4 ends at 2000 mg/kg.`,
    {reviewReason: "Oral/dermal category 5 contributions use a saved ATE or the 2500 mg/kg GHS conversion value; the non-mandatory category 5 codes are not displayed."})
  }

  // STOT categories 1/2 are assessed per chemical; potential combined effects
  // remain Review when target-organ information is insufficient.
  for (const [highCode, lowerCode] of [["H370", "H371"], ["H372", "H373"]]) {
    const pool = classified([highCode, lowerCode])
    const perChemical = groups(pool)
    const highGroups = perChemical.map(group => group.filter(material => has(material, highCode)))
    const lowGroups = perChemical.map(group => group.filter(material => has(material, lowerCode) && !has(material, highCode)))
    const specific = pool.some(material => specificLimit(material, highCode) != null || specificLimit(material, lowerCode) != null)
    const highMeets = (bound, limit) => bound === "max"
      ? atLeast(highGroups.reduce((total, group) => total + sum(group, bound), 0), limit)
      : highGroups.some(group => atLeast(sum(group, bound), limit))
    const lowMeets = bound => bound === "max"
      ? atLeast(lowGroups.reduce((total, group) => total + sum(group, bound), 0), 10)
      : lowGroups.some(group => atLeast(sum(group, bound), 10))
    family([highCode, lowerCode], [
      { code: highCode, test: bound => highMeets(bound, 10) },
      { code: lowerCode, test: bound => highMeets(bound, 1) || lowMeets(bound) }
    ], "AU STOT criteria per chemical: category 1 at ≥10%; a category 1 ingredient at 1–<10% gives category 2; category 2 ingredients trigger at ≥10%.",
    { forceReview: specific, reviewReason: specific ? "Specific limits need assessment." : perChemical.length > 1 ? "Possible shared-target-organ effects are included in the upper bound." : "" })
  }
  for (const code of ["H335", "H336"]) {
    const pool = classified([code])
    if (!pool.length) continue
    const explicit = pool.some(material => specificLimit(material, code) != null)
    family([code], [{code, test: bound => atLeast(sum(pool, bound), 20)}], "Generic STOT category 3 screen: total concentration ≥20%. Substance-specific evidence may require a different limit.", {forceReview: explicit})
  }

  for (const [inputCodes, factorName] of [
    [["H400", "H401", "H402"], "acute"],
    [["H410", "H411", "H412", "H413"], "chronic"]
  ]) {
    const pool = classified(inputCodes)
    if (!pool.length) continue
    const perCategory = inputCodes.map((code, index) => pool.filter(material => has(material, code) && !inputCodes.slice(0, index).some(higher => has(material, higher))))
    const factor = material => {
      const value = asNumber(material.record.ghsMFactors?.[factorName] ?? material.record.ghsMFactor)
      return value != null && value >= 1 ? value : null
    }
    const assumptions = perCategory[0].filter(material => factor(material) == null).map(material => ({
      kind: "m-factor", materialKey: material.key, name: material.name, factorName, value: 1
    }))
    function weightedFirst(bound) {
      return perCategory[0].reduce((total, material) => total + pct(material, bound) * (factor(material) ?? 1), 0)
    }
    const levels = [
      { code: inputCodes[0], test: bound => atLeast(weightedFirst(bound), 25) },
      { code: inputCodes[1], test: bound => atLeast(10 * weightedFirst(bound) + sum(perCategory[1], bound), 25) },
      { code: inputCodes[2], test: bound => atLeast(100 * weightedFirst(bound) + 10 * sum(perCategory[1], bound) + sum(perCategory[2], bound), 25) }
    ]
    if (factorName === "chronic") levels.push({code: "H413", test: bound => atLeast(sum(pool, bound), 25)})
    family(inputCodes, levels, `GHS aquatic ${factorName} summation: evaluate the most severe category first, including M-factors and 10×/100× carry-through to lower categories. Threshold: 25%. Environmental classes are outside mandatory AU WHS classification.`,
      {assumptions, reviewReason: assumptions.length
        ? `Screening fallback: M=1 assumed for missing ${factorName} M-factors (${assumptions.map(item => item.name).join(", ")}). A supplied factor overrides this assumption; the fallback is not a verified SDS classification.`
        : ""})
  }

  // Non-mandatory low-severity categories are omitted from this AU screen.
  // Aquatic chronic classes remain as an additional environmental screen.
  const omittedCodes = new Set(["H303", "H313", "H333", "H316", "H305", "H401", "H402"])
  for (const code of allCodes) if (!omittedCodes.has(code) && !assessments.has(code)) {
    const pool = classified([code])
    const reason = /^H2/.test(code) ? "Physical hazards require mixture properties or test data, such as flash point; ingredient percentages alone cannot confirm exclusion."
      : code === "H304" ? "Aspiration classification also depends on the mixture's viscosity and any separated layers; bulk concentration alone cannot confirm exclusion."
      : /^H33[012]/.test(code) ? "Inhalation assessment needs route/form-specific toxicity data for gases, vapours or mist."
      : "This code requires a separate mixture-specific assessment."
    set(code, "review", reason, pool)
  }

  // Only suppress irritation when the final mixture meets eye-damage criteria.
  // A trace of an H318 ingredient does not, by itself, supersede H319.
  if (assessments.get("H318")?.status === "include") assessments.delete("H319")
  // Hide an excluded umbrella reproductive code when a specific variant is
  // already shown. Keep generic codes that meet criteria or need review:
  // a fertility-only variant cannot replace a possible developmental hazard.
  for (const generic of ["H360", "H361"]) {
    if (assessments.get(generic)?.status === "below" && [...assessments.keys()].some(code =>
      code !== generic && code.startsWith(generic)
    )) assessments.delete(generic)
  }
  return [...assessments.values()].filter(row => !omittedCodes.has(row.code))
}
