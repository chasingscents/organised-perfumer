const text = value => String(value ?? "").trim()
const name = value => text(value).toLowerCase()
const casList = value => (Array.isArray(value) ? value : [value]).map(text).filter(Boolean)

function isAccord(record) {
  return [record?.kind, record?.type].some(value => name(value) === "accord") ||
    casList(record?.cas).some(value => name(value) === "accord") || !!record?.accordId || !!record?.accord
}

function sameStock(left, right) {
  if (left === right) return true
  if (!left || !right) return false
  if (text(left.id) && text(right.id)) return text(left.id) === text(right.id)
  return !!text(left.key) && text(left.key) === text(right.key)
}

/** Resolve catalogue stocks without mistaking an accord row's ordinal ID for an ingredient ID. */
export function resolveIngredientReference(row, ingredientMap = {}) {
  if (!row || isAccord(row)) return null
  const seen = new Set()
  const stocks = Object.values(ingredientMap).filter(stock => {
    if (!stock || typeof stock !== "object" || isAccord(stock)) return false
    const identity = text(stock.id) ? `id:${text(stock.id)}` : text(stock.key) ? `key:${text(stock.key)}` : stock
    if (seen.has(identity)) return false
    seen.add(identity)
    return true
  })
  const declaredCas = casList(row.cas)
  const unknownCas = declaredCas.some(value => name(value) === "unknown")
  const cas = declaredCas.filter(value => name(value) !== "unknown")
  const rowName = name(row.name)
  const matchesCas = stock => casList(stock.cas).some(value => cas.includes(value))
  const matchesDescription = stock => !unknownCas &&
    (!cas.length || matchesCas(stock)) && (!rowName || name(stock.name) === rowName)

  // Explicit keys are stable pointers, even if the catalogue name has changed.
  // CAS lookup aliases are not unique stock pointers.
  const key = text(row.key)
  if (key && !cas.includes(key)) {
    const exact = stocks.filter(stock => [stock.key, stock.id].some(value => text(value) === key))
    if (exact.length === 1) return exact[0]
    if (!exact.length && ingredientMap[key] && !isAccord(ingredientMap[key])) return ingredientMap[key]
  }

  // Recipe items commonly use 1, 2, 3... for row IDs. Check chemical identity
  // before using that field as a legacy catalogue pointer.
  const id = text(row.id)
  if (id && !cas.includes(id)) {
    const exact = stocks.filter(stock => [stock.key, stock.id].some(value => text(value) === id) && matchesDescription(stock))
    if (exact.length === 1) return exact[0]
  }

  // A user-generated, unmatched carrier must stay unmatched, even if its name
  // happens to equal a catalogue ingredient.
  if (unknownCas) return null
  let candidates = cas.length ? stocks.filter(matchesCas) : rowName ? stocks.filter(stock => name(stock.name) === rowName) : []
  if (rowName && cas.length) {
    const named = candidates.filter(stock => name(stock.name) === rowName)
    if (named.length) candidates = named
  }
  return candidates.length === 1 ? candidates[0] : null
}

export function ingredientReferenceKey(stock, ingredientMap = {}) {
  if (!stock) return null
  for (const key of [stock.key, stock.id].map(text).filter(Boolean)) {
    if (sameStock(ingredientMap[key], stock)) return key
  }
  return Object.keys(ingredientMap).find(key => sameStock(ingredientMap[key], stock) && !casList(stock.cas).includes(key)) ?? null
}

/** Repair stale pointers without changing recipe amounts or mutating imported data. */
export function repairIngredientReferences(rows, ingredientMap = {}) {
  if (!Array.isArray(rows)) return rows
  let changed = false
  const repaired = rows.map(row => {
    const stock = resolveIngredientReference(row, ingredientMap)
    const key = ingredientReferenceKey(stock, ingredientMap)
    if (key == null || text(row?.key) === key) return row
    changed = true
    return { ...row, key }
  })
  return changed ? repaired : rows
}
