<!-- pages/ingredient-organiser.vue -->
<template>
  <v-container fluid class="organiser-page">
    <div class="organiser-layout" :class="{ 'is-left-collapsed': isLeftSectionHidden }">
      <!-- LEFT COLUMN -->
      <div class="organiser-left-section">
        <section
          id="ingredient-and-accord-tables"
          :aria-hidden="isLeftSectionHidden"
          :inert="isLeftSectionHidden"
          class="organiser-left-panel"
          aria-label="Ingredients and accords"
        >
          <div class="organiser-panel-stack">
            <!-- Ingredients = 2/3 -->
            <div class="io-ingredients-pane">
              <IngredientsTable
                :items="ingredients"
                @add="addIngredient"
                @show-info="openInfo"
                @show-ifra="openIfraNotes"
                @create-ingredient="createIngredient"
                @update-ingredient="updateIngredient"
                @delete-ingredient="deleteIngredientFromState"
                @load-ingredients="onLoadIngredients"
                style="height: 100%;"/>
            </div>

            <!-- Accords = 1/3 -->
            <div class="io-accords-pane">
              <AccordsTable
                v-model:accords="accords"
                :ingredient-map="ingredientMap"
                @add-accord="addAccordToSelected"
              />
            </div>
          </div>
        </section>

        <button
          type="button"
          class="organiser-section-toggle"
          :aria-expanded="!isLeftSectionHidden"
          aria-controls="ingredient-and-accord-tables"
          :aria-label="isLeftSectionHidden ? 'Expand ingredient and accord tables' : 'Collapse ingredient and accord tables'"
          :title="isLeftSectionHidden ? 'Expand ingredient and accord tables' : 'Collapse ingredient and accord tables'"
          @click="isLeftSectionCollapsed = !isLeftSectionCollapsed"
        >
          <v-icon class="organiser-toggle-chevron" icon="mdi-chevron-left" size="22" />
        </button>
      </div>

      <!-- RIGHT COLUMN -->
      <section class="organiser-right-panel" aria-label="Recipe summaries and selected ingredients">
        <div class="organiser-panel-stack">
          <!-- Four independent summary columns. -->
          <v-row dense class="organiser-summaries" style="flex: 0 0 auto;">
            <v-col cols="12" md="3">
              <RecipeSummary
                :items="selectedIngredients"
                :ingredient-map="ingredientMap"
                :accord-map="accordMap"
              />
            </v-col>

            <v-col cols="12" md="3">
              <AllergenSummary
                :items="selectedIngredients"
                :ingredient-map="ingredientMap"
                :accord-map="accordMap"
                v-model="allergenMode"
              />
            </v-col>

            <v-col cols="12" md="3">
              <IFRASummary
                :items="selectedIngredients"
                :ingredient-map="ingredientMap"
                :accord-map="accordMap"
                :ifra-map="ifraMapByCas"
                category-field="categoryFour"
              />
            </v-col>
            <v-col cols="12" md="3">
              <GHSSummary
                :items="selectedIngredients"
                :ingredient-map="ingredientMap"
                :accord-map="accordMap"
              />
            </v-col>
          </v-row>

          <!-- Selected fills remaining space -->
          <div class="organiser-selected-pane">
            <SelectedTable
              v-model="selectedIngredients"
              :ingredient-map="ingredientMap"
              :accord-map="accordMap"
              @save-accord="addAccord"
            />
          </div>
        </div>
      </section>
    </div>

    <!-- INFO MODAL -->
    <v-dialog v-model="showInfoModal" max-width="750">
      <v-card>
        <v-card-title class="text-h6">
          {{ infoItem?.name }}
        </v-card-title>

        <v-card-text>
          <div class="d-flex flex-column ga-4">
            <div>
              <h3 class="text-subtitle-2 mb-2">Basic Information</h3>
              <v-table density="compact">
                <tbody>
                  <tr><td class="font-weight-medium">CAS</td><td>{{ infoItem?.cas || "-" }}</td></tr>
                  <tr><td class="font-weight-medium">Concentration</td><td>{{ infoItem?.concentration ?? 100 }}%</td></tr>
                  <tr><td class="font-weight-medium">Solvent</td><td>{{ infoItem?.solvent || "-" }}</td></tr>
                  <tr><td class="font-weight-medium">Supplier</td><td>{{ infoItem?.supplier || "-" }}</td></tr>
                  <tr><td class="font-weight-medium">Manufacturer</td><td>{{ infoItem?.manufacturer || "-" }}</td></tr>
                  <tr><td class="font-weight-medium">Strength</td><td>{{ infoItem?.strength || "-" }}</td></tr>
                  <tr><td class="font-weight-medium">Tenacity</td><td>{{ infoItem?.tenacity ?? "-" }}</td></tr>
                </tbody>
              </v-table>
            </div>

            <div v-if="infoItem?.description">
              <h3 class="text-subtitle-2 mb-2">Description</h3>
              <div class="text-body-2" style="white-space: pre-line;">
                {{ infoItem.description }}
              </div>
            </div>

            <div v-if="Array.isArray(infoItem?.tags) && infoItem.tags.length">
              <h3 class="text-subtitle-2 mb-2">Tags</h3>
              <div class="d-flex flex-wrap ga-2">
                <v-chip
                  v-for="t in infoItem.tags"
                  :key="t"
                  color="primary"
                  variant="tonal"
                  size="small"
                >
                  {{ t }}
                </v-chip>
              </div>
            </div>

            <div v-if="Array.isArray(infoItem?.allergenList) && infoItem.allergenList.length">
              <h3 class="text-subtitle-2 mb-2">Allergen Breakdown</h3>
              <v-table density="compact">
                <thead>
                  <tr><th class="text-left">Allergen</th><th class="text-right">%</th></tr>
                </thead>
                <tbody>
                  <tr v-for="a in infoItem.allergenList" :key="a.name || a.cas">
                    <td>{{ a.name || "-" }}</td>
                    <td class="text-right">
                      {{
                        Number(a.concentration ?? a.quantity ?? 0).toFixed(3)
                      }}%
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </div>

            <div v-if="Array.isArray(infoItem?.ifraList) && infoItem.ifraList.length">
              <h3 class="text-subtitle-2 mb-2">IFRA Composition</h3>
              <v-table density="compact">
                <thead>
                  <tr><th class="text-left">Component</th><th class="text-right">%</th></tr>
                </thead>
                <tbody>
                  <tr v-for="x in infoItem.ifraList" :key="x.cas">
                    <td>{{ x.name || x.cas }}</td>
                    <td class="text-right">
                      {{
                        Number(x.concentration ?? x.quantity ?? 0).toFixed(3)
                      }}%
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </div>

            <div v-if="Array.isArray(infoItem?.items) && infoItem.items.length">
              <h3 class="text-subtitle-2 mb-2">Mixture Items</h3>
              <v-table density="compact">
                <thead>
                  <tr>
                    <th class="text-left">Name</th>
                    <th class="text-left">CAS</th>
                    <th class="text-right">g</th>
                    <th class="text-right">Dil %</th>
                    <th class="text-left">Dilutant</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="it in infoItem.items" :key="String(it.id ?? it.key ?? it.cas)">
                    <td>{{ it.name || "-" }}</td>
                    <td>{{ it.cas || "-" }}</td>
                    <td class="text-right">{{ Number(it.gramsAdded || 0).toFixed(3) }}</td>
                    <td class="text-right">{{ it.dilution == null ? 100 : Number(it.dilution) }}</td>
                    <td>{{ it.dilutant || it.customDilutant || "-" }}</td>
                  </tr>
                </tbody>
              </v-table>
            </div>
          </div>
        </v-card-text>

        <v-card-actions class="modal-actions-split">
          <v-btn variant="text" @click="showInfoModal = false">Cancel</v-btn>
          <v-spacer />
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- IFRA MODAL (lookup from ifra51.json by CAS) -->
    <v-dialog v-model="showIfraModal" max-width="820">
      <v-card>
        <v-card-title class="text-h6">
          IFRA 51 - {{ ifraModalTitle }}
        </v-card-title>

        <v-card-text>
          <div v-if="ifraEntry">
            <div class="text-body-2 mb-3">
              <div>
                <span class="font-weight-medium">CAS:</span>
                {{ Array.isArray(ifraEntry.cas) ? ifraEntry.cas.join(", ") : "-" }}
              </div>

              <div v-if="ifraLimitText">
                <span class="font-weight-medium">Limit ({{ ifraCategoryField }}):</span>
                {{ ifraLimitText }}
              </div>

              <div>
                <span class="font-weight-medium">Recommendations:</span>
                {{ (ifraEntry.recommendation || []).join(", ") || "-" }}
              </div>
            </div>

            <v-divider class="mb-3" />

            <div v-if="ifraType === 'r'">
              <div class="font-weight-medium mb-1">Restriction notes</div>
              <div class="text-body-2" style="white-space: pre-line;">
                {{ ifraEntry.restrictionNotes || "No restriction notes available." }}
              </div>
            </div>

            <div v-else-if="ifraType === 's'">
              <div class="font-weight-medium mb-1">Specification notes</div>
              <div class="text-body-2" style="white-space: pre-line;">
                {{ ifraEntry.specificationNotes || "No specification notes available." }}
              </div>
            </div>

            <div v-else-if="ifraType === 'p'">
              <div class="font-weight-medium mb-1">Prohibition notes</div>
              <div class="text-body-2" style="white-space: pre-line;">
                {{ ifraEntry.prohibitionNotes || "No prohibition notes available." }}
              </div>
            </div>
          </div>

          <div v-else class="text-grey">
            No IFRA 51 entry found for this CAS.
          </div>
        </v-card-text>

        <v-card-actions class="modal-actions-split">
          <v-btn variant="text" @click="showIfraModal = false">Cancel</v-btn>
          <v-spacer />
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue"
import { useDisplay } from "vuetify"

import IngredientsTable from "@/components/IngredientsTable.vue"
import AccordsTable from "@/components/AccordsTable.vue"
import SelectedTable from "@/components/SelectedTable.vue"
import RecipeSummary from "@/components/RecipeSummary.vue"
import GHSSummary from "@/components/GHSSummary.vue"
import AllergenSummary from "@/components/AllergenSummary.vue"
import IFRASummary from "@/components/IFRASummary.vue"

import { repairIngredientReferences } from "@/utils/ingredientReferences.js"
import { buildAccordIfraAndAllergenLists } from "@/utils/allergenIFRAHelpers.js"

import rawIngredients from "@/assets/data/ingredients.json"
import rawIfra51 from "@/assets/data/ifra51.json"

const { mdAndUp } = useDisplay()
const isLeftSectionCollapsed = ref(false)
// Keep the desktop preference without hiding or disabling the stacked tables.
const isLeftSectionHidden = computed(() => mdAndUp.value && isLeftSectionCollapsed.value)

/* ---------------- NORMALISATION ---------------- */
function normalizeIngredient(item) {
  const cas = Array.isArray(item?.cas) ? String(item.cas[0]) : String(item?.cas || "")
  const name = Array.isArray(item?.names)
    ? String(item.names[0] || "Unknown")
    : String(item?.name ?? item?.names?.[0] ?? "Unknown")

  // ✅ key must be stable & unique to avoid MIXTURE collisions
  const key =
    String(item?.key || item?.id || `${cas}::${name}`)

  return {
    ...item,
    key,
    cas,
    name,
    concentration: item?.concentration ?? 100,
    allergenList: Array.isArray(item?.allergenList) ? item.allergenList : [],
    ifraList: Array.isArray(item?.ifraList) ? item.ifraList : [],
    items: Array.isArray(item?.items) ? item.items : []
  }
}

/* ✅ MUST be ref because we mutate + download */
const ingredients = ref(
  (Array.isArray(rawIngredients) ? rawIngredients : []).map(normalizeIngredient))

const ING_STORE_KEY = "ingredientOrganiser.ingredients.v1"
const ING_STORE_META_KEY = "ingredientOrganiser.ingredients.meta.v1"

function ingredientIdentityValues(item) {
  const out = []

  for (const v of [item?.key, item?.id, item?.cas, item?.name]) {
    const s = String(v ?? "").trim()
    if (s && !out.includes(s)) out.push(s)
  }

  return out
}

function ingredientCollectionSignature(list) {
  const arr = (Array.isArray(list) ? list : [])
    .map((item) => ingredientIdentityValues(normalizeIngredient(item)).join("::"))
    .filter(Boolean)
    .sort()

  return JSON.stringify(arr)
}

const RAW_INGREDIENTS_SIGNATURE = ingredientCollectionSignature(rawIngredients)

function clearLegacyIngredientCache() {
  try {
    if (typeof window === "undefined") return
    window.localStorage.removeItem(ING_STORE_META_KEY)
  } catch (e) {
    // ignore quota / privacy mode
  }
}

function persistIngredients() {
  try {
    if (typeof window === "undefined") return
    window.localStorage.setItem(ING_STORE_KEY, JSON.stringify({
      baseSignature: RAW_INGREDIENTS_SIGNATURE,
      items: ingredients.value || []
    }))
  } catch (e) {
    // ignore quota / privacy mode
  }
}

// Load saved ingredients from localStorage only if it was created against the
// same bundled ingredients.json. This prevents deleted file entries being
// resurrected from stale browser storage after Vite reloads.
onMounted(() => {
  try {
    const raw = window.localStorage.getItem(ING_STORE_KEY)
    if (!raw) return

    const parsed = JSON.parse(raw)

    // Old versions stored a raw array with no source signature. That format is
    // now treated as stale and removed, because it can contain deleted rows.
    if (Array.isArray(parsed)) {
      window.localStorage.removeItem(ING_STORE_KEY)
      clearLegacyIngredientCache()
      return
    }

    if (parsed?.baseSignature !== RAW_INGREDIENTS_SIGNATURE) {
      window.localStorage.removeItem(ING_STORE_KEY)
      clearLegacyIngredientCache()
      return
    }

    if (Array.isArray(parsed?.items) && parsed.items.length) {
      ingredients.value = parsed.items.map(normalizeIngredient)
    }
  } catch (e) {
    try {
      window.localStorage.removeItem(ING_STORE_KEY)
      clearLegacyIngredientCache()
    } catch (_) {
      // ignore
    }
  }
})

// Keep storage in sync, but with the source signature above.
watch(ingredients, () => persistIngredients(), { deep: true })
/* ---------------- INGREDIENT LOAD (from uploaded JSON) ---------------- */
function onLoadIngredients(payload) {
  // payload can be an array or { items: [...] }
  const arr = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.items)
      ? payload.items
      : []
  ingredients.value = arr.map(normalizeIngredient)
  persistIngredients()
}

/* ✅ ingredientMap keyed by ingredient.key */
const ingredientMap = computed(() => {
  const map = {}

  for (const ing of ingredients.value || []) {
    // map by id (your accord items use this, e.g. "81")
    if (ing?.id != null && String(ing.id).trim()) {
      map[String(ing.id).trim()] = ing
    }

    // map by cas (fallback and solvent resolution via Object.values still works too)
    if (ing?.cas && String(ing.cas).trim()) {
      map[String(ing.cas).trim()] = ing
    }

    // map by key if you have it (optional)
    if (ing?.key != null && String(ing.key).trim()) {
      map[String(ing.key).trim()] = ing
    }
  }

  return map
})

/* ---------------- IFRA 51 MAP (CAS KEY) ---------------- */
const ifraMapByCas = computed(() => {
  const map = {}
  const arr = Array.isArray(rawIfra51) ? rawIfra51 : []

  for (const entry of arr) {
    const casList = Array.isArray(entry?.cas) ? entry.cas : []
    for (const cas of casList) {
      const key = String(cas || "").trim()
      if (!key) continue
      map[key] = entry
    }
  }
  return map
})

/* ---------------- CREATE INGREDIENT ---------------- */
function createIngredient(newIng) {
  // IngredientsTable already validated; keep a light guard anyway
  const casKey = String(newIng?.cas || "").trim()
  const name = String(newIng?.name || "").trim()
  if (!casKey || !name) return

  // If user adds same CAS again, allow it ONLY if key differs (MIXTURE can collide on CAS).
  // But for normal CAS you probably want to block duplicates; if you want strict blocking, uncomment the next block.
  /*
  if (ingredients.value.some((x) => String(x?.cas) === casKey && String(x?.name).trim() === name)) {
    alert("An ingredient with this CAS+name already exists.")
    return
  }
  */

  // Ensure a truly unique key if needed
  const maybeKey = String(newIng?.key || newIng?.id || `${casKey}::${name}`)
  const keyExists = ingredients.value.some((x) => String(x?.key) === maybeKey)
  const finalKey = keyExists ? `${maybeKey}::${Date.now()}` : maybeKey

  ingredients.value = ingredients.value.concat([
    normalizeIngredient({ ...newIng, key: finalKey })
  ])
  persistIngredients()
}

/* ---------------- UPDATE INGREDIENT ---------------- */
function updateIngredient(payload) {
  const key = String(payload?.key ?? "").trim()
  const updated = payload?.updated || payload?.updatedIngredient || payload?.item || payload
  if (!key || !updated) return

  const idx = (ingredients.value || []).findIndex((x) => String(x?.key || x?.id || "").trim() === key || String(x?.id || "").trim() === key)
  if (idx === -1) return

  const merged = normalizeIngredient({ ...ingredients.value[idx], ...updated, key: ingredients.value[idx].key })
  const next = ingredients.value.slice()
  next.splice(idx, 1, merged)
  ingredients.value = next
  persistIngredients()
}

/* ---------------- DELETE INGREDIENT FROM UI STATE ---------------- */
function normIdentity(v) {
  return String(v ?? "").trim().toLowerCase()
}

function identitySetFromDeletePayload(payload) {
  const keys = [
    payload?.key,
    payload?.id,
    payload?.cas,
    payload?.name,
    ...(Array.isArray(payload?.keys) ? payload.keys : []),
    ...(payload?.ingredient ? ingredientIdentityValues(payload.ingredient) : [])
  ]
    .flatMap((v) => Array.isArray(v) ? v : [v])
    .map(normIdentity)
    .filter(Boolean)

  return new Set(keys)
}

function ingredientMatchesIdentitySet(item, idSet) {
  if (!idSet?.size) return false
  return ingredientIdentityValues(item).some((v) => idSet.has(normIdentity(v)))
}

function selectedRowMatchesDeletedIngredient(row, idSet) {
  if (!idSet?.size || row?.kind === "accord" || String(row?.cas || "").toUpperCase() === "ACCORD") return false

  const identities = [row?.key, row?.id, row?.cas, row?.name]
    .flatMap((v) => Array.isArray(v) ? v : [v])
    .map(normIdentity)
    .filter(Boolean)

  return identities.some((v) => idSet.has(v))
}

function deleteIngredientFromState(payload) {
  const idSet = identitySetFromDeletePayload(payload)
  if (!idSet.size) return

  const nextIngredients = (ingredients.value || []).filter((item) => !ingredientMatchesIdentitySet(item, idSet))
  const nextSelected = (selectedIngredients.value || []).filter((row) => !selectedRowMatchesDeletedIngredient(row, idSet))

  ingredients.value = nextIngredients
  selectedIngredients.value = nextSelected
  persistIngredients()
}


/* ---------------- SELECTED RECIPE ---------------- */
const selectedIngredients = ref([])

const SELECTED_INGREDIENTS_STORE_KEY = "ingredientOrganiser.selectedIngredients.v1"

onMounted(() => {
  if (typeof window === "undefined") return

  try {
    const raw = window.localStorage.getItem(SELECTED_INGREDIENTS_STORE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    if (Array.isArray(parsed) && parsed.length) {
      selectedIngredients.value = parsed
    }
  } catch (err) {
    console.warn("Could not restore selected ingredients from localStorage.", err)
  }
})

watch([selectedIngredients, ingredientMap], ([rows, map]) => {
  const repaired = repairIngredientReferences(rows, map)
  if (repaired !== rows) {
    selectedIngredients.value = repaired
    return
  }
  if (typeof window === "undefined") return

  try {
    window.localStorage.setItem(SELECTED_INGREDIENTS_STORE_KEY, JSON.stringify(Array.isArray(rows) ? rows : []))
  } catch (err) {
    console.warn("Could not persist selected ingredients to localStorage.", err)
  }
}, { deep: true })


function addIngredient(item) {
  const ing = normalizeIngredient(item)

  selectedIngredients.value = selectedIngredients.value.concat([{
    key: ing.key,       // ✅ unique pointer
    cas: ing.cas,       // keep CAS for ifraMapByCas lookups
    name: ing.name,     // fallback
    gramsAdded: 0,
    dilution: null,
    dilutant: null,
    customDilutant: null
  }])
}

/* ---------------- ACCORDS LIST + MAP ---------------- */
const accords = ref([])

const accordMap = computed(() => {
  // base lookup by id
  const byId = {}
  for (const a of accords.value) {
    if (a?.id) byId[String(a.id)] = {
      ...a,
      items: repairIngredientReferences(Array.isArray(a.items) ? a.items : [], ingredientMap.value)
    }
  }

  // derived map with recomputed lists
  const out = {}
  for (const a of accords.value) {
    if (!a?.id) continue

    const items = byId[String(a.id)].items
    const { allergenList, ifraList, totalEtohPercent } =
      buildAccordIfraAndAllergenLists(items, {
        ingredientMap: ingredientMap.value,
        accordMap: byId
      })

    out[String(a.id)] = {
      ...a,
      items,
      allergenList,
      ifraList,
      totalEtohPercent
    }
  }

  return out
})

function addAccord(payload) {
  accords.value = accords.value.concat([payload])
}

/**
 * ✅ Add accord as ONE row (do not explode).
 * SelectedTable/Summaries expand internally using accordMap.
 */
function addAccordToSelected(accord) {
  if (!accord || !accord.id) return

  selectedIngredients.value = selectedIngredients.value.concat([{
    cas: "ACCORD",
    name: String(accord.name || "Accord"),
    kind: "accord",
    accordId: String(accord.id),
    gramsAdded: 0,
    dilution: null,
    dilutant: null,
    customDilutant: null
  }])
}

/* ---------------- SUMMARY MODE ---------------- */
const allergenMode = ref("full")

/* ---------------- INFO MODAL ---------------- */
const showInfoModal = ref(false)
const infoItem = ref(null)

function openInfo(item) {
  infoItem.value = normalizeIngredient(item)
  showInfoModal.value = true
}

/* ---------------- IFRA MODAL ---------------- */
const showIfraModal = ref(false)
const ifraEntry = ref(null)
const ifraType = ref("r") // 'r'|'s'|'p'
const ifraModalTitle = ref("")
const ifraCategoryField = ref("categoryFour")
const ifraLimitText = ref("")

function fmtLimit(v) {
  if (v == null || v === "" || !Number.isFinite(Number(v))) return ""
  return Number(v).toFixed(4) + "%"
}

function openIfraNotes(item, type) {
  const cas = String(item?.cas || "").trim()
  const entry = ifraMapByCas.value?.[cas] || null

  ifraEntry.value = entry
  ifraType.value = type
  ifraModalTitle.value = String(item?.name || cas || "Unknown")
  ifraCategoryField.value = "categoryFour"
  ifraLimitText.value = entry ? fmtLimit(entry[ifraCategoryField.value]) : ""
  showIfraModal.value = true
}
</script>
<style scoped>
.organiser-page {
  --organiser-body-height: calc(100dvh - var(--v-layout-top, 0px) - var(--v-layout-bottom, 0px));
  min-height: var(--organiser-body-height);
  padding: 0;
}

.organiser-layout {
  position: relative;
  display: grid;
  container-type: inline-size;
  overflow-x: clip;
  grid-template-columns: minmax(0, 5fr) 28px minmax(0, 7fr);
  row-gap: 8px;
  align-items: start;
  min-height: var(--organiser-body-height);
}

.organiser-left-section,
.organiser-right-panel {
  min-width: 0;
  min-height: 0;
  grid-row: 1;
}

.organiser-left-section {
  position: relative;
  z-index: 2;
  grid-column: 1 / 3;
  width: calc((100cqw - 28px) * 5 / 12 + 28px);
  height: var(--organiser-body-height);
  background: rgb(var(--v-theme-secondary));
  transform: translateX(0);
  transition: transform 0.6s ease-in-out;
}

.organiser-left-panel {
  width: calc(100% - 28px);
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: rgb(var(--v-theme-secondary));
  visibility: visible;
  transition: visibility 0.6s ease-in-out;
}

.organiser-right-panel {
  --right-content-width: calc((100cqw - 28px) * 7 / 12 - 8px);
  position: relative;
  z-index: 0;
  grid-column: 1 / -1;
  justify-self: end;
  width: var(--right-content-width);
  height: var(--organiser-body-height);
  overflow-x: clip;
  background: rgb(var(--v-theme-body, var(--v-theme-background, 255, 255, 255)));
  transition: width 0.6s ease-in-out;
}

.organiser-right-panel > .organiser-panel-stack {
  position: absolute;
  top: 0;
  right: 0;
  /* The tables resize smoothly with the section and stay aligned to its right edge. */
  width: 100%;
}

.organiser-panel-stack {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  gap: 16px;
  padding: 24px 16px;
}

.organiser-selected-pane {
  flex: 1;
  min-height: 0;
}

.organiser-summaries {
  min-height: 0;
  max-height: 60%;
  overflow-y: auto;
  overflow-x: hidden;
}

.organiser-left-panel > .organiser-panel-stack {
  box-sizing: border-box;
  width: 100%;
  background: rgb(var(--v-theme-secondary));
}

.organiser-section-toggle {
  position: absolute;
  z-index: 3;
  top: 0;
  bottom: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: rgb(var(--v-theme-secondary));
  color: rgb(var(--v-theme-on-secondary, var(--v-theme-on-surface, 33, 33, 33)));
  cursor: pointer;
  transition: background-color 0.6s ease-in-out;
}

.organiser-toggle-chevron {
  transform: rotate(0deg);
  transform-origin: center;
  transition: transform 0.6s ease-in-out;
}

.organiser-layout.is-left-collapsed .organiser-toggle-chevron {
  transform: rotate(180deg);
}

.organiser-section-toggle:hover {
  background: rgb(var(--v-theme-bgSubtle, 224, 225, 210));
}

.organiser-section-toggle:focus-visible {
  outline: 2px solid rgb(var(--v-theme-btnActive, 71, 74, 19));
  outline-offset: 2px;
}

.organiser-layout.is-left-collapsed {
  grid-template-columns: minmax(0, 0fr) 28px minmax(0, 12fr);
}

.organiser-layout.is-left-collapsed .organiser-left-section {
  transform: translateX(calc(28px - 100%));
}

.organiser-layout.is-left-collapsed .organiser-left-panel {
  visibility: hidden;
}

.organiser-layout.is-left-collapsed .organiser-right-panel {
  --right-content-width: calc(100cqw - 36px);
}

@media (width < 960px) {
  .organiser-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .organiser-left-section {
    grid-column: 1;
    width: 100%;
    transition: none;
  }

  .organiser-left-panel {
    width: 100%;
    transition: none;
  }

  .organiser-section-toggle {
    display: none;
  }

  .organiser-right-panel {
    --right-content-width: 100%;
    grid-column: 1;
    grid-row: 2;
    height: auto;
    transition: none;
  }

  .organiser-right-panel > .organiser-panel-stack {
    position: static;
    height: auto;
  }

  .organiser-selected-pane {
    flex: 0 0 auto;
  }

  .organiser-summaries {
    max-height: none;
    overflow: visible;
  }
}

.io-ingredients-pane{
  max-height: 66vh;
  height: 66vh;
  overflow: hidden;
  min-height: 0;
  flex: 2;
}
.io-accords-pane{
  max-height: 33vh;
  overflow-y: auto;
  min-height: 0;
  flex: 1;
}

</style>
