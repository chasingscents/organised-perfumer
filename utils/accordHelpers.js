export function num(v, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

export function dilutionFrac(row) {
  const d = row?.dilution
  // null/undefined/"" => 100%
  if (d == null || d === "") return 1
  const n = Number(d)
  if (!Number.isFinite(n)) return 1
  return Math.max(0, Math.min(1, n / 100))
}

/**
 * Resolve an ingredient record from a row/item.
 * ingredientMap is keyed by unique ingredient key.
 */
export function resolveIngredient(ingredientMap, rowOrItem) {
  const k = rowOrItem?.key
  if (k && ingredientMap?.[k]) return ingredientMap[k]
  return null
}

/**
 * Resolve accord object from a row:
 * - row.accord (embedded) OR row.accordId -> accordMap
 */
function resolveAccord(row, accordMap) {
  if (row?.accord && typeof row.accord === "object") return row.accord
  if (row?.accordId && accordMap?.[row.accordId]) return accordMap[row.accordId]
  return null
}

/**
 * Expand a "selected row" into leaf ingredient contributions:
 * returns [{ key, cas, name, grams }]
 *
 * Handles:
 * - rows that are accords (row.cas === "ACCORD" OR row.kind === "accord")
 * - rows that are normal ingredients
 * - ingredient that is a MIXTURE with items[]
 *
 * This is SAVE-TIME recursion (one-time).
 */
export function expandRowToLeafIngredients(row, { ingredientMap, accordMap }) {
  const out = []

  const outerG = num(row?.gramsAdded, 0)
  if (outerG <= 0) return out

  const outerBase = outerG * dilutionFrac(row)
  if (outerBase <= 0) return out

  // 1) Row is an ACCORD reference
  const accord = resolveAccord(row, accordMap)
  if (accord && Array.isArray(accord.items)) {
    const items = accord.items
    const accordTotal =
      num(accord?.totalGrams, 0) > 0
        ? num(accord.totalGrams, 0)
        : items.reduce((s, it) => s + num(it?.gramsAdded, 0), 0)

    if (accordTotal <= 0) return out

    const scale = outerBase / accordTotal

    for (const inner of items) {
      const innerG = num(inner?.gramsAdded, 0)
      if (innerG <= 0) continue

      const innerBase = innerG * scale * dilutionFrac(inner)
      if (innerBase <= 0) continue

      const innerIng = inner?.key ? ingredientMap?.[inner.key] : null

      // recurse into ingredient (mixture) or treat as leaf
      out.push(
        ...expandIngredientToLeaf(innerIng, inner, innerBase, { ingredientMap, accordMap })
      )
    }
    return out
  }

  // 2) Normal ingredient row -> expand ingredient itself
  const ing = row?.key ? ingredientMap?.[row.key] : null
  out.push(...expandIngredientToLeaf(ing, row, outerBase, { ingredientMap, accordMap }))
  return out
}

function expandIngredientToLeaf(ing, rowFallback, baseGrams, { ingredientMap, accordMap }) {
  const out = []
  const g = num(baseGrams, 0)
  if (g <= 0) return out

  // If ingredient itself is a saved MIXTURE/ACCORD-like object with items[]
  // (you said some ingredients are MIXTURES and have items[])
  const items = Array.isArray(ing?.items) ? ing.items : []
  if (items.length) {
    const mixTotal =
      num(ing?.totalGrams, 0) > 0
        ? num(ing.totalGrams, 0)
        : items.reduce((s, it) => s + num(it?.gramsAdded, 0), 0)

    if (mixTotal > 0) {
      const scale = g / mixTotal
      for (const it of items) {
        const itG = num(it?.gramsAdded, 0)
        if (itG <= 0) continue

        const itBase = itG * scale * dilutionFrac(it)
        if (itBase <= 0) continue

        // An item inside a mixture can itself be an accord reference (cas:"ACCORD")
        const maybeAccordRow = it
        const accord = resolveAccord(maybeAccordRow, accordMap)
        if (accord) {
          out.push(...expandRowToLeafIngredients({ ...maybeAccordRow, gramsAdded: itG }, { ingredientMap, accordMap }))
          continue
        }

        const itIng = it?.key ? ingredientMap?.[it.key] : null
        out.push(...expandIngredientToLeaf(itIng, it, itBase, { ingredientMap, accordMap }))
      }
      return out
    }
  }

  // Otherwise leaf ingredient
  const cas = String(ing?.cas || rowFallback?.cas || "").trim()
  const name = String(ing?.name || rowFallback?.name || cas || "Unknown")
  const key = String(ing?.key || rowFallback?.key || `${cas}::${name}`)

  if (!cas) return out

  out.push({ key, cas, name, grams: g })
  return out
}

/**
 * Given leaf ingredient grams, compute IFRA CAS grams:
 * - If ingredient.ifraList exists: allocate grams by concentration %
 * - Else: attribute grams to ingredient.cas
 */
export function leafToIfraContribs(leaf, ingredient) {
  const out = []
  const g = num(leaf?.grams, 0)
  if (g <= 0) return out

  const list = Array.isArray(ingredient?.ifraList) ? ingredient.ifraList : []
  if (list.length) {
    for (const c of list) {
      const cas = String(c?.cas || "").trim()
      const pct = num(c?.concentration, 0)
      if (!cas || pct <= 0) continue
      out.push({
        cas,
        name: String(c?.name || cas),
        grams: g * (pct / 100)
      })
    }
    return out
  }

  const cas = String(ingredient?.cas || leaf?.cas || "").trim()
  if (cas) out.push({ cas, name: String(ingredient?.name || leaf?.name || cas), grams: g })
  return out
}

/**
 * Given leaf ingredient grams, compute Allergen CAS grams:
 * - If ingredient.allergenList exists: allocate grams by concentration %
 * - Else if ingredient.isAllergen: attribute to itself
 */
export function leafToAllergenContribs(leaf, ingredient) {
  const out = []
  const g = num(leaf?.grams, 0)
  if (g <= 0) return out

  const list = Array.isArray(ingredient?.allergenList) ? ingredient.allergenList : []
  if (list.length) {
    for (const a of list) {
      const cas = String(a?.cas || "").trim()
      const name = String(a?.name || cas)
      const pct = num(a?.concentration, 0)
      if (!cas || !name || pct <= 0) continue
      out.push({ cas, name, grams: g * (pct / 100) })
    }
    return out
  }

  if (ingredient?.isAllergen) {
    const cas = String(ingredient?.cas || leaf?.cas || "").trim()
    const name = String(ingredient?.name || leaf?.name || cas)
    if (cas) out.push({ cas, name, grams: g })
  }

  return out
}

/**
 * Core recursive expander:
 * returns CAS contributions in grams (already includes ALL dilutions + scaling)
 *
 * @param rowOrItem The current thing (selected row or nested accord item)
 * @param gramsIn The grams of THIS thing to allocate downwards (already scaled by parent)
 * @param ctx { ingredientMap, accordMap }
 * @param visited Set to prevent infinite loops when accords reference accords cyclically
 */
export function expandToCasContrib(rowOrItem, gramsIn, ctx, visited) {
  const out = []
  const grams = num(gramsIn, 0)
  if (grams <= 0) return out

  // Apply THIS row/item dilution (null => 100%)
  const baseGrams = grams * dilutionFrac(rowOrItem)
  if (baseGrams <= 0) return out

  // --------- 1) ACCORD handling (may be nested) ----------
  const accord = resolveAccord(ctx.accordMap, rowOrItem)
  if (accord && Array.isArray(accord.items)) {
    const accordId = String(accord.id || rowOrItem.accordId || "")
    if (accordId) {
      if (visited.has("accord:" + accordId)) return out
      visited.add("accord:" + accordId)
    }

    const items = accord.items
    const accordTotal =
      num(accord?.totalGrams, 0) > 0
        ? num(accord.totalGrams, 0)
        : items.reduce((s, it) => s + num(it?.gramsAdded, 0), 0)

    if (accordTotal > 0 && baseGrams > 0) {
      const scale = baseGrams / accordTotal

      for (const it of items) {
        const itG = num(it?.gramsAdded, 0)
        if (itG <= 0) continue

        const scaled = itG * scale

        // recurse: accord items can themselves be ACCORD or MIXTURE or ingredient with lists
        out.push(...expandToCasContrib(it, scaled, ctx, visited))
      }
    }
    return out
  }

  // --------- 2) Ingredient object expansion (ifraList/allergenList/mixture items) ----------
  const ing = resolveIngredient(ctx.ingredientMap, rowOrItem)
  const fallbackCas = String(rowOrItem?.cas || "").trim()

  // 2a) ifraList composition: allocate baseGrams by concentration%
  // NOTE: you said "quantity" inside ifraList/allergenList was a mistake -> use "concentration"
  const ifraList = Array.isArray(ing?.ifraList) ? ing.ifraList : []
  if (ifraList.length) {
    for (const c of ifraList) {
      const cas = String(c?.cas || "").trim()
      const pct = num(c?.concentration, 0)
      if (!cas || pct <= 0) continue
      out.push({ cas, grams: baseGrams * (pct / 100) })
    }
    return out
  }

  // 2b) allergenList composition: allocate baseGrams by concentration%
  // (AllergenSummary may want this; IFRASummary can ignore but harmless.)
  const allergenList = Array.isArray(ing?.allergenList) ? ing.allergenList : []
  if (allergenList.length) {
    for (const a of allergenList) {
      const cas = String(a?.cas || "").trim()
      const pct = num(a?.concentration, 0)
      if (!cas || pct <= 0) continue
      out.push({ cas, grams: baseGrams * (pct / 100) })
    }
    // IMPORTANT: don't return here if you also need the ingredient's own CAS counted.
    // For IFRA/allergen rollups, composition is usually intended to represent the ingredient,
    // so returning is correct. If you want BOTH, remove this return.
    return out
  }

  // 2c) MIXTURE ingredient (ingredient itself has items[])
  const mixItems = Array.isArray(ing?.items) ? ing.items : []
  if (mixItems.length) {
    const mixId = String(ing.id || ing.key || ing.cas || "")
    if (mixId) {
      if (visited.has("mix:" + mixId)) return out
      visited.add("mix:" + mixId)
    }

    const mixTotal =
      num(ing?.totalGrams, 0) > 0
        ? num(ing.totalGrams, 0)
        : mixItems.reduce((s, it) => s + num(it?.gramsAdded, 0), 0)

    if (mixTotal > 0) {
      const scale = baseGrams / mixTotal
      for (const it of mixItems) {
        const itG = num(it?.gramsAdded, 0)
        if (itG <= 0) continue
        out.push(...expandToCasContrib(it, itG * scale, ctx, visited))
      }
      return out
    }
  }

  // --------- 3) Fallback: attribute baseGrams to this thing's CAS ----------
  const cas = String(ing?.cas || fallbackCas || "").trim()
  if (cas) out.push({ cas, grams: baseGrams })
  return out
}
