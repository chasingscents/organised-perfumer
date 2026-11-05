<!-- components/SelectedTable.vue -->
<template>
  <v-card class="pa-3">
    <div class="d-flex align-center justify-space-between mb-2">
      <h2 class="text-h6">Selected Ingredients</h2>

      <div class="d-flex align-center flex-wrap ga-2">
        <div class="scale-to-control">
          <label for="scale-to-grams" class="scale-to-label">Scale to:</label>
          <v-text-field
            id="scale-to-grams"
            :model-value="scaleToGrams"
            @update:model-value="updateScaleToGrams"
            type="number"
            min="0"
            max="1000000"
            step="any"
            placeholder="Enter amount"
            suffix="g"
            aria-label="Scale recipe to grams"
            density="compact"
            variant="outlined"
            hide-details
            class="scale-to-input"
          />
        </div>

        <v-btn
          size="small"
          variant="flat"
          color="btnSubtle"
          title="Separates dilutants from ingredients."
          @click="concentrateDilutions"
          :disabled="hydrated && model.length === 0"
        >
          Concentrate
        </v-btn>

        <v-btn
          size="small"
          variant="flat"
          color="btnSubtle"
          title="Combines duplicate ingredients and adjusts dilutants accordingly"
          @click="startCondense"
          :disabled="hydrated && model.length === 0"
        >
          Condense
        </v-btn>

<v-btn
          size="small"
          variant="flat"
          color="#F6E7E6"
          @click="askClear"
          :disabled="hydrated && model.length === 0"
        >
          Clear Recipe
        </v-btn>

        <v-btn
          size="small"
          color="btnSave"
          variant="flat"
          @click="openSaveDialog"
          :disabled="hydrated && model.length === 0"
        >
          Save Recipe
        </v-btn>
      </div>
    </div>

    <div class="overflow-y-auto" style="max-height: 52vh;">
      <v-table density="compact">
        <thead>
          <tr>
            <th class="text-left">Ingredient</th>
            <th class="text-right">{{ equivalentColumnHeading }}</th>
            <th class="text-right">Grams added</th>
            <th class="text-right">Dilution %</th>
            <th class="text-left">Dilutant</th>
            <th class="text-right">% of recipe</th>
            <th class="text-right">Row cost</th>
            <th class="text-center">X</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="(row, i) in model"
            :key="rowKey(row, i)"
          >
            <td>
              <div class="d-flex flex-column">
                <div class="d-flex align-center flex-wrap ga-2">
                  <button
                    type="button"
                    class="selected-ingredient-name font-weight-medium"
                    aria-haspopup="dialog"
                    :aria-label="'Ingredient information for ' + displayName(row)"
                    @click.stop="openIngredientInfo(row)"
                  >
                    {{ displayName(row) }}
                  </button>
                  <v-btn
                    v-if="row?.kind === 'accord' || row?.cas === 'ACCORD'"
                    size="x-small"
                    variant="tonal"
                    class="ml-2"
                    @click.stop="askDeconstruct(i)"
                  >
                    Deconstruct
                  </v-btn>

                </div>

                <span class="text-caption text-grey">
                  <template v-if="row.kind === 'accord'">
                    CAS: ACCORD • Saved conc: {{ accord(row)?.totalConcentrationPercent != null ? Number(accord(row).totalConcentrationPercent).toFixed(2) : "-" }}%
                  </template>
                  <template v-else>
                    CAS: {{ casDisplay(row.cas) }}<template v-if="Number(ing(row)?.concentration ?? 100) !== 100">
                      • {{ ing(row)?.concentration ?? 100 }}% • {{ ing(row)?.solvent || "-" }}
                    </template>
                  </template>
                </span>
              </div>
            </td>

            <td class="text-right equivalent-cell" style="min-width: 110px;">
              {{ equivalentGramsLabel(row) }}
            </td>

            <td class="text-right" style="width: 120px;">
              <v-text-field
                v-model.number="row.gramsAdded"
                type="number"
                min="0"
                density="compact"
                hide-details
              />
            </td>

            <td class="text-right" style="width: 120px;">
              <v-text-field
                v-model.number="row.dilution"
                type="number"
                min="0"
                max="100"
                density="compact"
                hide-details
                placeholder="-"
              />
            </td>

            <td style="width: 170px;">
              <DilutantSelect
                v-model="row.dilutant"
                v-model:custom-dilutant="row.customDilutant"
                :ingredient-map="ingredientMap"
              />
            </td>

            <td class="text-right" style="width: 120px;">
              {{ rowRecipePercent(row).toFixed(4) }}%
            </td>

            <td class="text-right">
              {{ rowCost(row).toFixed(4) }}
            </td>

            <td class="text-center" style="width: 150px;">
              <v-btn
                icon="mdi-close"
                size="x-small"
                variant="text"
                @click="askDelete(i)"
              />
            </td>
          </tr>

          <tr v-if="model.length === 0">
            <td colspan="8" class="text-center text-grey py-4">
              No ingredients selected.
            </td>
          </tr>
        </tbody>
      </v-table>
    </div>


    <IngredientInfoDialog
      v-model="ingredientInfoDialog"
      :ingredient="ingredientInfoItem"
    />

<!-- CONDENSE: DILUTANT CHOICE -->
<v-dialog v-model="condenseDilutantDialog" max-width="560">
  <v-card>
    <v-card-title class="text-h6">Condense duplicates</v-card-title>
    <v-card-text>
      <div class="mb-2">
        Duplicate ingredients were found with different <strong>dilutants</strong>.
        Choose which dilutant to keep for the merged row.
      </div>

      <v-select
        v-model="condenseChosenOption"
        :items="condenseDilutantOptions"
        item-title="label"
        item-value="value"
        label="Dilutant to keep"
        density="compact"
      />

      <v-alert
        v-if="condenseError"
        type="error"
        variant="tonal"
        density="compact"
        class="mt-3"
      >
        {{ condenseError }}
      </v-alert>
    </v-card-text>

    <v-card-actions class="modal-actions-split">
      <v-btn variant="text" @click="cancelCondense">Cancel</v-btn>
      <v-spacer />
      <v-btn color="primary" @click="confirmCondenseChoice">Continue</v-btn>
    </v-card-actions>
  </v-card>
</v-dialog>

    <!-- DECONSTRUCT CONFIRM -->
    <v-dialog v-model="deconstructDialog" max-width="520">
      <v-card>
        <v-card-title class="text-h6">Deconstruct accord?</v-card-title>
        <v-card-text>
          <div>
            This will separate any added dilutant first, then replace the remaining accord with its
            component ingredients, scaled to the undiluted accord amount.
          </div>

          <v-alert
            v-if="deconstructWarnMissingDilutant"
            type="warning"
            variant="tonal"
            density="compact"
            class="mt-3"
          >
            You have entered a DILUTION but no DILUTANT. Ethanol will be used as the default if you continue.
          </v-alert>

          <v-alert
            v-if="deconstructError"
            type="error"
            variant="tonal"
            density="compact"
            class="mt-3"
          >
            {{ deconstructError }}
          </v-alert>
        </v-card-text>

        <v-card-actions class="modal-actions-split">
          <v-btn variant="text" @click="cancelDeconstruct">Cancel</v-btn>
          <v-spacer />
          <v-btn color="btnConfirm" @click="confirmDeconstruct">Deconstruct</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- DELETE CONFIRM -->
    <v-dialog v-model="deleteDialog" max-width="420">
      <v-card>
        <v-card-title class="text-h6">Remove ingredient?</v-card-title>
        <v-card-text>
          This will remove the selected row from the recipe.
        </v-card-text>
        <v-card-actions class="modal-actions-split">
          <v-btn variant="text" @click="deleteDialog = false">Cancel</v-btn>
          <v-spacer />
          <v-btn color="red" @click="confirmDelete">Remove</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- CLEAR CONFIRM -->
    <v-dialog v-model="clearDialog" max-width="420">
      <v-card>
        <v-card-title class="text-h6">Clear recipe?</v-card-title>
        <v-card-text>
          This will remove all rows from Selected Ingredients.
        </v-card-text>
        <v-card-actions class="modal-actions-split">
          <v-btn variant="text" @click="clearDialog = false">Cancel</v-btn>
          <v-spacer />
          <v-btn color="red" @click="confirmClear">Clear</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- SAVE RECIPE DIALOG -->
    <v-dialog v-model="saveDialog" max-width="520" :persistent="isSavingRecipe">
      <v-card>
        <v-card-title class="text-h6">Save Recipe to Accords</v-card-title>

        <v-card-text>
          <v-text-field
            v-model="recipeName"
            :disabled="isSavingRecipe"
            label="Recipe name"
            placeholder="e.g. Fresh Citrus Accord"
            variant="outlined"
            density="comfortable"
            autofocus
          />
          <div class="text-caption text-grey">
            This will add a new entry to the Accords table (not download a file).
          </div>
        </v-card-text>

        <v-card-actions class="modal-actions-split flex-wrap">
          <v-alert v-if="recipeSaveError" type="error" variant="tonal" density="compact" class="save-error-alert" role="alert">
            {{ recipeSaveError }}
          </v-alert>
          <v-btn variant="text" :disabled="isSavingRecipe" @click="saveDialog = false">Cancel</v-btn>
          <v-spacer />
          <v-btn color="primary" :loading="isSavingRecipe" :disabled="isSavingRecipe || (hydrated && !recipeName.trim())" @click="confirmSave">
            Add to Accords
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup>
import { ref, computed, onMounted } from "vue"
import { resolveIngredientReference } from "@/utils/ingredientReferences.js"
import IngredientInfoDialog from "@/components/IngredientInfoDialog.vue"

// ✅ You said you moved this into utils/allergenIFRAHelpers.js
// Assumption: it exports a named function `buildAccordIfraAndAllergenLists`
// and it needs access to ingredientMap/accordMap to resolve & expand.
import { buildAccordIfraAndAllergenLists } from "@/utils/allergenIFRAHelpers.js"
import DilutantSelect from "@/components/DilutantSelect.vue"
import { DEFAULT_DILUTANT_CODES, matchedDilutantComposition, useDilutants } from "@/composables/useDilutants.js"
import { createRecipeCostCalculator } from "@/utils/recipeCostHelpers.js"

const props = defineProps({
  modelValue: { type: Array, required: true },
  ingredientMap: { type: Object, required: true }, // keyed by ingredient.key (NOT CAS)
  accordMap: { type: Object, required: true } // keyed by accord.id
})

const emit = defineEmits(["update:modelValue", "save-accord", "clear"])


const hydrated = ref(false)
onMounted(() => {
  hydrated.value = true
})


const model = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v)
})

// Display-only scaling: never change gramsAdded or the saved recipe.
const scaleToGrams = ref(null)
const MAX_SCALE_GRAMS = 1_000_000

function updateScaleToGrams(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    scaleToGrams.value = null
    return
  }

  const amount = Number(value)
  if (!Number.isFinite(amount)) return
  scaleToGrams.value = Math.max(0, Math.min(MAX_SCALE_GRAMS, amount))
}

function formatScaleGrams(value) {
  // Up to six decimal places, without trailing zeroes.
  return Number(value.toFixed(6)).toString()
}

const equivalentColumnHeading = computed(() =>
  scaleToGrams.value === null
    ? "Scaled amount"
    : `${formatScaleGrams(scaleToGrams.value)}g Equivalent`
)

// Total recipe grams (as entered by the user, i.e. including any dilution solvent)
const totalRecipeGrams = computed(() =>
  model.value.reduce((s, r) => s + num(r?.gramsAdded, 0), 0)
)

function equivalentGramsLabel(row) {
  if (scaleToGrams.value === null || totalRecipeGrams.value <= 0) return "-"

  const rowGrams = num(row?.gramsAdded, 0)
  const equivalent = (rowGrams / totalRecipeGrams.value) * scaleToGrams.value
  return `${formatScaleGrams(equivalent)} g`
}

const { dilutants, dilutantOptions } = useDilutants()

const costCalculator = computed(() => createRecipeCostCalculator({
  ingredientMap: props.ingredientMap,
  accordMap: props.accordMap,
  dilutants: dilutants.value
}))

function ingredientKeyFor(ingredient) {
  if (!ingredient) return null

  const entries = Object.entries(props.ingredientMap || {})
  const found = entries.find(([, value]) => value === ingredient)
  if (found) return found[0]

  return String(ingredient?.key || ingredient?.id || primaryCas(ingredient?.cas) || "").trim() || null
}

function dilutantCodeForRow(row) {
  return costCalculator.value.dilutantCodeForRow(row)
}

function dilutantSettingForRow(row) {
  return costCalculator.value.dilutantSettingForRow(row)
}

function resolveDilutantIngredient(row) {
  return costCalculator.value.resolveDilutantIngredient(row)
}

function roundGrams(v) {
  const n = Number(v)
  return Number.isFinite(n) ? Number(n.toFixed(6)) : 0
}


/* ---------------- CONDENSE DUPLICATES ---------------- */
const condenseDilutantDialog = ref(false)
const condenseDilutantOptions = ref([]) // [{label, value:{dilutant, customDilutant}}]
const condenseChosenOption = ref(null)
const condenseError = ref("")
const condenseQueue = ref([]) // pending merge groups (each contains original indices)
const condensePending = ref(null) // { rows:[{i,row}], options:[{dilutant,customDilutant}] }

function normStr(v) {
  return String(v || "").trim().toLowerCase()
}

function casArray(v) {
  if (Array.isArray(v)) return v.map(x => String(x || "").trim()).filter(Boolean)
  const s = String(v || "").trim()
  return s ? [s] : []
}

function casDisplay(v) {
  const arr = casArray(v)
  return arr.length ? arr.join(", ") : "-"
}

function primaryCas(v) {
  return casArray(v)[0] || ""
}

function rowNameForCondense(row) {
  return normStr(row?.name || ing(row)?.name || displayName(row))
}

function rowCasForCondense(row) {
  return primaryCas(row?.cas).toUpperCase()
}

function buildDilutantOptionFromRow(row) {
  if (row?.dilutant === "Other") {
    const c = sanitizeAlphaNum(row?.customDilutant || "")
    return { dilutant: "Other", customDilutant: c || null }
  }
  return { dilutant: row?.dilutant || null, customDilutant: null }
}

function dilutantLabel(opt) {
  if (!opt) return "-"
  if (opt.dilutant === "Other") return opt.customDilutant ? opt.customDilutant : "Other"
  return opt.dilutant || "-"
}

function computeMergedDilutionPercent(rows) {
  const totalG = rows.reduce((s, r) => s + num(r?.gramsAdded, 0), 0)
  if (totalG <= 0) return 100
  const baseG = rows.reduce((s, r) => {
    const g = num(r?.gramsAdded, 0)
    const d = r?.dilution == null || r?.dilution === "" ? 100 : num(r?.dilution, 100)
    const frac = Math.max(0, Math.min(1, d / 100))
    return s + g * frac
  }, 0)
  return Math.max(0, Math.min(100, (baseG / totalG) * 100))
}

function findCondenseGroups() {
  const groups = new Map()
  model.value.forEach((row, idx) => {
    const name = rowNameForCondense(row)
    const cas = rowCasForCondense(row)
    if (!name || !cas) return
    const key = cas + "||" + name
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(idx)
  })
  return [...groups.values()].filter(g => g.length > 1)
}

function startCondense() {
  condenseError.value = ""
  const groups = findCondenseGroups()
  if (groups.length === 0) return

  // Queue groups of indices (sorted)
  condenseQueue.value = groups.map(indices => indices.slice().sort((a, b) => a - b))
  processNextCondenseGroup()
}

function processNextCondenseGroup() {
  if (condenseQueue.value.length === 0) {
    condensePending.value = null
    return
  }

  const indices = condenseQueue.value.shift()
  const rows = indices
    .map(i => ({ i, row: model.value[i] }))
    .filter(x => x.row != null)

  if (rows.length < 2) {
    processNextCondenseGroup()
    return
  }

  const unique = new Map()
  for (const { row } of rows) {
    const opt = buildDilutantOptionFromRow(row)
    const k = (opt.dilutant || "") + "::" + (opt.customDilutant || "")
    unique.set(k, opt)
  }

  condensePending.value = { rows, options: [...unique.values()] }

  if (condensePending.value.options.length <= 1) {
    applyCondenseMerge(condensePending.value.options[0] || { dilutant: null, customDilutant: null })
    condensePending.value = null
    processNextCondenseGroup()
    return
  }

  condenseDilutantOptions.value = condensePending.value.options.map(opt => ({
    label: dilutantLabel(opt),
    value: opt
  }))
  condenseChosenOption.value = condenseDilutantOptions.value[0]?.value || null
  condenseDilutantDialog.value = true
}

function cancelCondense() {
  condenseDilutantDialog.value = false
  condenseQueue.value = []
  condensePending.value = null
  condenseChosenOption.value = null
}

function confirmCondenseChoice() {
  condenseError.value = ""
  const pending = condensePending.value
  if (!pending) {
    condenseDilutantDialog.value = false
    return
  }
  const choice = condenseChosenOption.value
  if (!choice) {
    condenseError.value = "Please choose a dilutant."
    return
  }
  condenseDilutantDialog.value = false
  applyCondenseMerge(choice)
  condensePending.value = null
  processNextCondenseGroup()
}

function applyCondenseMerge(chosenDilutant) {
  const pending = condensePending.value
  if (!pending) return

  const rows = pending.rows.map(x => x.row)
  const keepIndex = pending.rows[0].i

  const merged = { ...pending.rows[0].row } // base row keeps kind/key/accord pointers etc.
  merged.gramsAdded = rows.reduce((s, r) => s + num(r?.gramsAdded, 0), 0)
  merged.dilution = computeMergedDilutionPercent(rows)

  // Apply chosen dilutant
  merged.dilutant = chosenDilutant?.dilutant || null
  merged.customDilutant = chosenDilutant?.dilutant === "Other" ? (chosenDilutant.customDilutant || null) : null

  // Remove the other duplicates (highest index first so splices are safe)
  const toRemove = pending.rows.slice(1).map(x => x.i).sort((a, b) => b - a)

  const next = model.value.slice()
  // Update the kept row (note: if removals are before keepIndex, index would shift; keepIndex is smallest so safe)
  next[keepIndex] = merged
  for (const idx of toRemove) next.splice(idx, 1)

  model.value = next
}

function sanitizeAlphaNum(v) {
  return String(v || "").replace(/[^a-z0-9]/gi, "")
}

function num(v, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

/** dilution is % of base material kept. If null/"" => 100% */
function dilutionFrac(row) {
  const d = row?.dilution
  if (d == null || d === "") return 1
  const n = Number(d)
  if (!Number.isFinite(n)) return 1
  return Math.max(0, Math.min(1, n / 100))
}

/* Resolve ingredient from selected row (preferred by key pointer) */
function ing(row) {
  return resolveIngredientReference(row, props.ingredientMap)
}

/* Resolve accord from selected row */
function accord(row) {
  if (!row) return null
  if (row.accord && typeof row.accord === "object") return row.accord
  const id = String(row?.accordId || "").trim()
  return id ? props.accordMap?.[id] : null
}

function displayName(row) {
  if (row?.kind === "accord" || row?.cas === "ACCORD") {
    return row?.name || accord(row)?.name || "Accord"
  }
  return ing(row)?.name || row?.name || primaryCas(row?.cas) || "Ingredient"
}

/* ---------------- Shared ingredient information ---------------- */
const ingredientInfoDialog = ref(false)
const ingredientInfoRow = ref(null)
const ingredientInfoItem = computed(() => resolveIngredientInfo(ingredientInfoRow.value))

function openIngredientInfo(row) {
  ingredientInfoRow.value = row
  ingredientInfoDialog.value = true
}

function resolveIngredientInfo(row) {
  if (!row) return null

  if (row.kind === "accord" || primaryCas(row.cas).toUpperCase() === "ACCORD" || row.accordId || row.accord) {
    const entry = accord(row) || row
    return {
      ...entry,
      name: entry.name || row.name || "Accord",
      cas: "ACCORD",
      concentration: entry.totalConcentrationPercent ?? entry.concentration ?? 100
    }
  }

  return ing(row) || row
}

function rowKey(row, i) {
  return (
    String(row?.kind || primaryCas(row?.cas) || "row") +
    "::" +
    String(row?.key || row?.accordId || primaryCas(row?.cas) || "x") +
    "::" +
    i
  )
}

/* ---------- COST ---------- */
function rowCost(row) {
  return costCalculator.value.rowCost(row)
}

/* ---------- % OF RECIPE ---------- */
function rowRecipePercent(row) {
  const total = totalRecipeGrams.value
  if (total <= 0) return 0
  return (num(row?.gramsAdded, 0) / total) * 100
}


/* ---------------- CONCENTRATE ---------------- */
function makeDilutantRow(sourceRow, grams) {
  const ingredient = resolveDilutantIngredient(sourceRow)
  const setting = dilutantSettingForRow(sourceRow)
  const code = dilutantCodeForRow(sourceRow)
  const key = ingredientKeyFor(ingredient)

  return {
    id: `concentrate::dilutant::${Date.now()}::${Math.random().toString(16).slice(2)}`,
    key,
    cas: ingredient?.cas
      ? (Array.isArray(ingredient.cas) ? [...ingredient.cas] : String(ingredient.cas || ""))
      : (setting?.ingredientCas || (DEFAULT_DILUTANT_CODES.includes(code) ? code : "unknown")),
    name: ingredient?.name || setting?.ingredientName || setting?.label || code || "Dilutant",
    gramsAdded: roundGrams(grams),
    dilution: 100,
    dilutant: null,
    customDilutant: null,
    kind: null,
    accordId: null
  }
}

function concentrateDilutions() {
  const next = []
  let changed = false

  for (const row of model.value || []) {
    const g = num(row?.gramsAdded, 0)
    const d = dilutionFrac(row)

    if (g <= 0 || d >= 1) {
      next.push(row)
      continue
    }

    changed = true

    const baseGrams = g * d
    const dilutantGrams = Math.max(0, g - baseGrams)

    if (baseGrams > 0) {
      next.push({
        ...row,
        gramsAdded: roundGrams(baseGrams),
        dilution: 100,
        dilutant: null,
        customDilutant: null
      })
    }

    if (dilutantGrams > 0) {
      next.push(makeDilutantRow(row, dilutantGrams))
    }
  }

  if (changed) model.value = next
}


/* ---------------- DELETE ---------------- */
const deleteDialog = ref(false)
const pendingDeleteIndex = ref(-1)

/* ---------------- DECONSTRUCT ---------------- */
const deconstructDialog = ref(false)
const pendingDeconstructIndex = ref(-1)
const deconstructError = ref("")

function deconstructDilutionFraction(row) {
  if (row?.dilution == null || String(row.dilution).trim() === "") return 1
  return dilutionFrac(row)
}

function deconstructDilutantSelection(row) {
  const selected = String(row?.dilutant || "").trim()
  const custom = String(row?.customDilutant || "").trim()
  const isOther = selected.toLowerCase() === "other"

  if (!selected || (isOther && !custom)) {
    return { code: "ETOH", customName: null, isDefault: true }
  }

  const code = dilutantOptions.value.find(option =>
    option !== "Other" && option.toLowerCase() === selected.toLowerCase()
  )
  return code
    ? { code, customName: null, isDefault: false }
    : { code: "Other", customName: isOther ? custom : selected, isDefault: false }
}

const deconstructWarnMissingDilutant = computed(() => {
  const row = model.value?.[pendingDeconstructIndex.value]
  return deconstructDilutionFraction(row) < 1 && deconstructDilutantSelection(row).isDefault
})

function makeDeconstructDilutantRow(row, grams) {
  const selection = deconstructDilutantSelection(row)
  const sourceRow = { dilutant: selection.code, customDilutant: selection.customName }
  const dilutantRow = makeDilutantRow(sourceRow, grams)

  if (selection.customName && !resolveDilutantIngredient(sourceRow)) {
    // Custom names must not inherit another material's catalogue identity.
    dilutantRow.key = null
    dilutantRow.name = selection.customName
    dilutantRow.cas = "unknown"
  } else if (selection.code === "ETOH" && dilutantRow.cas === "ETOH") {
    // Keep ethanol identifiable even when its settings mapping is empty.
    dilutantRow.cas = "64-17-5"
  }

  return dilutantRow
}

function askDelete(i) {
  pendingDeleteIndex.value = i
  deleteDialog.value = true
}

function confirmDelete() {
  const i = pendingDeleteIndex.value
  if (i >= 0) {
    const next = model.value.slice()
    next.splice(i, 1)
    model.value = next
  }
  deleteDialog.value = false
  pendingDeleteIndex.value = -1
}

function askDeconstruct(i) {
  pendingDeconstructIndex.value = i
  deconstructError.value = ""

  deconstructDialog.value = true
}

function cancelDeconstruct() {
  deconstructDialog.value = false
  pendingDeconstructIndex.value = -1
  deconstructError.value = ""
}

function confirmDeconstruct() {
  const i = pendingDeconstructIndex.value
  const row = model.value?.[i]
  if (i < 0 || !row) {
    cancelDeconstruct()
    return
  }

  const a = accord(row)
  const items = Array.isArray(a?.items) ? a.items : []
  if (!a || items.length === 0) {
    deconstructError.value = "This accord has no component items to deconstruct."
    return
  }

  const parentGrams = num(row?.gramsAdded, 0)
  if (parentGrams <= 0) {
    deconstructError.value = "Set 'Grams added' to a value greater than 0 before deconstructing."
    return
  }

  const totalAccordGrams =
    num(a?.totalGrams, 0) > 0
      ? num(a.totalGrams, 0)
      : items.reduce((s, it) => s + num(it?.gramsAdded, 0), 0)

  if (totalAccordGrams <= 0) {
    deconstructError.value = "This accord has an invalid total grams value."
    return
  }

  const accordGrams = parentGrams * deconstructDilutionFraction(row)
  const dilutantGrams = Math.max(0, parentGrams - accordGrams)

  // Separate the added dilutant, retaining each saved component's own dilution.
  const scaledRows = items
    .filter((it) => accordGrams > 0 && num(it?.gramsAdded, 0) > 0)
    .map((it) => {
      const fraction = num(it?.gramsAdded, 0) / totalAccordGrams
      const g = accordGrams * fraction

      return {
        id: `decon::${Date.now()}::${Math.random().toString(16).slice(2)}`,
        key: it?.key ?? null,
        cas: (it?.kind === 'accord' || it?.cas === 'ACCORD') ? 'ACCORD' : (it?.cas ?? null),
        name: it?.name ?? null,
        gramsAdded: Number.isFinite(g) ? Number(g.toFixed(6)) : 0,

        dilution: it?.dilution == null || it?.dilution === "" ? 100 : num(it?.dilution, 100),
        dilutant: it?.dilutant ?? null,
        customDilutant: it?.customDilutant ?? null,

        // Preserve nested accord items (so summaries don't lose their saved allergen/IFRA lists)
        kind: it?.kind ?? null,
        accordId: it?.accordId ?? null
      }
    })

  if (accordGrams > 0 && scaledRows.length === 0) {
    deconstructError.value = "This accord has no positive component amounts to deconstruct."
    return
  }

  if (dilutantGrams > 0) {
    scaledRows.push(makeDeconstructDilutantRow(row, dilutantGrams))
  }

  const next = model.value.slice()
  next.splice(i, 1, ...scaledRows)
  model.value = next

  cancelDeconstruct()
}


/* ---------------- CLEAR ---------------- */
const clearDialog = ref(false)

function askClear() {
  clearDialog.value = true
}

function confirmClear() {
  model.value = []
  emit("clear")
  clearDialog.value = false
}

/* ---------------- SAVE ACCORD ---------------- */
const saveDialog = ref(false)
const recipeName = ref("")
const isSavingRecipe = ref(false)
const recipeSaveError = ref("")
const pendingAccordId = ref("")

function openSaveDialog() {
  if (isSavingRecipe.value) return
  recipeName.value = ""
  recipeSaveError.value = ""
  pendingAccordId.value = "accord::" + Math.random().toString(16).slice(2)
  saveDialog.value = true
}

/** Ethanol fraction in the ingredient stock itself (NOT considering user dilution) */
function ethanolFractionOfIngredientStock(ingredient) {
  // ingredient is a tincture/solution: concentration% raw, remainder is solvent
  const c = ingredient?.concentration != null ? num(ingredient.concentration, 100) : 100
  const solvent = String(ingredient?.solvent || "").toUpperCase()

  // ethanol fraction in the ingredient solution = (100 - concentration)% if solvent is ETOH
  if (solvent === "ETOH") {
    return Math.max(0, Math.min(1, (100 - c) / 100))
  }
  return 0
}

/** Ethanol fraction of the user-selected dilutant */
function ethanolFractionOfDilutant(row) {
  const d =
    row?.dilutant === "Other" ? String(row?.customDilutant || "") : String(row?.dilutant || "")
  const matched = matchedDilutantComposition(d, props.ingredientMap, dilutants.value)
  return matched ? matched.ethanol : String(d).toUpperCase() === "ETOH" ? 1 : 0
}

/**
 * Summary snapshot at SAVE time:
 * - totalGrams
 * - totalIngredientGrams (raw material only; accords use their saved concentration%)
 * - totalConcentrationPercent
 * - totalEtohPercent (correctly bounded 0..100)
 * - totalCost / costPerGram (current using your dilution cost rule)
 */
function calcSummarySnapshot() {
  const totalGrams = model.value.reduce((s, r) => s + num(r?.gramsAdded, 0), 0)
  if (totalGrams <= 0) {
    return {
      totalGrams: 0,
      totalIngredientGrams: 0,
      totalConcentrationPercent: 0,
      totalEtohPercent: 0,
      totalCost: 0,
      costPerGram: 0
    }
  }

  let totalCost = 0
  let totalIngredientGrams = 0
  let etohGrams = 0

  for (const row of model.value) {
    const g = num(row?.gramsAdded, 0)
    if (g <= 0) continue

    totalCost += rowCost(row)

    const dFrac = dilutionFrac(row) // fraction that remains “base material”
    const baseGrams = g * dFrac
    const dilutantGrams = g * (1 - dFrac)

    // ------- ACCORD ROW -------
    if (row?.kind === "accord" || row?.cas === "ACCORD") {
      const a = accord(row)

      // Ingredient grams: use saved totalConcentrationPercent if present
      const concPct = a?.totalConcentrationPercent != null ? num(a.totalConcentrationPercent, 0) : 0
      totalIngredientGrams += baseGrams * Math.max(0, Math.min(100, concPct)) / 100

      // Ethanol: use saved totalEtohPercent if present, else 0 (AccordsTable can recalc later if needed)
      const etohPct = a?.totalEtohPercent != null ? num(a.totalEtohPercent, 0) : 0
      etohGrams += baseGrams * Math.max(0, Math.min(100, etohPct)) / 100

      // plus ethanol from added dilutant (outside the accord)
      etohGrams += dilutantGrams * ethanolFractionOfDilutant(row)

      continue
    }

    // ------- NORMAL INGREDIENT ROW -------
    const i = ing(row)

    // raw ingredient grams inside stock = baseGrams * concentration%
    const cFrac = i?.concentration != null ? Math.max(0, Math.min(1, num(i.concentration, 100) / 100)) : 1
    totalIngredientGrams += baseGrams * cFrac

    // ethanol grams:
    // - ethanol already in the ingredient stock portion (baseGrams) if solvent is ETOH
    etohGrams += baseGrams * ethanolFractionOfIngredientStock(i)

    // - ethanol from user-added dilutant portion
    etohGrams += dilutantGrams * ethanolFractionOfDilutant(row)
  }

  const totalConcentrationPercent = (totalIngredientGrams / totalGrams) * 100
  const totalEtohPercent = (etohGrams / totalGrams) * 100
  const costPerGram = totalCost / totalGrams

  return {
    totalGrams,
    totalIngredientGrams,
    totalConcentrationPercent,
    totalEtohPercent,
    totalCost,
    costPerGram
  }
}

async function saveAccordToAccordsJson(accord) {
  const result = await $fetch("/api/accords", {
    method: "POST",
    body: {
      mode: "append",
      key: accord.id,
      accord,
      recipeName: accord.name,
      recipe: accord,
      items: accord.items || []
    }
  })
  if (result?.ok !== true) throw new Error("The recipe save was not confirmed.")
  return result
}

async function confirmSave() {
  const name = recipeName.value.trim()
  if (isSavingRecipe.value || !name) return
  isSavingRecipe.value = true
  recipeSaveError.value = ""
  if (!pendingAccordId.value) pendingAccordId.value = "accord::" + Math.random().toString(16).slice(2)

  try {
    const snap = calcSummarySnapshot()
    const dateSaved = new Date().toISOString().slice(0, 10)

    // ✅ Save accord items (ids by index; dilution defaults to 100)
    const items = model.value.map((row, idx) => ({
      id: idx + 1,
      key: row?.key ?? null,
      cas: Array.isArray(row?.cas) ? [...row.cas] : String(row?.cas || ""),
      name: ing(row)?.name || row?.name || "",
      gramsAdded: num(row?.gramsAdded, 0),
      dilution: row?.dilution == null || row?.dilution === "" ? 100 : num(row?.dilution, 100),
      dilutant: row?.dilutant || null,
      customDilutant: row?.customDilutant ? sanitizeAlphaNum(row.customDilutant) : null,

      // preserve accord pointers if you use them elsewhere
      kind: row?.kind || null,
      accordId: row?.accordId || null
    }))

    // ✅ Pre-collate allergenList & ifraList for the accord
    // IMPORTANT: pass maps, so helper can resolve keys + expand nested accords/mixtures.
    // If your helper signature differs, update this call accordingly.
    // Resolve matched carriers as ordinary stock rows for the saved breakdowns.
    const breakdownRows = model.value.flatMap(row => {
      if (!resolveDilutantIngredient(row)) return [row]
      const grams = num(row.gramsAdded, 0)
      const base = grams * dilutionFrac(row)
      if (grams <= base) return [row]
      return [
        ...(base > 0 ? [{ ...row, gramsAdded: base, dilution: 100, dilutant: null, customDilutant: null }] : []),
        makeDilutantRow(row, grams - base)
      ]
    })
    const { allergenList, ifraList, totalEtohPercent } = buildAccordIfraAndAllergenLists(breakdownRows, {
      ingredientMap: props.ingredientMap,
      accordMap: props.accordMap
    })

    const savedAccord = {
      id: pendingAccordId.value,
      cas: "MIXTURE",
      type: "ACCORD",
      name,
      dateSaved,

      items,

      // ✅ snapshot fields (includes totalEtohPercent)
      totalGrams: snap.totalGrams,
      totalIngredientGrams: snap.totalIngredientGrams,
      totalConcentrationPercent: snap.totalConcentrationPercent,
      totalEtohPercent: snap.totalEtohPercent,
      totalCost: snap.totalCost,
      costPerGram: snap.costPerGram,

      // ✅ stored rollups
      allergenList: Array.isArray(allergenList) ? allergenList : [],
      ifraList: Array.isArray(ifraList) ? ifraList : []
    }

    await saveAccordToAccordsJson(savedAccord)
    emit("save-accord", savedAccord)

    saveDialog.value = false
  } catch (err) {
    recipeSaveError.value = "Could not confirm the save. Your recipe is still here. Please try again."
    console.error("Could not save recipe.", err)
  } finally {
    isSavingRecipe.value = false
  }
}
</script>

<style scoped>
.selected-ingredient-name {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  text-decoration: underline dotted;
  text-underline-offset: 3px;
}

.selected-ingredient-name:hover {
  text-decoration-style: solid;
}

.selected-ingredient-name:focus-visible {
  outline: 2px solid rgb(var(--v-theme-btnActive, 71, 74, 19));
  outline-offset: 3px;
}

.save-error-alert {
  flex: 1 0 100%;
  width: 100%;
}

.v-btn.v-btn--disabled {
  opacity: 0.26 !important;
}

.scale-to-control {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

.scale-to-label {
  white-space: nowrap;
  font-size: 0.875rem;
}

.scale-to-input {
  width: 160px;
  flex: 0 0 160px;
}

.equivalent-cell {
  white-space: nowrap;
}
</style>
