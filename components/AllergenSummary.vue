<!-- components/AllergenSummary.vue -->
<template>
  <v-card class="pa-3">
    <div class="d-flex align-center justify-space-between mb-2">
      <div class="d-flex align-center ga-1">
        <h2 class="text-h6">Allergen Summary</h2>
        <v-btn
          v-if="hydrated"
          icon="mdi-content-copy"
          variant="text"
          size="x-small"
          title="Copy allergen names"
          aria-label="Copy allergen names"
          :disabled="copyableAllergenText.length === 0"
          @click="copyAllergensToClipboard"
        />
        <span v-else class="allergen-copy-placeholder" aria-hidden="true" />
        <span v-if="copyStatus" class="text-caption text-grey">{{ copyStatus }}</span>
      </div>
    </div>

    <div class="summary-scroll" :class="{ 'has-exceeded': hasExceeded }">
      <v-table density="compact">
      <thead>
        <tr>
          <th class="text-left">Ingredient</th>
          <th class="text-right">Conc.</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="r.key" :class="{ 'allergen-below-threshold': isBelowDeclarationThreshold(r) }">
          <td>
            <div class="d-flex flex-column">
              <div class="d-flex align-center ga-1">
                <div class="font-weight-medium">{{ r.name }}</div>
                <ClientOnly>
                  <v-tooltip location="top" max-width="420">
                    <template #activator="{ props: tipProps }">
                      <v-icon
                        v-bind="tipProps"
                        size="16"
                        class="text-grey-darken-1 source-info"
                        tabindex="0"
                        :aria-label="'Sources for ' + r.name"
                      >mdi-information-outline</v-icon>
                    </template>
                    <div class="source-tooltip">
                      <table v-if="r.sources?.length" class="source-table">
                        <thead>
                          <tr>
                            <th scope="col">Name</th>
                            <th scope="col" class="source-cas">CAS</th>
                            <th scope="col" class="source-percent">%</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="source in r.sources" :key="source.key">
                            <td>{{ source.name }}</td>
                            <td class="source-cas">{{ source.cas || "-" }}</td>
                            <td class="source-percent">{{ source.percent }}</td>
                          </tr>
                        </tbody>
                      </table>
                      <div v-else>Source unavailable</div>
                    </div>
                  </v-tooltip>
                  <template #fallback>
                    <v-icon size="16" class="text-grey-darken-1 source-info" :title="sourceTitle(r)">mdi-information-outline</v-icon>
                  </template>
                </ClientOnly>
              </div>
              <div class="text-caption text-grey">CAS: {{ r.cas || "-" }}</div>
            </div>
          </td>
          <td class="text-right" :title="percentHoverTitle(r)">{{ r.percent }}%</td>
        </tr>

        <tr v-if="rows.length === 0">
          <td colspan="2" class="text-center text-grey py-3">No allergens</td>
        </tr>
      </tbody>
    </v-table>
    </div>

    <div v-if="hasDeclarationAllergens" class="mt-2 text-caption font-weight-medium text-error">
      Allergens over 0.001% must be declared.
    </div>
  </v-card>
</template>

<script setup>
import { computed, onMounted, ref } from "vue"
import { num, dilutionFrac } from "@/utils/accordHelpers"
import { matchedDilutantComposition, resolveMatchedDilutantIngredient, useDilutants } from "@/composables/useDilutants.js"
import rawAllergens from "@/assets/data/allergens.json"
import rawIfra51 from "@/assets/data/ifra51.json"

// Allergen summary has no exceed/limit concept, keep false to avoid template warnings.
const hasExceeded = computed(() => false)

const props = defineProps({
  items: { type: Array, required: true },

  // ingredientMap keyed by ingredient "key"
  ingredientMap: { type: Object, default: () => ({}) },

  // accordMap keyed by accord.id
  accordMap: { type: Object, default: () => ({}) }
})

const { dilutants } = useDilutants()
const hydrated = ref(false)
onMounted(() => { hydrated.value = true })


function casArray(v) {
  if (Array.isArray(v)) {
    return v.map(x => String(x || "").trim()).filter(Boolean)
  }
  const s = String(v || "").trim()
  return s ? [s] : []
}

function primaryCas(v) {
  return casArray(v)[0] || ""
}

function casIncludes(v, cas) {
  const target = String(cas || "").trim()
  if (!target) return false
  return casArray(v).includes(target)
}

function normName(v) {
  return String(v || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
}

function uniqueCasList(values) {
  const out = []
  for (const v of values || []) {
    for (const cas of casArray(v)) {
      if (cas && !out.includes(cas)) out.push(cas)
    }
  }
  return out
}

function hasCasArray(v) {
  return Array.isArray(v?.cas)
}

// Canonical allergen lookup that supports both old and new allergens.json shapes:
// old: { name, cas: "106-22-9" }
// new: { name, inci, cas: ["106-22-9", "..."] }
// New array entries are prioritised, and old single-CAS entries are merged into them by INCI/name or CAS overlap.
const canonicalAllergens = computed(() => {
  const source = Array.isArray(rawAllergens) ? rawAllergens : []
  const groups = []

  function findGroup(entry) {
    const entryCas = casArray(entry?.cas)
    const entryNames = [entry?.inci, entry?.name].map(normName).filter(Boolean)

    return groups.find(g => {
      if (entryCas.some(c => g.casList.includes(c))) return true
      if (entryNames.some(n => g.nameKeys.includes(n))) return true
      return false
    }) || null
  }

  for (const entry of source) {
    if (!entry) continue
    const entryCas = casArray(entry.cas)
    const entryInci = String(entry.inci || "").trim()
    const entryName = String(entry.name || entryInci || primaryCas(entry.cas)).trim()
    if (!entryCas.length && !entryName) continue

    let group = findGroup(entry)
    if (!group) {
      group = {
        casList: [],
        name: entryName,
        inci: entryInci || entryName,
        nameKeys: [],
        hasArrayEntry: false
      }
      groups.push(group)
    }

    group.casList = uniqueCasList([group.casList, entryCas])

    for (const n of [entryInci, entryName]) {
      const key = normName(n)
      if (key && !group.nameKeys.includes(key)) group.nameKeys.push(key)
    }

    // Prefer newer array-form entries because they contain full CAS variants and usually INCI.
    if (hasCasArray(entry) && (!group.hasArrayEntry || entryInci)) {
      group.name = entryName || group.name
      group.inci = entryInci || entryName || group.inci
      group.hasArrayEntry = true
    } else if (!group.hasArrayEntry) {
      group.name = group.name || entryName
      group.inci = group.inci || entryInci || entryName
    }
  }

  const byCas = {}
  const byName = {}
  for (const g of groups) {
    const canonical = {
      casList: g.casList,
      primaryCas: g.casList[0] || "",
      name: g.name || g.inci || g.casList[0] || "",
      inci: g.inci || g.name || g.casList[0] || ""
    }

    for (const cas of g.casList) byCas[cas] = canonical
    for (const nameKey of g.nameKeys) byName[nameKey] = canonical
  }

  return { byCas, byName }
})

function canonicalAllergenFor(cas, name) {
  const lookups = canonicalAllergens.value || { byCas: {}, byName: {} }

  for (const c of casArray(cas)) {
    if (lookups.byCas[c]) return lookups.byCas[c]
  }

  const byName = lookups.byName[normName(name)]
  return byName || null
}

function ingredientInciCopyName(ingredient, fallback = "") {
  return String(
    ingredient?.inci ||
    ingredient?.inciName ||
    ingredient?.INCI ||
    fallback ||
    ""
  ).trim()
}

function sourceForRow(row, record, parentSource = null) {
  const name = String(record?.name || row?.name || primaryCas(record?.cas || row?.cas) || "Unknown ingredient").trim()
  const recordCas = casArray(record?.cas)
  const cas = (recordCas.length ? recordCas : casArray(row?.cas))
    .filter(value => !["ACCORD", "MIXTURE", "GROUP"].includes(value.toUpperCase()))
    .join("; ")
  const identity = String(record?.key ?? record?.id ?? row?.key ?? row?.id ?? "")
  return {
    key: JSON.stringify([parentSource?.key || "", identity, name, cas]),
    name: parentSource ? `${parentSource.name} → ${name}` : name,
    cas
  }
}

function sourceWithDetail(source, detail) {
  return {
    ...source,
    key: JSON.stringify([source.key, detail]),
    name: `${source.name} (${detail})`
  }
}

function mergeSourceContributions(...lists) {
  const byKey = new Map()
  for (const source of lists.flat()) {
    const grams = num(source?.grams, 0)
    if (!source || grams <= 0) continue
    const key = source.key || JSON.stringify([source.name, source.cas])
    if (byKey.has(key)) byKey.get(key).grams += grams
    else byKey.set(key, { ...source, key, grams })
  }
  return [...byKey.values()].sort((a, b) => b.grams - a.grams)
}

function contributionsFromSource(source, grams) {
  if (Array.isArray(source)) return mergeSourceContributions(source)
  return source && num(grams, 0) > 0 ? [{ ...source, grams: num(grams, 0) }] : []
}

function scaleSourceContributions(sources, scale) {
  return (sources || []).map(source => ({ ...source, grams: source.grams * scale }))
}

function displaySourceContributions(sources, totalMixtureGrams) {
  return mergeSourceContributions(sources).map(source => {
    const rawPercent = totalMixtureGrams > 0 ? source.grams / totalMixtureGrams * 100 : 0
    const roundedPercent = Number(rawPercent.toFixed(5))
    const percent = rawPercent > 0 && roundedPercent === 0
      ? Number(rawPercent.toPrecision(3))
      : roundedPercent
    return { ...source, rawPercent, percent: `${percent}%` }
  })
}

function sourceTitle(row) {
  const sources = Array.isArray(row?.sources) ? row.sources : []
  return ["Name | CAS | %", ...sources.map(source => `${source.name} | ${source.cas || "-"} | ${source.percent}`)].join("\n")
}

function getAccordFromRow(row) {
  if (row?.accord && typeof row.accord === "object") return row.accord

  const candidates = [row?.accordId, row?.key, row?.id, row?.name]
    .map(v => String(v ?? "").trim())
    .filter(Boolean)

  for (const key of candidates) {
    if (props.accordMap?.[key]) return props.accordMap[key]
  }

  const accords = Object.values(props.accordMap || {})
  return accords.find((a) => {
    const aliases = [a?.id, a?.key, a?.name]
      .map(v => String(v ?? "").trim())
      .filter(Boolean)
    return candidates.some(c => aliases.includes(c))
  }) || null
}

function getIngredientFromRow(row) {
  if (!row) return null

  // 1) key
  const k = String(row?.key ?? "").trim()
  if (k && props.ingredientMap?.[k]) return props.ingredientMap[k]

  // 2) id
  const rid = row?.id != null ? String(row.id).trim() : ""
  if (rid && props.ingredientMap?.[rid]) return props.ingredientMap[rid]

  // 3) cas direct map, including array CAS values
  const casKeys = casArray(row?.cas)
  for (const casKey of casKeys) {
    if (casKey && props.ingredientMap?.[casKey]) return props.ingredientMap[casKey]
  }

  // 4) scan by CAS, including array CAS values
  if (casKeys.length) {
    const vals = Object.values(props.ingredientMap || {})
    return vals.find(v => casKeys.some(c => casIncludes(v?.cas, c))) || null
  }

  return null
}

function resolveSolventIngredient(solventCode) {
  const configured = dilutants.value.some(entry => entry.code.toLowerCase() === String(solventCode || "").trim().toLowerCase())
  if (configured) return resolveMatchedDilutantIngredient(solventCode, props.ingredientMap, dilutants.value)
  const raw = String(solventCode || "").trim()
  if (!raw) return null

  const norm = (s) => String(s || "").trim().toUpperCase()
  const code = norm(raw)

  const vals = Object.values(props.ingredientMap || {})

  // Build alias candidates (case-insensitive)
  let aliases = [code]

  if (code === "BB" || code === "BENZYL BENZOATE") {
    aliases = ["BB", "BENZYL BENZOATE"]
  } else if (code === "DPG" || code === "DIPROPYLENE GLYCOL") {
    aliases = ["DPG", "DIPROPYLENE GLYCOL"]
  } else if (code === "IPM" || code === "ISOPROPYL MYRISTATE") {
    aliases = ["IPM", "ISOPROPYL MYRISTATE"]
  } else if (code === "TEC" || code === "TRIETHYL CITRATE") {
    aliases = ["TEC", "TRIETHYL CITRATE"]
  } else if (code === "ETOH" || code === "ETHANOL" || code === "PERFUME ALCOHOL" || code === "DENATURED ALCOHOL") {
    aliases = ["ETOH", "ETHANOL", "PERFUME ALCOHOL", "DENATURED ALCOHOL", "ALCOHOL DENAT", "ALCOHOL DENAT.", "ALCOHOL"]
  }

  // 1) direct key lookups (if ingredientMap uses solvent codes as keys)
  for (const a of aliases) {
    if (props.ingredientMap && props.ingredientMap[a]) return props.ingredientMap[a]
  }

  // 2) name matching (requested method)
  const byName = vals.find(v => aliases.includes(norm(v?.name)))
  if (byName) return byName

  // 2b) synonym matching (new)
  const bySyn = vals.find(v => {
    const syns = Array.isArray(v?.synonyms) ? v.synonyms : []
    return syns.some(s => aliases.includes(norm(s)))
  })
  if (bySyn) return bySyn

  // 3) CAS fallbacks for common solvents
  const byCas = (cas) => vals.find(v => casIncludes(v?.cas, cas)) || null
  if (aliases.includes("BB")) {
    const hit = byCas("120-51-4")
    if (hit) return hit
  }
  if (aliases.includes("DPG")) {
    const hit = byCas("25265-71-8")
    if (hit) return hit
  }
  if (aliases.includes("IPM")) {
    const hit = byCas("110-27-0")
    if (hit) return hit
  }
  if (aliases.includes("TEC")) {
    const hit = byCas("77-93-0")
    if (hit) return hit
  }
  if (aliases.includes("ETOH") || aliases.includes("ETHANOL") || aliases.includes("ALCOHOL")) {
    const hit = byCas("64-17-5")
    if (hit) return hit
  }

  return null
}




function nameLooksLike(v, candidates) {
  const n = String(v || "").trim().toUpperCase()
  return candidates.some(c => n === c)
}

function isAlcoholDenatLike(value) {
  return nameLooksLike(value, ["ETOH", "ETHANOL", "ALCOHOL", "ALCOHOL DENAT", "ALCOHOL DENAT.", "DENATURED ALCOHOL", "PERFUME ALCOHOL"])
}

function isAquaLike(value) {
  return nameLooksLike(value, ["AQUA", "WATER", "DISTILLED WATER", "7732-18-5"])
}

function isAquaIngredient(ing) {
  return !!ing && (
    casIncludes(ing?.cas, "7732-18-5") ||
    isAquaLike(ing?.name) ||
    (Array.isArray(ing?.synonyms) && ing.synonyms.some(isAquaLike))
  )
}

function ethanolFractionOfIngredientMixture(ing) {
  if (!ing) return 0
  const c = ing.concentration != null ? num(ing.concentration, 100) : 100
  const solvent = String(ing.solvent || "").trim()

  // Match RecipeSummary behaviour: if the ingredient stock solvent is ETOH,
  // the non-concentrate part is ethanol/alcohol denat.
  if (isAlcoholDenatLike(solvent)) {
    return Math.max(0, Math.min(1, (100 - c) / 100))
  }

  return 0
}

function ethanolFractionOfDilutant(row) {
  const d =
    row?.dilutant === "Other"
      ? String(row?.customDilutant || "")
      : String(row?.dilutant || "")

  const matched = matchedDilutantComposition(d, props.ingredientMap, dilutants.value)
  return matched ? matched.ethanol : isAlcoholDenatLike(d) ? 1 : 0
}

function waterFractionOfDilutant(row) {
  const d =
    row?.dilutant === "Other"
      ? String(row?.customDilutant || "")
      : String(row?.dilutant || "")

  const matched = matchedDilutantComposition(d, props.ingredientMap, dilutants.value)
  return matched ? matched.water : isAquaLike(d) ? 1 : 0
}

const ALCOHOL_DENAT_ETHANOL_FRACTION = 0.95
const ALCOHOL_DENAT_WATER_FRACTION = 0.05

function addAlcoholDenat(map, grams, sources = []) {
  // Treat ETOH / Alcohol Denat. as perfume alcohol: 95% Alcohol Denat. + 5% Aqua.
  // This prevents Alcohol Denat. showing as 100% while Aqua is added on top.
  const alcoholSources = scaleSourceContributions(contributionsFromSource(sources, grams), ALCOHOL_DENAT_ETHANOL_FRACTION)
  addGrams(map, "64-17-5", "Alcohol Denat.", num(grams, 0) * ALCOHOL_DENAT_ETHANOL_FRACTION, null, alcoholSources)
}

function addAqua(map, grams, sources = []) {
  addGrams(map, "7732-18-5", "Aqua", grams, null, sources)
}


function addGrams(map, cas, name, grams, copyName = null, sources = []) {
  const g = num(grams, 0)
  if (g <= 0) return

  const canonical = canonicalAllergenFor(cas, name)
  const casList = canonical?.casList?.length ? canonical.casList : casArray(cas)
  const c = canonical?.primaryCas || primaryCas(casList)
  if (!c) return

  const displayName = canonical?.name || String(name || c)
  const inci = canonical?.inci || displayName
  const explicitCopyName = String(copyName || "").trim()

  if (!map[c]) {
    map[c] = {
      cas: c,
      casList,
      name: displayName,
      inci,
      copyName: explicitCopyName || inci,
      sources: [],
      grams: 0
    }
  } else {
    // If an older single-CAS row was created first, upgrade it when a canonical array-form match appears later.
    map[c].casList = uniqueCasList([map[c].casList || map[c].cas, casList])
    map[c].name = canonical?.name || map[c].name || displayName
    map[c].inci = canonical?.inci || map[c].inci || inci

    // Keep the visible table name unchanged, but prefer an explicit ingredient INCI for copying.
    if (explicitCopyName) map[c].copyName = explicitCopyName
    else if (!map[c].copyName) map[c].copyName = map[c].inci || inci
  }

  map[c].grams += g
  map[c].sources = mergeSourceContributions(map[c].sources, contributionsFromSource(sources, g))
}
const GROUP_SPECS = [
  {
    key: "rose-ketones",
    name: "Rose Ketones",
    cas: "GROUP",
    inci: null,
    casList: [
      "43052-87-5",
      "57378-68-4",
      "23696-85-7",
      "23726-93-4",
      "59739-63-8",
      "35044-68-9",
      "23726-91-2",
      "24720-09-0",
      "23726-94-5",
      "23726-92-3",
      "23726-91-3",
      "71048-82-3",
      "35087-49-1",
      "33673-71-1",
      "39872-57-6",
      "70266-48-7",
      "87064-19-5"
    ]
  },
  {
    key: "otne",
    name: "OTNE",
    cas: "GROUP",
    inci: "Tetramethyl acetyloctahydronaphthalenes",
    casList: ["54464-57-2", "68155-67-9", "68155-66-8"]
  },
  {
    key: "citral",
    name: "Citral",
    cas: "GROUP",
    inci: null,
    casList: ["5392-40-5", "141-27-5", "106-26-3"]
  }
]

function normCas(cas) {
  return primaryCas(cas)
}

function applyGroupsFromGrams(rowList, totalMixtureGrams) {
  const byCas = new Map()
  for (const r of rowList) byCas.set(normCas(r.cas), r)

  const consumed = new Set()
  const out = []

  for (const spec of GROUP_SPECS) {
    const components = []
    for (const cas of spec.casList) {
      const c = byCas.get(normCas(cas))
      if (c) components.push(c)
    }
    if (!components.length) continue

    for (const c of components) consumed.add(normCas(c.cas))

    const gramsSum = components.reduce((s, c) => s + num(c?.grams, 0), 0)
    const rawPercent = (gramsSum / totalMixtureGrams) * 100
    const singleComponent = components.length === 1

    out.push({
      key: `group:${spec.key}`,
      // A single match is not a multi-CAS group; show its actual CAS.
      cas: singleComponent ? components[0].cas : spec.cas,
      casList: singleComponent ? casArray(components[0].cas) : spec.casList,
      name: spec.name,
      inci: spec.inci,
      rawPercent,
      percent: rawPercent.toFixed(4),
      copyName: spec.inci || spec.name,
      sources: displaySourceContributions(components.flatMap(c => c.sources || []), totalMixtureGrams),
      // Retain the CAS breakdown for grouped row data.
      breakdown: singleComponent ? [] : components
        .map((c) => ({
          cas: c.cas,
          name: c.name,
          copyName: c.copyName || c.inci || c.name,
          percent: ((num(c?.grams, 0) / totalMixtureGrams) * 100).toFixed(4)
        }))
        .sort((a, b) => Number(b.percent) - Number(a.percent))
    })
  }

  // add all non-consumed rows
  for (const r of rowList) {
    if (!consumed.has(normCas(r.cas))) {
      out.push({
        key: r.cas,
        cas: r.cas,
        casList: r.casList || casArray(r.cas),
        name: r.name,
        inci: r.inci || r.name,
        copyName: r.copyName || r.inci || r.name,
        sources: displaySourceContributions(r.sources, totalMixtureGrams),
        rawPercent: (num(r.grams, 0) / totalMixtureGrams) * 100,
        percent: ((num(r.grams, 0) / totalMixtureGrams) * 100).toFixed(4),
        breakdown: []
      })
    }
  }

  return out.sort((a, b) => Number(b.percent) - Number(a.percent))
}


const rows = computed(() => {
  const totalMixtureGrams = (props.items || []).reduce((s, r) => s + num(r?.gramsAdded, 0), 0)
  if (totalMixtureGrams <= 0) return []

  const byCas = {}
  let ethanolGrams = 0
  let directAquaGrams = 0
  const ethanolSources = []
  const directAquaSources = []

  function processRow(row, scale = 1, visitedAccords = new Set(), parentSource = null) {
    if (!row) return

    const outerG = num(row?.gramsAdded, 0) * num(scale, 1)
    if (outerG <= 0) return

    // base grams (after dilution). dilution null => 100% via dilutionFrac()
    const outerBase = outerG * dilutionFrac(row)
    const accord = getAccordFromRow(row)
    const ing = accord ? null : getIngredientFromRow(row)
    const source = sourceForRow(row, accord || ing, parentSource)

    // Row dilutant (the remainder after row dilution). This must be accounted for in summaries.
    const dilutantGrams = Math.max(0, outerG - outerBase)
    const dilutantCode =
      String(row?.dilutant || "").trim() === "Other"
        ? String(row?.customDilutant || "").trim()
        : String(row?.dilutant || "").trim()

    // Added dilutant alcohol/water, using the same ETOH approach as RecipeSummary.
    const dilutantAlcoholGrams = dilutantGrams * ethanolFractionOfDilutant(row)
    const dilutantAquaGrams = dilutantGrams * waterFractionOfDilutant(row)
    ethanolGrams += dilutantAlcoholGrams
    directAquaGrams += dilutantAquaGrams
    const dilutantSource = sourceWithDetail(source, `dilutant: ${dilutantCode}`)
    ethanolSources.push(...contributionsFromSource(dilutantSource, dilutantAlcoholGrams))
    directAquaSources.push(...contributionsFromSource(dilutantSource, dilutantAquaGrams))

    if (outerBase <= 0) return

    // ---------- ACCORD ROW ----------
    if (accord) {
      const accordId = String(accord?.id || row?.accordId || row?.key || row?.name || "")
      if (accordId) {
        if (visitedAccords.has(accordId)) return
        visitedAccords.add(accordId)
      }

      // Do not use saved accord summaries such as totalGrams, totalEtohPercent,
      // allergenList, or ifraList. They can become stale. Always recalculate from
      // the accord's own items, including nested accords.
      const items = Array.isArray(accord?.items) ? accord.items : []
      const accordItemsTotal = items.reduce((s, it) => s + num(it?.gramsAdded, 0), 0)
      const scaleFromAccord = accordItemsTotal > 0 ? outerBase / accordItemsTotal : 0

      if (scaleFromAccord > 0) {
        for (const it of items) {
          processRow(
            {
              ...it,
              kind: it?.kind || (it?.cas === "ACCORD" ? "accord" : null),
              accordId: it?.accordId || null
            },
            scaleFromAccord,
            visitedAccords,
            source
          )
        }
      }

      if (accordId) visitedAccords.delete(accordId)
      return
    }

    // ---------- NORMAL INGREDIENT ROW ----------

    // If ingredient is a mixture (concentration + solvent), split neat vs solvent grams.
    const concPct = ing?.concentration != null ? num(ing.concentration, 100) : 100
    const concFrac = Math.max(0, Math.min(1, concPct / 100))
    const neatGrams = outerBase * concFrac
    const solventGrams = outerBase - neatGrams
    const solventCode = String(ing?.solvent || "").trim()

    // Always add alcohol denat. from ingredient stock solvent using RecipeSummary's ETOH method,
    // even when Alcohol Denat. is not explicitly listed in the ingredient's allergenList.
    const stockAlcoholGrams = outerBase * ethanolFractionOfIngredientMixture(ing)
    ethanolGrams += stockAlcoholGrams
    ethanolSources.push(...contributionsFromSource(sourceWithDetail(source, `solvent: ${solventCode}`), stockAlcoholGrams))

    // Direct Aqua ingredient contribution.
    if (isAquaIngredient(ing)) {
      directAquaGrams += neatGrams
      directAquaSources.push(...contributionsFromSource(source, neatGrams))
    }

    // Solvent contributes if the resolved solvent ingredient is an allergen (e.g. BB / Benzyl Benzoate).
    // ETOH/Aqua themselves are handled separately above/below so they do not rely on ingredient flags.
    if (solventGrams > 0 && solventCode && !isAlcoholDenatLike(solventCode) && !isAquaLike(solventCode)) {
      const solvIng = resolveSolventIngredient(solventCode)
      if (solvIng?.isAllergen) {
        const sCas = primaryCas(solvIng?.cas)
        const sName = String(solvIng?.name || sCas)
        const sCopyName = ingredientInciCopyName(solvIng, sName)
        if (sCas) addGrams(byCas, sCas, sName, solventGrams, sCopyName, sourceWithDetail(source, `solvent: ${solventCode}`))
      }
    }

    // Added dilutant contributes if resolved dilutant ingredient is an allergen (e.g. BB).
    // ETOH/Aqua themselves are handled separately above/below so they do not rely on ingredient flags.
    if (dilutantGrams > 0 && dilutantCode && !isAlcoholDenatLike(dilutantCode) && !isAquaLike(dilutantCode)) {
      const dIng = resolveSolventIngredient(dilutantCode)
      if (dIng?.isAllergen && !isAquaIngredient(dIng) && !casIncludes(dIng.cas, "64-17-5")) {
        const dCas = primaryCas(dIng?.cas)
        const dName = String(dIng?.name || dCas)
        const dCopyName = ingredientInciCopyName(dIng, dName)
        if (dCas) addGrams(byCas, dCas, dName, dilutantGrams, dCopyName, dilutantSource)
      }
    }

    // If ingredient has allergenList as composition (%)
    const list = Array.isArray(ing?.allergenList) ? ing.allergenList : []

    // If the ingredient itself is flagged as an allergen, count the ingredient itself.
    // IMPORTANT: this is IN ADDITION TO any allergenList breakdown below.
    if (ing?.isAllergen) {
      const cas = primaryCas(ing?.cas || row?.cas)
      const name = String(ing?.name || row?.name || cas)
      const copyName = ingredientInciCopyName(ing, name)

      if (cas === "64-17-5" || isAlcoholDenatLike(name) || isAlcoholDenatLike(cas)) {
        addAlcoholDenat(byCas, neatGrams, source)
        directAquaGrams += neatGrams * ALCOHOL_DENAT_WATER_FRACTION
        directAquaSources.push(...contributionsFromSource(source, neatGrams * ALCOHOL_DENAT_WATER_FRACTION))
      } else {
        addGrams(byCas, cas, name, neatGrams, copyName, source)
      }
    }

    if (list.length) {
      for (const a of list) {
        const cas = primaryCas(a?.cas)
        const name = String(a?.name || cas)

        // ✅ concentration (%), NOT grams
        const pct = num(a?.concentration, 0)
        if (!cas || pct <= 0) continue

        const gramsFromList = neatGrams * (pct / 100)

        // ingredient.allergenList is already an explicit composition percentage.
        // Do not split Alcohol Denat. again, otherwise 95% becomes 90.25%.
        addGrams(byCas, cas, name, gramsFromList, null, source)
      }
    }
  }

  for (const row of props.items || []) {
    processRow(row, 1, new Set())
  }

  // Always include Alcohol Denat. based on calculated ETOH stock grams.
  // addAlcoholDenat() stores only the 95% alcohol portion.
  if (ethanolGrams > 0) {
    addAlcoholDenat(byCas, ethanolGrams, ethanolSources)
  }

  // Aqua is 5% of calculated ETOH stock grams plus direct Aqua already found.
  const aquaGrams = (ethanolGrams * ALCOHOL_DENAT_WATER_FRACTION) + directAquaGrams
  if (aquaGrams > 0) {
    addAqua(byCas, aquaGrams, mergeSourceContributions(scaleSourceContributions(ethanolSources, ALCOHOL_DENAT_WATER_FRACTION), directAquaSources))
  }

  return applyGroupsFromGrams(Object.values(byCas), totalMixtureGrams)
})

function percentHoverTitle(row) {
  // Use the unrounded calculated percentage so the hover can show a fifth
  // decimal place even though the table itself displays four.
  const raw = Number(row?.rawPercent ?? row?.percent)
  return Number.isFinite(raw) ? `${Number(raw.toFixed(5))}%` : ""
}

const copyStatus = ref("")


function tsvEscape(v) {
  return String(v ?? "").replace(/[\t\r\n]+/g, " ").trim()
}

const ifraCasLookup = computed(() => {
  const byCas = {}
  const entries = Array.isArray(rawIfra51) ? rawIfra51 : []

  for (const entry of entries) {
    const list = casArray(entry?.cas)
    if (!list.length) continue

    for (const cas of list) {
      byCas[cas] = entry
    }
  }

  return byCas
})

function ifraEntryForRow(row) {
  const list = uniqueCasList([row?.casList || [], row?.cas || ""])
  const lookup = ifraCasLookup.value || {}

  for (const cas of list) {
    if (lookup[cas]) return lookup[cas]
  }

  return null
}

function displayAllCas(row) {
  // Priority:
  // 1) Match the row CAS against ifra51.json and use the full CAS group from that IFRA entry.
  //    This means an old single-CAS row like Citronellol 106-22-9 copies all IFRA CAS variants.
  // 2) Fall back to the canonical allergen CAS list already calculated from allergens.json.
  const ifraEntry = ifraEntryForRow(row)
  const ifraCas = casArray(ifraEntry?.cas)

  const list = ifraCas.length
    ? ifraCas
    : uniqueCasList([row?.casList || [], row?.cas || ""])

  return list.join("; ")
}

const DECLARATION_THRESHOLD = 0.001

function allergenPercent(row) {
  const n = Number(row?.percent)
  return Number.isFinite(n) ? n : 0
}

function isDeclarationAllergen(row) {
  return allergenPercent(row) >= DECLARATION_THRESHOLD
}

function isBelowDeclarationThreshold(row) {
  return allergenPercent(row) < DECLARATION_THRESHOLD
}

function copyAllergenName(row) {
  return String(row?.copyName || row?.inci || row?.name || "").trim().toUpperCase()
}

const copyableAllergenText = computed(() => {
  const seen = new Set()

  const names = rows.value
    .filter(isDeclarationAllergen)
    .slice()
    .sort((a, b) => allergenPercent(b) - allergenPercent(a))
    .map(copyAllergenName)
    .filter(Boolean)
    .filter((name) => {
      if (seen.has(name)) return false
      seen.add(name)
      return true
    })

  return names.join(", ")
})


const hasDeclarationAllergens = computed(() =>
  rows.value.some(isDeclarationAllergen)
)

async function copyAllergensToClipboard() {
  if (!hydrated.value) return
  const text = copyableAllergenText.value
  if (!text) return

  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else if (typeof document !== "undefined") {
      const textarea = document.createElement("textarea")
      textarea.value = text
      textarea.setAttribute("readonly", "")
      textarea.style.position = "fixed"
      textarea.style.opacity = "0"
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      textarea.remove()
    }
    copyStatus.value = "Copied"
    setTimeout(() => { copyStatus.value = "" }, 1200)
  } catch (err) {
    console.warn("Could not copy allergen list to clipboard.", err)
    copyStatus.value = "Copy failed"
    setTimeout(() => { copyStatus.value = "" }, 1600)
  }
}

</script>


<style scoped>
.allergen-copy-placeholder {
  display: inline-block;
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
}

.source-info {
  cursor: help;
  flex-shrink: 0;
}

.source-tooltip {
  max-width: min(380px, calc(100vw - 48px));
  white-space: normal;
  overflow-wrap: anywhere;
}

.source-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.75rem;
  line-height: 1.35;
}

.source-table th,
.source-table td {
  padding: 4px 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  text-align: left;
  vertical-align: top;
}

.source-table th {
  font-weight: 600;
}

.source-table tbody tr:last-child td {
  border-bottom: 0;
}

.source-table th:first-child,
.source-table td:first-child {
  padding-inline-start: 0;
}

.source-table .source-cas {
  min-width: 80px;
}

.source-table .source-percent {
  padding-inline-end: 0;
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.summary-scroll{
  max-height: 33vh; /* 1/3 of viewport height */
  overflow-y: auto;
  border: 2px solid transparent;
  border-radius: 10px;
}
.summary-scroll.has-exceeded{
  border-color: rgb(var(--v-theme-error));
}

.allergen-below-threshold {
  opacity: 0.48;
  background-color: rgba(0, 0, 0, 0.025);
}
</style>
