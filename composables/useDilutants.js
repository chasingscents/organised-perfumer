import { computed, onMounted } from "vue"
import rawDilutants from "@/assets/data/dilutants.json"

const DILUTANTS_STORAGE_KEY = "ingredientOrganiser.dilutants.v1"
export const DEFAULT_DILUTANT_CODES = ["ETOH", "DPG", "IPM", "BB", "TEC"]

export function sanitizeDilutantCode(value) {
  return String(value ?? "").replace(/[^a-z0-9]/gi, "")
}

function text(value) {
  return String(value ?? "").trim()
}

function codeKey(value) {
  return text(value).toLowerCase()
}

function casValues(value) {
  return (Array.isArray(value) ? value : [value]).map(text).filter(Boolean)
}

function normaliseDilutants(entries) {
  const result = new Map()
  for (const entry of Array.isArray(entries) ? entries : []) {
    const supplied = sanitizeDilutantCode(entry?.code)
    const code = DEFAULT_DILUTANT_CODES.find(value => value.toLowerCase() === supplied.toLowerCase()) || supplied
    if (!code || codeKey(code) === "other") continue
    result.set(codeKey(code), {
      code,
      label: code,
      ingredientKey: text(entry.ingredientKey),
      ingredientCas: casValues(entry.ingredientCas)[0] || "",
      ingredientName: text(entry.ingredientName)
    })
  }
  return [...result.values()]
}

export function buildDilutantIngredientOptions(source) {
  const isArray = Array.isArray(source)
  const entries = isArray ? source.map((ingredient, index) => [String(index), ingredient]) : Object.entries(source || {})
  const seen = new Set()
  const values = new Set()
  const options = []
  for (const [lookupKey, ingredient] of entries) {
    if (!ingredient || typeof ingredient !== "object" || Array.isArray(ingredient) ||
      String(ingredient.type || ingredient.kind || "").toLowerCase() === "accord" ||
      casValues(ingredient.cas).includes("ACCORD")) continue
    const id = text(ingredient.id)
    const key = text(ingredient.key)
    const identity = id ? `id:${id}` : key ? `key:${key}` : ingredient
    if (seen.has(identity)) continue
    const value = isArray
      ? key || id || casValues(ingredient.cas)[0] || text(ingredient.name)
      : [key, id, lookupKey].find(candidate => {
          const mapped = candidate && source[candidate]
          return mapped && (mapped === ingredient ||
            (id && text(mapped.id) === id) || (!id && key && text(mapped.key) === key))
        })
    if (!value || values.has(value)) continue
    seen.add(identity)
    values.add(value)
    const cas = casValues(ingredient.cas).join("; ")
    const name = text(ingredient.name) || value
    options.push({ value, title: `${name}${cas ? " — " + cas : ""}`, raw: ingredient })
  }
  return options.sort((a, b) => a.title.localeCompare(b.title))
}

export function resolveMatchedDilutantIngredient(code, ingredientMap, entries) {
  const setting = (entries || []).find(entry => codeKey(entry.code) === codeKey(code))
  if (!setting) return null
  const ingredients = Array.isArray(ingredientMap) ? ingredientMap : Object.values(ingredientMap || {})
  for (const value of [setting.ingredientKey, setting.ingredientCas, setting.ingredientName].map(text).filter(Boolean)) {
    if (!Array.isArray(ingredientMap) && ingredientMap?.[value]) return ingredientMap[value]
    const found = ingredients.find(ingredient =>
      [ingredient?.key, ingredient?.id, ingredient?.name, ...casValues(ingredient?.cas)]
        .some(alias => text(alias) && codeKey(alias) === codeKey(value))
    )
    if (found) return found
  }
  return null
}

export function matchedDilutantComposition(code, ingredientMap, entries) {
  const ingredient = resolveMatchedDilutantIngredient(code, ingredientMap, entries)
  if (!ingredient) return null
  const cas = casValues(ingredient.cas)
  const parsed = Number(ingredient.concentration ?? 100)
  const fraction = Math.max(0, Math.min(1, (Number.isFinite(parsed) ? parsed : 100) / 100))
  const solvent = text(ingredient.solvent).toUpperCase()
  return {
    ethanol: cas.includes("64-17-5") ? 1 : ["ETOH", "ETHANOL", "ALCOHOL DENAT", "ALCOHOL DENAT."].includes(solvent) ? 1 - fraction : 0,
    water: cas.includes("7732-18-5") ? 1 : ["AQUA", "WATER", "H2O"].includes(solvent) ? 1 - fraction : 0
  }
}

export function useDilutants() {
  // Nuxt state is shared between consumers and isolated for each SSR request.
  const dilutants = useState("ingredientOrganiser.dilutants", () => {
    const initial = normaliseDilutants(rawDilutants)
    return initial.length ? initial : normaliseDilutants(DEFAULT_DILUTANT_CODES.map(code => ({ code })))
  })
  const hydrated = useState("ingredientOrganiser.dilutants.hydrated", () => false)

  function hydrateDilutants() {
    if (typeof window === "undefined" || hydrated.value) return
    hydrated.value = true
    try {
      const cached = JSON.parse(window.localStorage.getItem(DILUTANTS_STORAGE_KEY) || "null")
      if (Array.isArray(cached)) dilutants.value = normaliseDilutants([...dilutants.value, ...cached])
    } catch {
      // Keep the catalogue defaults usable without browser storage.
    }
  }

  function persistDilutants() {
    if (typeof window === "undefined") return
    try {
      window.localStorage.setItem(DILUTANTS_STORAGE_KEY, JSON.stringify(dilutants.value))
    } catch {
      // Changes still remain available throughout the current app session.
    }
  }

  function upsertDilutant(value, mapping) {
    hydrateDilutants()
    const code = sanitizeDilutantCode(value)
    if (!code || codeKey(code) === "other") throw new Error("Enter a dilutant name using letters and numbers. Other is reserved.")
    const existing = dilutants.value.find(entry => codeKey(entry.code) === codeKey(code))
    const next = normaliseDilutants([{ ...existing, ...mapping, code: existing?.code || code }])[0]
    if (!existing) dilutants.value = [...dilutants.value, next]
    else if (JSON.stringify(existing) !== JSON.stringify(next)) {
      dilutants.value = dilutants.value.map(entry => entry === existing ? next : entry)
    } else return existing
    persistDilutants()
    return next
  }

  function replaceDilutants(entries) {
    hydrateDilutants()
    dilutants.value = normaliseDilutants(entries)
    persistDilutants()
  }

  onMounted(hydrateDilutants)
  const dilutantOptions = computed(() => [...dilutants.value.map(entry => entry.code), "Other"])
  return { dilutants, dilutantOptions, hydrateDilutants, upsertDilutant, replaceDilutants }
}
