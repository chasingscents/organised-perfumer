<!-- components/IFRASummary.vue -->
<template>
  <v-card class="pa-3">
    <div class="d-flex align-center justify-space-between mb-2">
      <div class="d-flex align-center ga-2">
        <h2 class="text-h6 mb-0">IFRA Summary</h2>

        <v-tooltip v-if="hydrated" location="top">
          <template #activator="{ props: tipProps }">
            <v-btn
              v-bind="tipProps"
              icon="mdi-content-copy"
              size="x-small"
              variant="text"
              aria-label="Copy IFRA table"
              :disabled="rows.length === 0"
              @click="copyIfraTable"
            />
          </template>
          <span>{{ copyStatus || "Copy IFRA table" }}</span>
        </v-tooltip>

        <span v-else class="summary-copy-placeholder" aria-hidden="true" />
      </div>
    </div>

    <div class="summary-scroll" :class="{ 'is-exceeded': hasAnyExceeded, 'is-empty': rows.length === 0 }">
      <v-table density="compact">
      <thead>
        <tr>
          <th class="text-left">Ingredient</th>
          <th class="text-right">% in Recipe</th>
          <th class="text-right">IFRA Limit</th>
        </tr>
      </thead>

      <tbody>
        <tr
          v-for="row in rows"
          :key="row.key"
          :style="row.exceeded ? 'background:#ffe5e5;' : ''"
        >
          <td>
            <div class="d-flex flex-column">
              <div class="d-flex align-center flex-wrap ga-2">
                <span class="font-weight-medium">{{ row.name }}</span>
                <ClientOnly>
                  <v-tooltip location="top" max-width="420">
                    <template #activator="{ props: tipProps }">
                      <v-icon
                        v-bind="tipProps"
                        size="16"
                        class="text-grey-darken-1 source-info"
                        tabindex="0"
                        :aria-label="'Sources for ' + row.name"
                      >mdi-information-outline</v-icon>
                    </template>
                    <div class="source-tooltip">
                      <table v-if="row.sources?.length" class="source-table">
                        <thead>
                          <tr>
                            <th scope="col">Name</th>
                            <th scope="col" class="source-cas">CAS</th>
                            <th scope="col" class="source-percent">%</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="source in row.sources" :key="source.key">
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
                    <v-icon size="16" class="text-grey-darken-1 source-info" :title="sourceTitle(row)">mdi-information-outline</v-icon>
                  </template>
                </ClientOnly>
              </div>
              <span class="text-caption text-grey">CAS: {{ row.cas || "-" }}</span>
            </div>
          </td>

          <td class="text-right">{{ row.percent }}</td>
          <td class="text-right">{{ row.limitText }}</td>
        </tr>

        <tr v-if="rows.length === 0">
          <td colspan="3" class="text-center text-grey py-3">
            No IFRA-related ingredients.
          </td>
        </tr>
      </tbody>
      </v-table>
    </div>

    <div v-if="rows.length > 0" class="mt-2 text-caption">
      <span class="font-weight-medium">Maximum Level of Use:</span>
      <span :class="maximumLevelExceeded ? 'text-error font-weight-medium' : ''">
        {{ maximumLevelOfUseText }}
      </span>
    </div>
  </v-card>
</template>

<script setup>
import { computed, onMounted, ref } from "vue"
import { num, dilutionFrac } from "@/utils/accordHelpers"
import { resolveMatchedDilutantIngredient, useDilutants } from "@/composables/useDilutants.js"

const props = defineProps({
  items: { type: Array, required: true },

  // ingredientMap keyed by ingredient "key"
  ingredientMap: { type: Object, default: () => ({}) },

  // accordMap keyed by accord.id
  accordMap: { type: Object, default: () => ({}) },

  // ifraMap keyed by CAS from ifra51.json
  ifraMap: { type: Object, required: true },

  categoryField: { type: String, default: "categoryFour" }
})

const { dilutants } = useDilutants()


const hydrated = ref(false)

onMounted(() => {
  hydrated.value = true
})


function fmtPct(v) {
  return Number(v).toFixed(4) + "%"
}
function fmtLimit(v) {
  if (v == null || v === "" || !Number.isFinite(Number(v))) return "-"
  return Number(v).toFixed(2) + "%"
}

function casArray(v) {
  return (Array.isArray(v) ? v : [v])
    .map(x => String(x || "").trim())
    .filter(Boolean)
}

function primaryCas(v) {
  return casArray(v)[0] || ""
}

function casMatches(a, b) {
  const targets = new Set(casArray(b))
  return casArray(a).some(c => targets.has(c))
}

function getRecs(entry) {
  return Array.isArray(entry?.recommendation) ? entry.recommendation : []
}

function hasRestriction(entry) {
  return getRecs(entry).some((s) => String(s).toLowerCase() === "restriction")
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

  // 3) cas direct map
  const casKeys = casArray(row?.cas)
  for (const casKey of casKeys) {
    if (casKey && props.ingredientMap?.[casKey]) return props.ingredientMap[casKey]
  }

  // 4) scan by CAS, including array CAS values
  if (casKeys.length) {
    const vals = Object.values(props.ingredientMap || {})
    return vals.find(v => casMatches(v?.cas, casKeys)) || null
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
  const byCas = (cas) => vals.find(v => casMatches(v?.cas, cas)) || null
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



function addBase(byCas, cas, grams, sourcesByCas, source) {
  const c = String(cas || "").trim()
  const g = num(grams, 0)
  if (!c || g <= 0) return
  byCas[c] = (byCas[c] || 0) + g
  sourcesByCas[c] = mergeSourceContributions(sourcesByCas[c], contributionsFromSource(source, g))
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
  return String(cas || "").trim()
}

function ifraEntryName(entry, fallback) {
  return (
    (Array.isArray(entry?.names) ? entry.names[0] : null) ||
    (Array.isArray(entry?.name) ? entry.name[0] : null) ||
    entry?.name ||
    fallback ||
    ""
  )
}

function makeIfraGroupRow({ key, name, inci = null, components, limitEntry = null, limitCas = null, totalMixtureGrams }) {
  const rawPctSum = components.reduce((s, c) => s + num(c?.rawPct, 0), 0)

  const limitVal = limitEntry?.[props.categoryField]
  const hasNumericLimit =
    limitVal != null &&
    limitVal !== "" &&
    Number.isFinite(Number(limitVal))

  const groupExceeded =
    hasNumericLimit &&
    limitEntry &&
    hasRestriction(limitEntry) &&
    rawPctSum > Number(limitVal)
      ? true
      : components.some((c) => !!c.exceeded)

  return {
    key,
    cas: "GROUP",
    name,
    inci,
    rawPct: rawPctSum,
    percent: fmtPct(rawPctSum),
    rawLimit: hasNumericLimit ? Number(limitVal) : null,
    limitText: hasNumericLimit ? fmtLimit(limitVal) : "-",
    exceeded: groupExceeded,
    sources: displaySourceContributions(components.flatMap(c => c.sources || []), totalMixtureGrams),
    breakdown: components
      .map((c) => ({
        cas: c.cas,
        name: c.name,
        percent: Number(num(c?.rawPct, 0)).toFixed(4)
      }))
      .sort((a, b) => Number(b.percent) - Number(a.percent))
  }
}

function applyGroupsFromIfraRows(rowList, totalMixtureGrams) {
  const byCas = new Map()
  for (const r of rowList) byCas.set(normCas(r.cas), r)

  const consumed = new Set()
  const out = []

  // 1) Keep the specific named grouping rules that need curated names/tooltips.
  for (const spec of GROUP_SPECS) {
    const components = []
    for (const cas of spec.casList) {
      const r = byCas.get(normCas(cas))
      if (r) components.push(r)
    }
    if (!components.length) continue

    for (const c of components) consumed.add(normCas(c.cas))

    const primary = components[0]
    const primaryCas = String(primary?.cas || "").trim()
    const primaryEntry = props.ifraMap?.[primaryCas]

    out.push(makeIfraGroupRow({
      key: `group:${spec.key}`,
      name: spec.name,
      inci: spec.inci,
      components,
      limitEntry: primaryEntry,
      limitCas: primaryCas,
      totalMixtureGrams
    }))
  }

  // 2) Generic IFRA grouping:
  // If two or more displayed rows belong to the same IFRA entry because their CAS
  // are variants in the same ifra51.json `cas` array, combine them into one GROUP row.
  // Example: Citronellol 106-22-9 at 1% + Citronellol 1117-61-9 at 2%
  // becomes Citronellol CAS: GROUP at 3%.
  const dynamicGroups = new Map()

  for (const r of rowList) {
    const rowCas = normCas(r.cas)
    if (!rowCas || consumed.has(rowCas)) continue

    const entry = props.ifraMap?.[rowCas]
    const entryCasList = casArray(entry?.cas)

    // Only dynamic-group IFRA records that actually have a CAS array/group.
    if (!entry || entryCasList.length <= 1) continue

    const matchingComponents = entryCasList
      .map(cas => byCas.get(normCas(cas)))
      .filter(Boolean)
      .filter(c => !consumed.has(normCas(c.cas)))

    if (matchingComponents.length <= 1) continue

    const groupKey = entryCasList.map(normCas).filter(Boolean).join("|")
    if (!dynamicGroups.has(groupKey)) {
      dynamicGroups.set(groupKey, {
        entry,
        casList: entryCasList,
        components: matchingComponents
      })
    }
  }

  for (const [groupKey, group] of dynamicGroups.entries()) {
    const components = group.components
      .filter(c => !consumed.has(normCas(c.cas)))

    if (components.length <= 1) continue

    for (const c of components) consumed.add(normCas(c.cas))

    const first = components[0]
    const firstCas = normCas(first?.cas)
    const name = ifraEntryName(group.entry, first?.name || firstCas)

    out.push(makeIfraGroupRow({
      key: `ifra-group:${groupKey}`,
      name,
      inci: name,
      components,
      limitEntry: group.entry,
      limitCas: firstCas,
      totalMixtureGrams
    }))
  }

  // 3) Any remaining non-grouped IFRA rows.
  for (const r of rowList) {
    if (!consumed.has(normCas(r.cas))) {
      out.push({ ...r, breakdown: [] })
    }
  }

  return out.sort((a, b) => num(b.rawPct, 0) - num(a.rawPct, 0))
}

const rows = computed(() => {
  const totalMixtureGrams = (props.items || []).reduce((s, r) => s + num(r?.gramsAdded, 0), 0)
  if (totalMixtureGrams <= 0) return []

  const baseByCas = {}
  const selfLimitByCas = {}
  const sourcesByCas = {}

  function isIfraRelevantIngredient(ing, cas) {
    return !!(props.ifraMap && cas && props.ifraMap[cas]) ||
      ing?.ifraMaxLimit != null ||
      (Array.isArray(ing?.ifraList) && ing.ifraList.length)
  }

  function addDilutantIfra(dilutantGrams, dilutantCode, source) {
    if (dilutantGrams <= 0 || !dilutantCode) return

    const dIng = resolveSolventIngredient(dilutantCode)
    const dCas = primaryCas(dIng?.cas)
    if (isIfraRelevantIngredient(dIng, dCas) && dCas) {
      addBase(baseByCas, dCas, dilutantGrams, sourcesByCas, sourceWithDetail(source, `dilutant: ${dilutantCode}`))
    }
  }

  function processRow(row, scale = 1, visitedAccords = new Set(), parentSource = null) {
    if (!row) return

    const outerG = num(row?.gramsAdded, 0) * num(scale, 1)
    if (outerG <= 0) return

    const outerBase = outerG * dilutionFrac(row) // apply row dilution; null => 100%
    const accord = getAccordFromRow(row)
    const ing = accord ? null : getIngredientFromRow(row)
    const source = sourceForRow(row, accord || ing, parentSource)

    // Row dilutant is part of the actual selected mixture and must be considered
    // independently of whether the row is a direct ingredient or an accord.
    const dilutantGrams = Math.max(0, outerG - outerBase)
    const dilutantCode =
      String(row?.dilutant || "").trim() === "Other"
        ? String(row?.customDilutant || "").trim()
        : String(row?.dilutant || "").trim()

    addDilutantIfra(dilutantGrams, dilutantCode, source)

    if (outerBase <= 0) return

    // ---------- ACCORD ROW ----------
    if (accord) {
      const accordId = String(accord?.id || row?.accordId || row?.key || row?.name || "")
      if (accordId) {
        if (visitedAccords.has(accordId)) return
        visitedAccords.add(accordId)
      }

      // Do not use saved accord summaries such as totalGrams, ifraList,
      // allergenList, totalEtohPercent, etc. They can become stale.
      // Always recalculate from the accord's own items, including nested accords.
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

    // Solvent contributes only if it is IFRA-relevant.
    if (solventGrams > 0 && solventCode) {
      const solvIng = resolveSolventIngredient(solventCode)
      const sCas = primaryCas(solvIng?.cas)
      if (isIfraRelevantIngredient(solvIng, sCas) && sCas) {
        addBase(baseByCas, sCas, solventGrams, sourcesByCas, sourceWithDetail(source, `solvent: ${solventCode}`))
      }
    }

    // If the ingredient itself has an IFRA max limit, count the ingredient itself.
    // This is in addition to any ifraList breakdown below.
    const selfCas = primaryCas(ing?.cas || row?.cas)
    const selfLimit = ing?.ifraMaxLimit
    const hasSelfIfraLimit =
      selfLimit != null &&
      selfLimit !== "" &&
      Number.isFinite(Number(selfLimit))

    if (hasSelfIfraLimit && selfCas) {
      addBase(baseByCas, selfCas, neatGrams, sourcesByCas, source)
      selfLimitByCas[selfCas] = {
        name: String(ing?.name || row?.name || selfCas),
        limit: Number(selfLimit)
      }
    }

    // If ingredient has ifraList as composition (%), add constituents too.
    const list = Array.isArray(ing?.ifraList) ? ing.ifraList : []
    if (list.length) {
      for (const c of list) {
        const cas = primaryCas(c?.cas)
        if (!cas) continue

        // concentration (%), not grams
        const pct = num(c?.concentration, 0)
        if (pct <= 0) continue

        addBase(baseByCas, cas, neatGrams * (pct / 100), sourcesByCas, source)
      }
    } else if (!hasSelfIfraLimit) {
      // Fallback: attribute all base grams to this ingredient's CAS.
      const cas = primaryCas(ing?.cas || row?.cas)
      if (cas) addBase(baseByCas, cas, neatGrams, sourcesByCas, source)
    }
  }

  for (const row of props.items || []) {
    processRow(row, 1, new Set())
  }

  const out = []

  for (const [cas, baseGrams] of Object.entries(baseByCas)) {
    if (num(baseGrams, 0) <= 0) continue

    const entry = props.ifraMap?.[cas]
    const selfLimit = selfLimitByCas[cas]

    // Keep IFRA 51 entries, plus custom ingredient-level IFRA max limits.
    if (!entry && !selfLimit) continue

    const recs = entry ? getRecs(entry) : []
    if (entry && !recs.length && !selfLimit) continue

    const limitVal = selfLimit ? selfLimit.limit : entry?.[props.categoryField]
    const pct = (num(baseGrams, 0) / totalMixtureGrams) * 100

    const exceeded =
      (limitVal != null && limitVal !== "" && Number.isFinite(Number(limitVal))) &&
      (selfLimit || hasRestriction(entry)) &&
      pct > Number(limitVal)

    const name =
      selfLimit?.name ||
      (Array.isArray(entry?.names) ? entry.names[0] : null) ||
      (Array.isArray(entry?.name) ? entry.name[0] : null) ||
      entry?.name ||
      cas

    out.push({
      key: cas,
      cas,
      name,
      rawPct: pct,
      percent: fmtPct(pct),
      rawLimit:
        (limitVal != null && limitVal !== "" && Number.isFinite(Number(limitVal)))
          ? Number(limitVal)
          : null,
      limitText: fmtLimit(limitVal),
      exceeded,
      sources: displaySourceContributions(sourcesByCas[cas], totalMixtureGrams),
      breakdown: []
    })
  }

  // Apply grouping rules (Rose Ketones / OTNE / Citral / dynamic IFRA groups)
  return applyGroupsFromIfraRows(out, totalMixtureGrams)
})


const copyStatus = ref("")

function tsvEscape(v) {
  const s = String(v ?? "")
  // TSV-safe enough for spreadsheet paste: remove tabs/newlines that would break cells/rows.
  return s.replace(/[\t\r\n]+/g, " ").trim()
}

function displayCopyCas(row) {
  // For grouped rows, the visible CAS is "GROUP", but copied CAS should be the full
  // IFRA CAS group from ifra51.json, separated by semicolons.
  const componentCas = Array.isArray(row?.breakdown)
    ? row.breakdown.map(b => b?.cas).filter(Boolean)
    : []

  for (const cas of componentCas) {
    const entry = props.ifraMap?.[cas]
    const list = casArray(entry?.cas)
    if (list.length) return list.join("; ")
  }

  const directCas = primaryCas(row?.cas)
  const directEntry = props.ifraMap?.[directCas]
  const directList = casArray(directEntry?.cas)
  if (directList.length) return directList.join("; ")

  if (componentCas.length) return componentCas.join("; ")

  return directCas || ""
}

function copyTextFallback(text) {
  if (typeof document === "undefined") return false

  const ta = document.createElement("textarea")
  ta.value = text
  ta.setAttribute("readonly", "")
  ta.style.position = "fixed"
  ta.style.top = "-9999px"
  ta.style.left = "-9999px"
  document.body.appendChild(ta)
  ta.select()

  try {
    const ok = document.execCommand("copy")
    document.body.removeChild(ta)
    return ok
  } catch {
    document.body.removeChild(ta)
    return false
  }
}

async function copyIfraTable() {
  if (!hydrated.value || rows.value.length === 0) return
  const header = ["Ingredient Name", "CAS", "Concentration (%)"]
  const bodyRows = rows.value.map((r) => [
    r?.name || "",
    displayCopyCas(r),
    Number(num(r?.rawPct, 0)).toFixed(4)
  ])

  const text = [header, ...bodyRows]
    .map(cols => cols.map(tsvEscape).join("\t"))
    .join("\n")

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else if (!copyTextFallback(text)) {
      throw new Error("Clipboard API unavailable")
    }

    copyStatus.value = "Copied"
    window.setTimeout(() => {
      copyStatus.value = ""
    }, 1500)
  } catch (err) {
    console.warn("Could not copy IFRA table to clipboard.", err)
    copyStatus.value = "Copy failed"
    window.setTimeout(() => {
      copyStatus.value = ""
    }, 1500)
  }
}

// Maximum percentage of this recipe concentrate that can be used in the final product
// while keeping every IFRA row at or below its IFRA/category limit.
const maximumLevelOfUse = computed(() => {
  const candidates = rows.value
    .map((r) => {
      const pctInRecipe = num(r?.rawPct, 0)
      const limit = r?.rawLimit
      if (pctInRecipe <= 0) return null
      if (limit == null || limit === "" || !Number.isFinite(Number(limit))) return null
      return (Number(limit) / pctInRecipe) * 100
    })
    .filter(v => v != null && Number.isFinite(Number(v)))

  if (!candidates.length) return null

  return Math.max(0, Math.min(100, Math.min(...candidates)))
})

const maximumLevelExceeded = computed(() =>
  maximumLevelOfUse.value != null && maximumLevelOfUse.value < 100
)

const maximumLevelOfUseText = computed(() => {
  if (maximumLevelOfUse.value == null) return "Unrestricted"
  return Number(maximumLevelOfUse.value).toFixed(2) + "%"
})


const hasAnyExceeded = computed(() => rows.value.some(r => !!r.exceeded))
</script>


<style scoped>
.summary-copy-placeholder {
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
  max-height: 33vh;
  overflow-y: auto;
  border: 2px solid transparent;
  border-radius: 10px;
}

/* Red border when any row exceeds its limit (use Vuetify error color) */
.summary-scroll.is-exceeded{
  border-color: rgb(var(--v-theme-error));
}

.summary-scroll.is-empty :deep(thead th) {
  line-height: 1.25;
}

/* keep table full width inside scroll */
:deep(table){
  width: 100%;
}
</style>
