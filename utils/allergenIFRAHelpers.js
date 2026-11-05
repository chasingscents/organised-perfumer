// utils/allergenIFRAHelpers.js
import { num, dilutionFrac } from "@/utils/accordHelpers"

/**
 * Build *effective-grams* allergenList + ifraList for a saved accord.
 *
 * IMPORTANT:
 * - This function is designed to avoid recursion by using
 *   already-collated lists on nested accords.
 * - For ingredient.ifraList / ingredient.allergenList inside ingredients.json:
 *   entries are treated as {cas,name,concentration} where concentration is % of the ingredient.
 *
 * @param {Array} rows SelectedTable rows (the recipe rows you are saving)
 * @param {Object} ctx { ingredientMap, accordMap }
 * @returns {{ allergenList: Array, ifraList: Array, totalEtohPercent: number }}
 */
export function buildAccordIfraAndAllergenLists(rows, ctx = {}) {
  const ingredientMap = ctx.ingredientMap || {}
  const accordMap = ctx.accordMap || {}

  const totalGrams = Array.isArray(rows) ? rows.reduce((s, r) => s + num(r?.gramsAdded, 0), 0) : 0

  const allergenByCas = {} // cas -> { cas, name, grams }
  const ifraByCas = {} // cas -> { cas, name, grams }

  let etohGrams = 0

  function addToMap(map, cas, name, grams) {
    const c = String(cas || "").trim()
    const g = num(grams, 0)
    if (!c || g <= 0) return

    if (!map[c]) map[c] = { cas: c, name: String(name || c), grams: 0 }
    map[c].grams += g
  }

  function isEtohDilutantRow(row) {
    const d = String(row?.dilutant || "").toUpperCase()
    const c = String(row?.customDilutant || "").toUpperCase()
    return d === "ETOH" || c === "ETOH"
  }

  function isEtohIngredientCas(cas) {
    return String(cas || "").trim() === "64-17-5"
  }

  function resolveIngredient(row) {
    if (!row) return null

    // 1) key
    const k = String(row?.key ?? "").trim()
    if (k && ingredientMap[k]) return ingredientMap[k]

    // 2) id (some rows store id separately)
    const rid = row?.id != null ? String(row.id).trim() : ""
    if (rid && ingredientMap[rid]) return ingredientMap[rid]

    // 3) CAS direct map (if you added cas keys into ingredientMap)
    const casKey = String(row?.cas ?? "").trim()
    if (casKey && ingredientMap[casKey]) return ingredientMap[casKey]

    // 4) scan by CAS
    if (casKey) {
      const vals = Object.values(ingredientMap || {})
      return vals.find(v => String(v?.cas ?? "").trim() === casKey) || null
    }

    return null
  }

  function resolveSolventIngredient(solventCode) {
    const code = String(solventCode || "").trim().toUpperCase()
    if (!code) return null

    // First: match by ingredientMap key if you store solvents as keys (e.g. "BB", "ETOH", "DPG")
    if (ingredientMap[code]) return ingredientMap[code]

    const vals = Object.values(ingredientMap || {})

    // Common shortcuts
    if (code === "BB") {
      // Benzyl Benzoate CAS
      return vals.find((v) => String(v?.cas || "").trim() === "120-51-4") || null
    }
    if (code === "ETOH") {
      // Ethanol CAS
      return vals.find((v) => String(v?.cas || "").trim() === "64-17-5") || null
    }

    return null
  }

  function resolveAccord(row) {
    const id = String(row?.accordId || "").trim()
    if (!id) return null
    return accordMap[id] || null
  }

  function getChildAccordEtohGrams(childAccord) {
    if (!childAccord) return 0

    const tg = num(childAccord.totalGrams, 0)
    const p = Number(childAccord.totalEtohPercent)

    // Preferred: saved totalEtohPercent
    if (Number.isFinite(p) && tg > 0) return tg * (p / 100)

    // Fallback: infer from saved ifraList using CAS 64-17-5
    const list = Array.isArray(childAccord.ifraList) ? childAccord.ifraList : []
    const it = list.find((x) => String(x?.cas || "").trim() === "64-17-5")
    if (it) return num(it.gramsAdded, 0) * dilutionFrac(it)

    return 0
  }

  /**
   * Expand ONE normal ingredient row (not an accord row) into:
   * - direct allergen/ifra grams using ingredient.allergenList / ingredient.ifraList
   * - otherwise fallback: treat ingredient itself as IFRA candidate (store by its CAS grams)
   */
  function addIngredientContribs(row, baseGrams) {
    if (baseGrams <= 0) return

    const ing = resolveIngredient(row)
    const rowCas = String(row?.cas || ing?.cas || "").trim()
    const rowName = String(row?.name || ing?.name || rowCas || "Ingredient")

    // Split by ingredient concentration + intrinsic solvent (e.g. 50% in BB)
    const conc = num(ing?.concentration ?? 100, 100)
    const concFrac = Math.max(0, Math.min(1, conc / 100))
    const neatGrams = baseGrams * concFrac
    const solventGrams = baseGrams - neatGrams
    const solventCode = String(ing?.solvent || "").trim()

    // Count ETOH if the ingredient itself is ethanol CAS
    if (isEtohIngredientCas(rowCas)) {
      etohGrams += neatGrams
    }

    // If ingredient has allergenList composition (treat as % concentrations)
    const aList = Array.isArray(ing?.allergenList) ? ing.allergenList : []
    if (aList.length) {
      for (const a of aList) {
        const cas = String(a?.cas || "").trim()
        const name = String(a?.name || cas)
        const pct = num(a?.concentration ?? a?.quantity, 0) // backward compat
        if (!cas || pct <= 0) continue
        addToMap(allergenByCas, cas, name, neatGrams * (pct / 100))
      }
    } else if (ing?.isAllergen) {
      // If the ingredient itself is flagged allergen
      addToMap(allergenByCas, rowCas, rowName, neatGrams)
    }

    // If ingredient has ifraList composition (treat as % concentrations)
    const iList = Array.isArray(ing?.ifraList) ? ing.ifraList : []
    if (iList.length) {
      for (const c of iList) {
        const cas = String(c?.cas || "").trim()
        const name = String(c?.name || cas)
        const pct = num(c?.concentration ?? c?.quantity, 0) // backward compat
        if (!cas || pct <= 0) continue
        addToMap(ifraByCas, cas, name, neatGrams * (pct / 100))
      }
    } else {
      // Fallback: treat the ingredient itself as an IFRA-relevant CAS contribution
      if (rowCas) addToMap(ifraByCas, rowCas, rowName, neatGrams)
    }

    // Intrinsic solvent contribution (if any)
    if (solventGrams > 0 && solventCode) {
      const solvIng = resolveSolventIngredient(solventCode)

      // Count intrinsic ETOH grams if solvent is ethanol
      if (solvIng && isEtohIngredientCas(solvIng.cas)) {
        etohGrams += solventGrams
      }

      // Add solvent to allergen/IFRA totals (e.g. BB is an allergen)
      if (solvIng?.isAllergen) {
        addToMap(allergenByCas, solvIng.cas, solvIng.name, solventGrams)
      }
      const solvHasIfra =
        solvIng?.ifraMaxLimit != null || (Array.isArray(solvIng?.ifraList) && solvIng.ifraList.length)
      if (solvHasIfra) {
        addToMap(ifraByCas, solvIng.cas, solvIng.name, solventGrams)
      }
    }

    // If the user diluted this row in ETOH (dilutant), count the dilutant grams
    // total grams for the row is row.gramsAdded, baseGrams is grams of base material.
    if (isEtohDilutantRow(row)) {
      const rowTotal = num(row?.gramsAdded, 0)
      const dilutantGrams = rowTotal - baseGrams
      if (dilutantGrams > 0) etohGrams += dilutantGrams
    }
  }

  /**
   * Add contributions from a nested accord row (row.kind === 'accord' or cas === 'ACCORD')
   * using the child accord's *saved* allergenList/ifraList (no recursion).
   */
  function addNestedAccordContribs(row, outerBaseGrams) {
    const child = resolveAccord(row)
    if (!child) return

    const childTotal = num(child.totalGrams, 0)
    if (childTotal <= 0 || outerBaseGrams <= 0) return

    const scale = outerBaseGrams / childTotal

    // Scale saved allergenList grams
    const childAllergens = Array.isArray(child.allergenList) ? child.allergenList : []
    for (const it of childAllergens) {
      const cas = String(it?.cas || "").trim()
      if (!cas) continue
      addToMap(allergenByCas, cas, it?.name, num(it?.gramsAdded, 0) * dilutionFrac(it) * scale)
    }

    // Scale saved ifraList grams
    const childIfras = Array.isArray(child.ifraList) ? child.ifraList : []
    for (const it of childIfras) {
      const cas = String(it?.cas || "").trim()
      if (!cas) continue
      addToMap(ifraByCas, cas, it?.name, num(it?.gramsAdded, 0) * dilutionFrac(it) * scale)
    }

    // Scale ETOH grams from child
    const childEtoh = getChildAccordEtohGrams(child)
    if (childEtoh > 0) etohGrams += childEtoh * scale
  }

  // ---------------- MAIN LOOP ----------------
  if (!Array.isArray(rows) || totalGrams <= 0) {
    return { allergenList: [], ifraList: [], totalEtohPercent: 0 }
  }

  for (const row of rows) {
    const rowTotal = num(row?.gramsAdded, 0)
    if (rowTotal <= 0) continue

    const outerBase = rowTotal * dilutionFrac(row)

    // Nested accord row?
    const isAccordRow =
      row?.kind === "accord" ||
      String(row?.cas || "").toUpperCase() === "ACCORD" ||
      !!row?.accordId

    if (isAccordRow) {
      addNestedAccordContribs(row, outerBase)
      continue
    }

    // Normal ingredient row
    addIngredientContribs(row, outerBase)
  }

  // ---------------- BUILD LIST OUTPUTS ----------------
  function toStoredList(mapObj, prefix) {
    return Object.values(mapObj)
      .filter((x) => num(x?.grams, 0) > 0)
      .sort((a, b) => num(b.grams, 0) - num(a.grams, 0))
      .map((x, i) => ({
        id: i + 1,
        key: `${prefix}::${x.cas}`,
        cas: x.cas,
        name: x.name,
        gramsAdded: Number(num(x.grams, 0).toFixed(8)),
        dilution: 100,
        dilutant: null,
        customDilutant: null
      }))
  }

  const allergenList = toStoredList(allergenByCas, "A")
  const ifraList = toStoredList(ifraByCas, "I")

  const totalEtohPercent = totalGrams > 0 ? (etohGrams / totalGrams) * 100 : 0

  return {
    allergenList,
    ifraList,
    totalEtohPercent: Number(totalEtohPercent.toFixed(6))
  }
}