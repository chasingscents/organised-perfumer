import rawGhs from "@/assets/data/ghs.json"
import { resolveIngredientReference } from "@/utils/ingredientReferences.js"
import { assessGhsMixture } from "@/utils/ghsMixtureRules.js"
import { resolveMatchedDilutantIngredient } from "@/composables/useDilutants.js"

const text = value => String(value ?? "").trim()
const list = value => Array.isArray(value) ? value : value == null || value === "" ? [] : [value]
const casValues = value => list(value).map(text).filter(Boolean)
const catalog = new Map((Array.isArray(rawGhs) ? rawGhs : []).map(entry => [text(entry.code), entry]))

export function normaliseGhsCodes(value) {
  return [...new Set(list(value).flatMap(entry => {
    const supplied = text(entry && typeof entry === "object" ? entry.code ?? entry.value : entry)
    // Preserve combined codes and case-sensitive suffixes such as H360FD/H360Fd.
    return supplied.split(/[,;\n]+/).map(code => code.trim()).filter(Boolean)
  }))]
}

export function ghsEntryForCode(code) {
  return catalog.get(text(code)) || null
}

export function categoriesForGhsCode(code) {
  const entry = ghsEntryForCode(code)
  return [...new Set([
    ...list(entry?.category),
    ...list(entry?.variants).map(variant => variant?.category)
  ].filter(value => value != null && text(value) !== ""))]
}

export function normaliseGhsCategories(value, codes) {
  const selected = normaliseGhsCodes(codes)
  const values = list(value)
  return selected.map((code, index) => {
    const record = values.find(entry => entry && typeof entry === "object" && text(entry.code) === code)
    const encoded = values.find(entry => typeof entry === "string" && entry.startsWith(code + "::"))
    const indexed = values[index]
    const inline = list(codes).find(entry => entry && typeof entry === "object" && text(entry.code ?? entry.value) === code)
    const options = categoriesForGhsCode(code)
    const category = record ? record.category : encoded ? encoded.slice(code.length + 2)
      : inline?.category ?? (indexed != null && typeof indexed !== "object" && !text(indexed).includes("::") ? indexed : null)
    return { code, category: category == null || text(category) === "" ? options.length === 1 ? options[0] : null : category }
  })
}

function positive(value) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : 0
}

function dilutionFraction(value) {
  if (value == null || text(value) === "") return 1
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number / 100)) : 1
}

function isAccord(record) {
  return text(record?.kind).toLowerCase() === "accord" || text(record?.type).toLowerCase() === "accord" ||
    casValues(record?.cas).some(cas => cas.toUpperCase() === "ACCORD") || !!text(record?.accordId) || !!record?.accord
}

function recordIdentity(record) {
  if (text(record?.id)) return `id:${text(record.id)}`
  if (text(record?.key)) return `key:${text(record.key)}`
  return record
}

function uniqueRecords(map) {
  const seen = new Set()
  return Object.values(map || {}).filter(record => {
    if (!record || typeof record !== "object") return false
    const identity = recordIdentity(record)
    if (seen.has(identity)) return false
    seen.add(identity)
    return true
  })
}

/** Keep overlapping assessments in App notes, with one visible row per group.
 * Classification results remain available separately in assessmentRows.
 */
export function consolidateGhsRows(rows = []) {
  const visible = new Map(rows.map(row => [row.code, row]))
  const statusText = status => ({ include: "meets evaluated criteria", review: "requires more data", below: "below evaluated criteria" }[status] || "requires more data")
  function combine(primary, others) {
    if (!others.length) return
    const related = new Map((primary.relatedAssessments || []).map(row => [row.code, row]))
    for (const row of others) {
      related.set(row.code, row)
      for (const previous of row.relatedAssessments || []) related.set(previous.code, previous)
      visible.delete(row.code)
    }
    related.delete(primary.code)
    const notes = [primary.appNotes]
    for (const row of related.values()) {
      const names = [...new Set((row.sources || []).map(source => source.name).filter(Boolean))]
      notes.push(`${row.code}${names.length ? " (" + names.join(", ") + ")" : ""}: ${statusText(row.status)}.` +
        (row.appNotes ? " " + row.appNotes : row.status === "review" && row.reason ? " " + row.reason : ""))
    }
    const assumptions = [...new Map([primary, ...related.values()].flatMap(row => row.assumptions || []).map(assumption =>
      [`${assumption.materialKey}:${assumption.factorName}`, assumption]
    )).values()]
    visible.set(primary.code, {
      ...primary,
      appNotes: [...new Set(notes.filter(Boolean))].join("\n"),
      assumptions,
      hasProvisionalSources: [primary, ...related.values()].some(row => row.hasProvisionalSources),
      relatedAssessments: [...related.values()]
    })
  }

  for (const genericCode of ["H360", "H361"]) {
    const generic = visible.get(genericCode)
    const variants = [...visible.values()].filter(row => row.code !== genericCode && row.code.startsWith(genericCode))
    if (!generic || !variants.length) continue
    // Retain broader wording while an unspecific endpoint applies or remains
    // unresolved. A fertility-only statement cannot cover developmental effects.
    if (generic.status !== "below") combine(generic, variants)
    else {
      const specific = variants.find(row => row.status === "include") || variants.find(row => row.status === "review") || variants[0]
      combine(specific, [generic])
    }
  }

  const chronic = ["H410", "H411", "H412", "H413"].map(code => visible.get(code)).filter(Boolean)
  if (chronic.length) {
    // Select the most severe non-excluded mixture category; ingredient H410
    // alone must not override a calculated, diluted-mixture H412 result.
    const selected = chronic.find(row => row.status !== "below") || chronic[0]
    const others = chronic.filter(row => row.code !== selected.code)
    const acute = visible.get("H400")
    // H410 covers H400 wording. Keep a separately applicable acute hazard when
    // a less severe chronic category is selected; excluded rows move to notes.
    if (acute && (selected.code === "H410" && selected.status !== "below" || acute.status === "below")) others.push(acute)
    combine(selected, others)
  }
  return [...visible.values()].sort((left, right) => left.code.localeCompare(right.code, undefined, { numeric: true }))
}

function supplierIssues(record) {
  const issues = list(record?.ghsDataIssues).map(text).filter(Boolean)
  if (!issues.length && text(record?.ghsClassificationStatus).toLowerCase() === "review") {
    issues.push("Supplier classification needs confirmation.")
  }
  return issues
}

/** Physical formula composition for SDS Section 3, independent of stock-SDS hazard basis.
 * SWA SDS Code of Practice, section 3.3: identify ingredients and their proportions;
 * check disclosure obligations separately, including exposure standards and impurities.
 * https://www.safeworkaustralia.gov.au/sites/default/files/2023-06/model_code_of_practice_preparation_safety_data_sheets_for_hazardous_chemicals.pdf
 */
export function buildSdsComposition({ items = [], ingredientMap = {}, accordMap = {}, dilutants = [] } = {}) {
  const totalGrams = items.reduce((total, row) => total + positive(row?.gramsAdded), 0)
  const components = new Map()
  const active = new Set()
  const accords = uniqueRecords(accordMap)
  function add(record, grams, note = "") {
    if (!(grams > 0)) return
    const cas = casValues(record?.cas)
    const name = text(record?.name) || "Unknown ingredient"
    const key = cas.length === 1 && /^\d{2,7}-\d{2}-\d$/.test(cas[0])
      ? `cas:${cas[0]}` : `${text(record?.key ?? record?.id)}::${name}::${cas.join(",")}`
    if (!components.has(key)) components.set(key, { key, name, cas: cas.join(", ") || "unknown", grams: 0, notes: new Set() })
    const component = components.get(key)
    component.grams += grams
    for (const value of [note, ...supplierIssues(record)]) if (value) component.notes.add(value)
  }
  function carrier(code, grams) {
    if (!(grams > 0)) return
    const matched = code && resolveMatchedDilutantIngredient(code, ingredientMap, dilutants)
    if (matched) visit(matched, grams)
    else add({ name: code || "Unspecified dilutant", cas: "unknown" }, grams, "Dilutant is not matched to an ingredient.")
  }
  function visit(record, grams) {
    if (!(grams > 0)) return
    const identity = recordIdentity(record)
    if (active.has(identity)) return add(record, grams, "Circular composition reference; constituent identities need confirmation.")
    active.add(identity)
    try {
      const raw = record?.concentration
      const concentration = raw == null || text(raw) === "" ? 100 : Number(raw)
      if (!Number.isFinite(concentration) || concentration < 0 || concentration > 100) {
        return add(record, grams, "Stock concentration is invalid; constituent amounts need confirmation.")
      }
      const fraction = concentration / 100
      const children = Array.isArray(record?.items) ? record.items : []
      const childTotal = children.reduce((total, row) => total + positive(row?.gramsAdded), 0)
      if (children.length && childTotal > 0) {
        for (const child of children) visitRow(child, grams * fraction * positive(child?.gramsAdded) / childTotal)
      } else {
        const stockNote = fraction < 1 && ["stock", "as-supplied"].includes(text(record?.ghsClassificationBasis).toLowerCase())
          ? "Neat amount calculated from stock concentration; the supplied-stock SDS does not establish the neat ingredient's classification." : ""
        add(record, grams * fraction, isAccord(record) ? "Accord composition unavailable; expand its ingredients before finalising Section 3." : stockNote)
      }
      if (fraction < 1) carrier(text(record?.solvent), grams * (1 - fraction))
    } finally {
      active.delete(identity)
    }
  }
  function visitRow(row, grams) {
    if (!(grams > 0)) return
    const fraction = dilutionFraction(row?.dilution)
    const code = text(text(row?.dilutant).toLowerCase() === "other" ? row?.customDilutant : row?.dilutant)
    carrier(code, grams * (1 - fraction))
    if (fraction <= 0) return
    let record = resolveIngredientReference(row, ingredientMap) || row
    if (isAccord(row)) {
      const identities = [row?.accordId, row?.key, row?.id, row?.name].map(text).filter(Boolean)
      record = row?.accord || identities.map(identity => accordMap[identity]).find(Boolean) ||
        accords.find(accord => [accord.id, accord.key, accord.name].some(value => identities.includes(text(value)))) || row
    }
    visit(record, grams * fraction)
  }
  for (const row of items) visitRow(row, positive(row?.gramsAdded))
  return [...components.values()].map(component => ({
    ...component, percent: totalGrams > 0 ? component.grams / totalGrams * 100 : 0,
    notes: [...component.notes].join(" ")
  })).sort((left, right) => right.percent - left.percent || left.name.localeCompare(right.name))
}

/**
 * Expand recipe masses before assessing generic mixture criteria.
 * Optional ghsClassificationBasis: "neat" applies stock concentration and
 * includes its solvent; "stock" uses the supplied stock classification once.
 * A diluted stock with no declared basis is evaluated as a concentration range
 * covering both interpretations, rather than being silently double-diluted.
 */
export function buildGhsSummary({ items = [], ingredientMap = {}, accordMap = {}, dilutants = [] } = {}) {
  const accords = uniqueRecords(accordMap)
  const materials = new Map()
  const missing = new Map()
  const active = new Set()
  const anonymousSourceIds = new WeakMap()
  let nextSourceId = 0
  const totalGrams = items.reduce((total, row) => total + positive(row?.gramsAdded), 0)
  const hasRecordedGhs = record => Array.isArray(record?.ghsClassification) || normaliseGhsCodes(record?.ghsClassification).length > 0

  function source(record) {
    let identity = recordIdentity(record)
    if (identity && typeof identity === "object") {
      if (!anonymousSourceIds.has(identity)) anonymousSourceIds.set(identity, `stock:${++nextSourceId}`)
      identity = anonymousSourceIds.get(identity)
    }
    return {
      key: identity,
      name: text(record?.name) || "Unknown ingredient",
      cas: casValues(record?.cas).join(", ") || "unknown"
    }
  }

  function addMissing(record, grams, reason) {
    if (grams <= 0) return
    const info = source(record)
    const key = `${text(record?.key ?? record?.id)}::${info.name}::${info.cas}::${reason}`
    const existing = missing.get(key)
    if (existing) existing.grams += grams
    else missing.set(key, { ...info, key, grams, reason })
  }

  function resolveStock(row) {
    return resolveIngredientReference(row, ingredientMap) || row
  }

  function resolveAccord(row) {
    if (row?.accord && typeof row.accord === "object") return row.accord
    for (const identity of [row?.accordId, row?.key, row?.id, row?.name].map(text).filter(Boolean)) {
      if (accordMap[identity]) return accordMap[identity]
      const candidates = accords.filter(accord => [accord.id, accord.key, accord.name].some(value => text(value) === identity))
      if (candidates.length === 1) return candidates[0]
    }
    return row
  }

  function recordHazards(record, minGrams, maxGrams) {
    const info = source(record)
    const existing = materials.get(info.key)
    if (existing) {
      existing.minGrams += minGrams
      existing.maxGrams += maxGrams
      return
    }
    const categories = normaliseGhsCategories(record.ghsCategory, record.ghsClassification)
    materials.set(info.key, {
      ...info, record, minGrams, maxGrams,
      hazards: normaliseGhsCodes(record.ghsClassification).map(code => ({
        code, category: categories.find(entry => entry.code === code)?.category ?? null
      }))
    })
  }

  function visitMaterial(record, minGrams, maxGrams = minGrams) {
    if (maxGrams <= 0) return
    const identity = recordIdentity(record)
    if (active.has(identity)) {
      addMissing(record, maxGrams, "Circular accord, mixture or solvent reference")
      return
    }
    active.add(identity)
    try {
      const raw = record?.concentration
      const concentration = raw == null || text(raw) === "" ? 100 : Number(raw)
      const validConcentration = Number.isFinite(concentration) && concentration >= 0 && concentration <= 100
      const fraction = validConcentration ? concentration / 100 : 0
      const declaredBasis = text(record?.ghsClassificationBasis ?? record?.ghsBasis).toLowerCase()
      const stockBasis = ["stock", "as-supplied"].includes(declaredBasis)
      const neatBasis = ["neat", "raw"].includes(declaredBasis)
      const hasGhs = hasRecordedGhs(record)
      const knownBasis = stockBasis || neatBasis || !hasGhs
      if (!validConcentration) addMissing(record, maxGrams, "Stock concentration is invalid")
      const baseMin = stockBasis ? minGrams : minGrams * fraction
      const baseMax = stockBasis || !knownBasis || !validConcentration ? maxGrams : maxGrams * fraction

      if (hasGhs) recordHazards(record, baseMin, baseMax)
      else {
        const children = Array.isArray(record?.items) ? record.items : []
        const componentGrams = children.reduce((total, child) => total + positive(child?.gramsAdded), 0)
        if (!children.length || componentGrams <= 0) {
          const pendingSource = list(record?.ghsSources).find(entry => entry?.status === "sds-required")
          addMissing(record, baseMax, isAccord(record) ? "Accord composition or amounts are unavailable"
            : pendingSource ? "Supplier SDS required" : "No GHS information recorded")
        } else {
          for (const child of children) {
            const ratio = positive(child?.gramsAdded) / componentGrams
            visitRow(child, baseMin * ratio, baseMax * ratio)
          }
        }
      }

      // A supplied-stock SDS already covers its solvent; do not add it twice.
      if (!stockBasis && fraction < 1) {
        const code = text(record?.solvent)
        const carrier = code && resolveMatchedDilutantIngredient(code, ingredientMap, dilutants)
        const carrierMin = knownBasis ? minGrams * (1 - fraction) : 0
        const carrierMax = maxGrams * (1 - fraction)
        if (carrier) visitMaterial(carrier, carrierMin, carrierMax)
        else addMissing({ name: code || "Unspecified stock solvent", cas: "unknown" }, carrierMax, "Stock solvent is not matched to an ingredient")
      }
    } finally {
      active.delete(identity)
    }
  }

  function visitRow(row, minGrams, maxGrams = minGrams) {
    if (maxGrams <= 0) return
    const fraction = dilutionFraction(row?.dilution)
    const carrierMax = maxGrams * (1 - fraction)
    if (carrierMax > 0) {
      const code = text(text(row?.dilutant).toLowerCase() === "other" ? row?.customDilutant : row?.dilutant)
      const carrier = code && resolveMatchedDilutantIngredient(code, ingredientMap, dilutants)
      if (carrier) visitMaterial(carrier, minGrams * (1 - fraction), carrierMax)
      else addMissing({ name: code || "Unspecified dilutant", cas: "unknown" }, carrierMax, "Dilutant is not matched to an ingredient")
    }
    if (fraction > 0) visitMaterial(isAccord(row) ? resolveAccord(row) : resolveStock(row), minGrams * fraction, maxGrams * fraction)
  }

  for (const row of items) visitRow(row, positive(row?.gramsAdded))
  const withPercent = entry => ({ ...entry, percent: totalGrams > 0 ? entry.grams / totalGrams * 100 : 0 })
  const materialList = [...materials.values()].map(material => ({
    ...material,
    minPercent: totalGrams > 0 ? material.minGrams / totalGrams * 100 : 0,
    maxPercent: totalGrams > 0 ? material.maxGrams / totalGrams * 100 : 0
  }))
  // Conflicting supplier classifications are provisional contributions, not
  // certain evidence. Keep physical composition and tooltip masses unchanged.
  const assessments = assessGhsMixture(materialList.map(material => supplierIssues(material.record).length
    ? { ...material, minPercent: 0 } : material), { incomplete: missing.size > 0 })
  const assessmentRows = assessments.map(assessment => {
    const pool = materialList.filter(material => assessment.sourceKeys.includes(material.key))
    const recorded = pool.flatMap(material => material.hazards).filter(hazard => hazard.code === assessment.code)
    const categories = assessment.derived ? categoriesForGhsCode(assessment.code) : recorded.map(hazard => hazard.category)
    const reason = assessment.reason + (pool.some(material => supplierIssues(material.record).length)
      ? " Supplier classification needs confirmation: " + [...new Set(pool.flatMap(material => supplierIssues(material.record)))].join(" ") : "")
    const appNotes = []
    if (assessment.derived) appNotes.push(/^H4/.test(assessment.code)
      ? "Calculated mixture category from ingredient concentrations using aquatic summation."
      : "Calculated mixture category from ingredient concentrations.")
    if (assessment.status === "review") appNotes.push(reason)
    if (assessment.assumptions?.length && !(assessment.status === "review" && reason.includes("M=1"))) {
      appNotes.push("Missing M-factor fallback: " + assessment.assumptions.map(assumption =>
        `${assumption.name} (${assumption.factorName}) M=${assumption.value}`
      ).join("; ") + " assumed.")
    }
    return {
      ...assessment,
      reason,
      appNotes: appNotes.join("\n"),
      hasProvisionalSources: pool.some(material => supplierIssues(material.record).length),
      statement: ghsEntryForCode(assessment.code)?.statement || "Statement not available in the GHS catalogue",
      categories: [...new Set(categories.filter(value => value != null && text(value) !== "").map(text))].sort(),
      sources: pool.map(material => ({
        key: material.key, name: material.name, cas: material.cas,
        grams: material.minGrams, maxGrams: material.maxGrams,
        percent: material.minPercent, maxPercent: material.maxPercent
      })).sort((a, b) => a.name.localeCompare(b.name)),
      hasConcentrationRange: pool.some(material => Math.abs(material.minPercent - material.maxPercent) > 1e-10)
    }
  }).sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
  return {
    totalGrams,
    section3: buildSdsComposition({ items, ingredientMap, accordMap, dilutants }),
    dataIssues: materialList.filter(material => supplierIssues(material.record).length).map(material => ({
      key: material.key, name: material.name, cas: material.cas, reasons: supplierIssues(material.record)
    })),
    assumptions: [...new Map(assessments.flatMap(row => row.assumptions || []).map(assumption =>
      [`${assumption.materialKey}:${assumption.factorName}`, assumption]
    )).values()],
    rows: consolidateGhsRows(assessmentRows),
    assessmentRows,
    missing: [...missing.values()].map(withPercent)
  }
}
