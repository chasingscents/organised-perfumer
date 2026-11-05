<!-- components/RecipeSummary.vue -->
<template>
  <v-card class="pa-3">
    <div class="d-flex align-center justify-space-between mb-2">
      <h2 class="text-h6">Recipe Summary</h2>
    </div>

    <v-table density="compact">
      <tbody>
        <tr v-for="row in rows" :key="row.metric">
          <template v-if="row.kind === 'costPerAmount'">
            <td class="font-weight-medium">
              <div class="d-flex align-center ga-2">
                <span>Cost per</span>
                <v-text-field
                  v-model.number="costPerAmount"
                  type="number"
                  min="1"
                  step="1"
                  density="compact"
                  variant="outlined"
                  hide-details
                  style="max-width: 90px;"
                  @blur="normaliseCostPerAmount"
                />
                <span>gram(s)</span>
              </div>
            </td>
            <td class="text-right">{{ row.value }}</td>
          </template>

          <template v-else>
            <td class="font-weight-medium">{{ row.metric }}</td>
            <td class="text-right">{{ row.value }}</td>
          </template>
        </tr>
      </tbody>
    </v-table>
  </v-card>
</template>

<script setup>
import { computed, ref } from "vue"
import { matchedDilutantComposition, useDilutants } from "@/composables/useDilutants.js"
import { createRecipeCostCalculator } from "@/utils/recipeCostHelpers.js"

const props = defineProps({
  items: { type: Array, default: () => [] },

  // ingredientMap keyed by ingredient.key
  ingredientMap: { type: Object, required: true },

  // accordMap keyed by accord.id
  accordMap: { type: Object, required: true }
})

const { dilutants } = useDilutants()

const costCalculator = computed(() => createRecipeCostCalculator({
  ingredientMap: props.ingredientMap,
  accordMap: props.accordMap,
  dilutants: dilutants.value
}))

function num(v, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

const costPerAmount = ref(30)

function normaliseCostPerAmount() {
  const n = Math.round(num(costPerAmount.value, 30))
  costPerAmount.value = Math.max(1, n)
}

/** dilution is % of mixture kept; null/"" => 100% */
function dilutionFrac(row) {
  const d = row?.dilution
  if (d == null || d === "") return 1
  const n = Number(d)
  if (!Number.isFinite(n)) return 1
  return Math.max(0, Math.min(1, n / 100))
}

function casArray(v) {
  if (Array.isArray(v)) return v.map(x => String(x || "").trim()).filter(Boolean)
  const s = String(v || "").trim()
  return s ? [s] : []
}

function casMatches(a, b) {
  const targets = new Set(casArray(b))
  return casArray(a).some(c => targets.has(c))
}

function resolveIngredientFromRow(row) {
  if (!row) return null

  const candidates = [row?.key, row?.id, row?.name]
    .map(v => String(v ?? "").trim())
    .filter(Boolean)

  for (const key of candidates) {
    if (props.ingredientMap?.[key]) return props.ingredientMap[key]
  }

  const casKeys = casArray(row?.cas)
  for (const cas of casKeys) {
    if (props.ingredientMap?.[cas]) return props.ingredientMap[cas]
  }

  const ingredients = Object.values(props.ingredientMap || {})
  if (casKeys.length) {
    const byCas = ingredients.find(ing => casKeys.some(c => casMatches(ing?.cas, c)))
    if (byCas) return byCas
  }

  const rowName = String(row?.name || "").trim().toLowerCase()
  if (rowName) {
    const byName = ingredients.find(ing => String(ing?.name || "").trim().toLowerCase() === rowName)
    if (byName) return byName
  }

  return null
}

function resolveAccordFromRow(row) {
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

/** ethanol fraction of an ingredient's own solution (solvent) */
function ethanolFractionOfIngredientMixture(ing) {
  if (!ing) return 0
  const c = ing.concentration != null ? num(ing.concentration, 100) : 100
  const solvent = String(ing.solvent || "").toUpperCase()

  // If solvent is ETOH, the non-concentrate part is ethanol
  if (solvent === "ETOH") {
    return Math.max(0, Math.min(1, (100 - c) / 100))
  }
  return 0
}

/** ethanol fraction of a row's dilutant */
function ethanolFractionOfDilutant(row) {
  const d =
    row?.dilutant === "Other"
      ? String(row?.customDilutant || "")
      : String(row?.dilutant || "")
  const matched = matchedDilutantComposition(d, props.ingredientMap, dilutants.value)
  return matched ? matched.ethanol : d.toUpperCase() === "ETOH" ? 1 : 0
}

function isAccordRow(row) {
  return row?.kind === "accord" || row?.cas === "ACCORD" || !!row?.accordId
}

function clamp01(x) {
  const n = Number(x)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

/**
 * Accumulate totals for a row (ingredient or accord), scaled by `scale`.
 * `scale` is used when walking accord.items to scale their grams into the outer usage.
 */
function accumulateRow(row, scale, acc, visitedAccords) {
  if (!row) return

  const gOuter = num(row.gramsAdded, 0) * num(scale, 1)
  if (gOuter <= 0) return

  const dOuter = dilutionFrac(row)
  const outerMixture = gOuter * dOuter
  const outerDilutant = gOuter - outerMixture

  acc.totalDilutantGrams += outerDilutant

  // outer dilutant ethanol always counts
  acc.etohGrams += outerDilutant * ethanolFractionOfDilutant(row)

  // ACCORD
  if (isAccordRow(row)) {
    const a = resolveAccordFromRow(row)
    if (!a) return

    // prevent infinite recursion if accord references itself indirectly
    const aid = String(a.id || row.accordId || row.key || row.name || "")
    if (aid) {
      if (visitedAccords.has(aid)) return
      visitedAccords.add(aid)
    }

    // Do not use saved accord summaries such as totalGrams, totalIngredientGrams,
    // totalEtohPercent, totalCost, or costPerGram. They can become stale.
    // Always recalculate from the accord's own items, including nested accords.
    const items = Array.isArray(a.items) ? a.items : []
    const accordItemsTotal = items.reduce((s, it) => s + num(it?.gramsAdded, 0), 0)

    if (accordItemsTotal <= 0 || outerMixture <= 0) {
      if (aid) visitedAccords.delete(aid)
      return
    }

    const snapshotScale = outerMixture / accordItemsTotal

    for (const it of items) {
      accumulateRow(
        {
          ...it,
          // make sure nested accord items are treated as accords too
          kind: it?.kind || (it?.cas === "ACCORD" ? "accord" : null),
          accordId: it?.accordId || null
        },
        snapshotScale,
        acc,
        visitedAccords
      )
    }

    if (aid) visitedAccords.delete(aid)
    return
  }

  // NORMAL INGREDIENT ROW
  const ing = resolveIngredientFromRow(row)
  if (!ing) return

  // for a normal ingredient row:
  // outerMixture is the amount of that ingredient-mixture used (after user dilution)
  const cFrac =
    ing.concentration != null
      ? clamp01(num(ing.concentration, 100) / 100)
      : 1

  acc.totalIngredientGrams += outerMixture * cFrac
  acc.totalDilutantGrams += outerMixture * (1 - cFrac)

  // ethanol from ingredient solvent + (inner/row) dilutant
  acc.etohGrams += outerMixture * ethanolFractionOfIngredientMixture(ing)

}

const totals = computed(() => {
  const totalGrams = (props.items || []).reduce((s, r) => s + num(r?.gramsAdded, 0), 0)

  if (totalGrams <= 0) {
    return {
      totalGrams: 0,
      totalIngredientGrams: 0,
      totalConcentrationPercent: 0,
      totalDilutantsPercent: 0,
      totalEtohPercent: 0,
      totalCostCurrent: 0,
      costPerGram: 0
    }
  }

  const acc = {
    totalIngredientGrams: 0,
    totalDilutantGrams: 0,
    etohGrams: 0
  }

  const visited = new Set()

  for (const row of props.items || []) {
    accumulateRow(row, 1, acc, visited)
  }

  const totalCostCurrent = costCalculator.value.totalCost(props.items)
  return {
    totalGrams,
    totalIngredientGrams: acc.totalIngredientGrams,
    totalConcentrationPercent: (acc.totalIngredientGrams / totalGrams) * 100,
    totalDilutantsPercent: (acc.totalDilutantGrams / totalGrams) * 100,
    totalEtohPercent: (acc.etohGrams / totalGrams) * 100,
    totalCostCurrent,
    costPerGram: totalCostCurrent / totalGrams
  }
})

const rows = computed(() => {
  const t = totals.value
  return [
    { metric: "Total grams (mixture)", value: t.totalGrams.toFixed(3) },
    { metric: "Total ingredient grams (raw)", value: t.totalIngredientGrams.toFixed(5) },
    { metric: "Total concentration %", value: t.totalConcentrationPercent.toFixed(3) + "%" },
    { metric: "Total dilutants %", value: t.totalDilutantsPercent.toFixed(3) + "%" },
    { metric: "Total cost (current)", value: "$" + t.totalCostCurrent.toFixed(2) },
    { metric: "Cost per gram (mixture)", value: "$" + t.costPerGram.toFixed(4) },
    {
      kind: "costPerAmount",
      metric: "Cost per amount",
      value: "$" + (t.costPerGram * Math.max(1, Math.round(num(costPerAmount.value, 30)))).toFixed(2)
    }
  ]
})
</script>
