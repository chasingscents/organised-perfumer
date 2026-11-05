function number(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function text(value) {
  return String(value ?? "").trim()
}

function normalise(value) {
  return text(value).toLowerCase()
}

function casValues(value) {
  return (Array.isArray(value) ? value : [value]).map(text).filter(Boolean)
}

function dilutionFraction(row) {
  if (row?.dilution == null || row.dilution === "") return 1
  return Math.max(0, Math.min(1, number(row.dilution, 100) / 100))
}

function pricePerGram(ingredient) {
  const price = number(ingredient?.price)
  const quantity = number(ingredient?.quantity)
  return quantity > 0 ? price / quantity : 0
}

/**
 * Shared costing for selected rows, recipe totals, and saved recipe snapshots.
 * Catalogue prices describe the supplied stock, including its existing solvent.
 * Only additional row dilutants are charged separately.
 */
export function createRecipeCostCalculator({ ingredientMap = {}, accordMap = {}, dilutants = [] } = {}) {
  const ingredients = [...new Set(Object.values(ingredientMap || {}))].filter(Boolean)
  const accords = [...new Set(Object.values(accordMap || {}))].filter(Boolean)
  const settings = Array.isArray(dilutants) ? dilutants : []

  function findIngredientByIdentity(value) {
    const key = text(value)
    if (!key) return null
    if (ingredientMap?.[key]) return ingredientMap[key]

    return ingredients.find(ingredient =>
      [ingredient.key, ingredient.id, ingredient.name, ...casValues(ingredient.cas)]
        .some(alias => normalise(alias) === normalise(key))
    ) || null
  }

  function resolveIngredient(row) {
    if (!row) return null

    // A record's key/ID identifies its supplier and stock strength.
    for (const value of [row.key, row.id]) {
      const key = text(value)
      if (!key) continue
      if (ingredientMap?.[key]) return ingredientMap[key]
      const found = ingredients.find(ingredient =>
        [ingredient.key, ingredient.id].some(alias => text(alias) === key)
      )
      if (found) return found
    }

    const name = normalise(row.name)
    const cas = casValues(row.cas)
    const named = name ? ingredients.find(ingredient => normalise(ingredient.name) === name) : null
    if (named) return named

    for (const value of cas) {
      const found = findIngredientByIdentity(value)
      if (found) return found
    }
    return null
  }

  function resolveAccord(row) {
    if (row?.accord && typeof row.accord === "object") return row.accord

    const identities = [row?.accordId, row?.key, row?.id, row?.name].map(text).filter(Boolean)
    for (const identity of identities) {
      if (accordMap?.[identity]) return accordMap[identity]
    }
    return accords.find(accord =>
      [accord.id, accord.key, accord.name].some(alias => identities.includes(text(alias)))
    ) || null
  }

  function isAccordRow(row) {
    return normalise(row?.kind) === "accord" || normalise(row?.type) === "accord" ||
      casValues(row?.cas).some(value => value.toUpperCase() === "ACCORD") ||
      !!row?.accordId || !!row?.accord
  }

  function dilutantCodeForRow(row) {
    return text(row?.dilutant === "Other" ? row.customDilutant : row?.dilutant)
  }

  function dilutantSettingForRow(row) {
    const code = normalise(dilutantCodeForRow(row))
    if (!code) return null
    return settings.find(setting => normalise(setting?.code) === code) ||
      (row?.dilutant === "Other" ? settings.find(setting => normalise(setting?.code) === "other") : null) ||
      null
  }

  function resolveDilutantIngredient(row) {
    const setting = dilutantSettingForRow(row)
    if (!setting) return null
    return findIngredientByIdentity(setting.ingredientKey) ||
      findIngredientByIdentity(setting.ingredientCas) ||
      findIngredientByIdentity(setting.ingredientName)
  }

  function accordPricePerGram(accord, visiting) {
    if (!accord) return 0
    const identity = text(accord.id || accord.key) || accord
    if (visiting.has(identity)) return 0

    const items = Array.isArray(accord.items) ? accord.items : []
    if (!items.length) return number(accord.costPerGram)

    // Recalculate from the current components rather than a stale saved cost.
    const grams = items.reduce((sum, item) => sum + Math.max(0, number(item?.gramsAdded)), 0)
    if (grams <= 0) return 0

    visiting.add(identity)
    try {
      return items.reduce((sum, item) => sum + rowCost(item, visiting), 0) / grams
    } finally {
      visiting.delete(identity)
    }
  }

  function rowCost(row, visiting = new Set()) {
    const grams = number(row?.gramsAdded)
    if (grams <= 0) return 0

    const stockGrams = grams * dilutionFraction(row)
    const dilutantGrams = Math.max(0, grams - stockGrams)
    const stockPrice = isAccordRow(row)
      ? accordPricePerGram(resolveAccord(row), visiting)
      : pricePerGram(resolveIngredient(row))

    return stockGrams * stockPrice + dilutantGrams * pricePerGram(resolveDilutantIngredient(row))
  }

  function totalCost(items) {
    return (Array.isArray(items) ? items : []).reduce((sum, row) => sum + rowCost(row), 0)
  }

  return { rowCost, totalCost, dilutantCodeForRow, dilutantSettingForRow, resolveDilutantIngredient }
}
