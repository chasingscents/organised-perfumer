<!-- components/AccordsTable.vue -->
<template>
  <v-card class="pa-3 h-full d-flex flex-column accords-card" color="card">
    <div class="d-flex align-center justify-space-between mb-3 accords-toolbar">
      <h2 class="text-h6">Accords [{{ displayedAccords.length }}]</h2>

      <div class="d-flex ga-2">
<v-btn size="small" variant="flat" @click="openLoadDialog" color="btnImport">
          Import JSON
        </v-btn>

        <ClientOnly>
          <v-btn
            size="small"
            color="btnSave"
            variant="flat"
            :disabled="allDisplayedAccordRecords.length === 0"
            @click="openSaveDialog"
          >
            Save JSON
          </v-btn>
          <template #fallback>
            <span class="accord-save-placeholder" aria-hidden="true">Save JSON</span>
          </template>
        </ClientOnly>
      </div>
    </div>

    <div class="accords-table-scroll">
      <table class="accords-table w-100 text-body-2">
        <thead>
          <tr class="bg-grey-lighten-3">
            <th class="accord-name-col text-left py-2">Name</th>
            <th class="accord-conc-col text-right py-2">Conc %</th>
            <th class="accord-etoh-col text-right py-2">ETOH %</th>
            <th class="accord-cost-col text-right py-2">$/g</th>
            <th class="accord-date-col text-left py-2">Dated</th>
            <th class="accord-actions-col accord-actions-header text-right py-2">
              <span class="accord-actions-label">Actions</span>
            </th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="a in displayedAccords" :key="a.id" class="hover:bg-grey-lighten-4">
            <td class="accord-name-col py-1">
              <div class="d-flex flex-column">
                <span class="font-weight-medium">{{ a.name || "-" }}</span>
                <span class="text-caption text-grey">Items: {{ Array.isArray(a.items) ? a.items.length : 0 }}</span>

                <span class="mobile-accord-detail text-caption text-grey-darken-1">
                  Conc: {{ fmtPct(a.totalConcentrationPercent) }}
                </span>
                <span class="mobile-accord-detail text-caption text-grey-darken-1">
                  $/g: <span v-if="isFiniteNum(a.costPerGram)">{{ Number(a.costPerGram).toFixed(4) }}</span><span v-else>-</span>
                </span>
                <span class="mobile-accord-detail text-caption text-grey">
                  Dated: {{ formatDateDdMmYyyy(a.dateSaved || a.date) }}
                </span>
              </div>
            </td>

            <td class="accord-conc-col py-1 text-right">
              {{ fmtPct(a.totalConcentrationPercent) }}
            </td>

            <td class="accord-etoh-col py-1 text-right">
              {{ fmtPct(displayEtohPercent(a)) }}
            </td>

            <td class="accord-cost-col py-1 text-right">
              <span v-if="isFiniteNum(a.costPerGram)">{{ Number(a.costPerGram).toFixed(4) }}</span>
              <span v-else>-</span>
            </td>

            <td class="accord-date-col py-1">
              {{ formatDateDdMmYyyy(a.dateSaved || a.date) }}
            </td>

            <td class="accord-actions-col py-1 text-right">
              <div class="desktop-accord-actions">
                <v-btn size="x-small" color="btnAdd" @click.stop="$emit('add-accord', a)" variant="flat">
                  Add
                </v-btn>

                <v-btn
                  size="x-small"
                  variant="outlined"
                  class="ml-1"
                  color="btnEdit"
                  @click.stop="openEditDialog(a)"
                >
                  Edit
                </v-btn>

                <v-btn
                  icon="mdi-close"
                  size="x-small"
                  variant="text"
                  color="btnDelete"
                  @click.stop="askDeleteAccord(a)"
                />
              </div>

              <v-btn
                class="mobile-accord-actions-trigger"
                icon="mdi-dots-vertical"
                size="x-small"
                variant="tonal"
                @click.stop="openActionMenu(a)"
              />
            </td>
          </tr>

          <tr v-if="displayedAccords.length === 0">
            <td colspan="6" class="text-center py-4 text-grey">
              {{ accordSearchTerm ? "No accords match this search." : "No accords loaded/saved yet." }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>


    <!-- MOBILE ACCORD ACTIONS DIALOG -->
    <v-dialog v-model="actionMenuDialog" max-width="360">
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between text-h6">
          <span>{{ actionMenuAccord?.name || "Accord Actions" }}</span>
          <v-btn icon="mdi-close" variant="text" size="small" @click="closeActionMenu" />
        </v-card-title>

        <v-card-text>
          <div class="d-flex flex-column ga-2">
            <v-btn color="btnAdd" variant="flat" block @click="addActionMenuAccord">
              Add
            </v-btn>
            <v-btn color="btnEdit" variant="outlined" block @click="editActionMenuAccord">
              Edit
            </v-btn>
            <v-btn color="btnDelete" variant="flat" block @click="deleteActionMenuAccord">
              Delete
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- DELETE ACCORD CONFIRMATION DIALOG -->
    <v-dialog v-model="deleteDialog" max-width="520">
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between text-h6">
          <span>Delete Accord</span>
          <v-btn icon="mdi-close" variant="text" size="small" @click="cancelDeleteAccord" />
        </v-card-title>

        <v-card-text>
          Are you sure you want to delete this accord?
          <div v-if="pendingDeleteAccord?.name" class="text-caption text-grey mt-2">
            {{ pendingDeleteAccord.name }}
          </div>
        </v-card-text>

        <v-card-actions class="modal-actions-split">
          <v-btn variant="text" @click="cancelDeleteAccord">Cancel</v-btn>
          <v-spacer />
          <v-btn color="btnDelete" variant="flat" @click="confirmDeleteAccord">Confirm</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <JsonUploadDialog
      v-model="loadDialog"
      :parse-records="parseAccordImport"
      item-label="accord(s)"
      @confirm="confirmAccordImport"
    />

    <!-- SAVE DIALOG -->
    <v-dialog v-model="saveDialog" max-width="560">
      <v-card>
        <v-card-title class="text-h6">Save accords JSON</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="saveFilename"
            label="Filename"
            placeholder="accords.json"
            density="comfortable"
            hint=".json will be added if omitted"
            persistent-hint
          />
        </v-card-text>
        <v-card-actions class="modal-actions-split">
          <v-btn variant="text" @click="saveDialog = false">Cancel</v-btn>
          <v-spacer />
          <v-btn color="btnSave" variant="flat" @click="downloadAccords">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- EDIT DIALOG -->
    <v-dialog v-model="editDialog" max-width="1400">
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between text-h6">
          <span>Edit Accord</span>
          <v-btn icon="mdi-close" variant="text" size="small" @click="cancelEdit" />
        </v-card-title>
        <v-card-text>
          <v-form ref="editForm" v-model="editValid">
            <div class="edit-accord-name-date-row">
              <v-text-field
                v-model="editDraft.name"
                label="Name"
                :rules="[v => !!String(v || '').trim() || 'Name is required']"
                required
                density="comfortable"
              />

              <v-text-field
                v-model="editDraft.dateSaved"
                label="Date (optional)"
                placeholder="DD-MM-YYYY"
                density="comfortable"
              />
            </div>

            <v-textarea
              v-model="editDraft.notes"
              label="Notes (optional)"
              auto-grow
              rows="3"
              density="comfortable"
            />
          </v-form>

          <v-divider class="my-4" />

          <div class="d-flex align-center justify-space-between mb-2">
            <div class="text-subtitle-2">Ingredients / Items</div>
            <div class="d-flex ga-2">
              <div class="text-caption text-grey align-self-center">
                Total grams (computed): <b>{{ computedEditTotalGrams.toFixed(3) }}</b> g
              </div>
              <v-btn size="small" variant="tonal" @click="addEditItem">Add item</v-btn>
            </div>
          </div>

          <div class="edit-items-table-wrap">
            <table class="edit-items-table w-100 text-body-2">
              <thead>
                <tr class="bg-grey-lighten-3">
                  <th class="edit-item-ingredient-col text-left py-2">Ingredient</th>
                  <th class="edit-item-cas-col text-left py-2">CAS</th>
                  <th class="edit-item-grams-col text-right py-2">Grams</th>
                  <th class="edit-item-dilution-col text-right py-2">Dilution %</th>
                  <th class="edit-item-dilutant-col text-left py-2">Dilutant</th>
                  <th class="edit-item-actions-col text-center py-2">&nbsp;</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(it, idx) in editDraft.items" :key="it.__rowKey" class="hover:bg-grey-lighten-4">
                  <td class="py-1">
                    <v-autocomplete
                      v-model="it.key"
                      :items="ingredientOptions"
                      item-title="title"
                      item-value="value"
                      label="Ingredient"
                      density="compact"
                      hide-details
                      clearable
                      @update:modelValue="onEditItemKeyChanged(it)"
                    />
                  </td>

                  <td class="py-1">
                    <v-text-field
                      v-model="it.cas"
                      label="CAS"
                      density="compact"
                      hide-details
                      readonly
                    />
                  </td>

                  <td class="py-1 text-right">
                    <v-text-field
                      v-model.number="it.gramsAdded"
                      label="Grams"
                      type="number"
                      density="compact"
                      hide-details
                      :min="0"
                    />
                  </td>

                  <td class="py-1 text-right">
                    <v-text-field
                      v-model.number="it.dilution"
                      label="%"
                      type="number"
                      density="compact"
                      hide-details
                      :min="0"
                      :max="100"
                    />
                  </td>

                  <td class="py-1">
                    <DilutantSelect
                      v-model="it.dilutant"
                      v-model:custom-dilutant="it.customDilutant"
                      :ingredient-map="ingredientMap"
                      label="Dilutant"
                    />
                  </td>

                  <td class="py-1 text-center">
                    <v-btn
                      icon="mdi-delete"
                      size="x-small"
                      variant="text"
                      color="error"
                      @click="removeEditItem(idx)"
                    />
                  </td>
                </tr>

                <tr v-if="!editDraft.items || editDraft.items.length === 0">
                  <td colspan="7" class="text-center py-3 text-grey">No items in this accord.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="text-caption text-grey mt-3">
            Note: Total grams is derived from the sum of item grams and is not directly editable.
          </div>
        </v-card-text>

        <v-card-actions class="modal-actions-split">
          <v-btn variant="text" @click="cancelEdit">Cancel</v-btn>
          <v-spacer />
          <v-btn color="btnSave" variant="flat" :disabled="!editValid" @click="saveEdit">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue"
import { resolveIngredientReference, repairIngredientReferences } from "@/utils/ingredientReferences.js"
import JsonUploadDialog from "@/components/JsonUploadDialog.vue"
import DilutantSelect from "@/components/DilutantSelect.vue"

const props = defineProps({
  accords: { type: Array, default: () => [] },
  // ingredientMap keyed by unique ingredient key (string)
  ingredientMap: { type: Object, required: true },
  searchTerm: { type: String, default: "" }
})

const emit = defineEmits(["update:accords", "add-accord"]) 

const accordsModel = computed({
  get: () => props.accords,
  set: (v) => emit("update:accords", v)
})

function isAccordRecord(x) {
  return String(x?.type || "").toUpperCase() === "ACCORD" ||
    String(x?.kind || "").toLowerCase() === "accord" ||
    String(x?.cas || "").toUpperCase() === "ACCORD"
}

function accordKeys(a) {
  return [a?.id, a?.key, a?.name]
    .map(v => String(v ?? "").trim())
    .filter(Boolean)
}

function hasAccordKey(a, key) {
  const k = String(key || "").trim()
  if (!k) return false
  return accordKeys(a).includes(k)
}

// Accord display is now sourced from accordsModel only.
// Do not pull accord records out of ingredientMap anymore, otherwise deleted legacy accords
// can reappear after refresh even after assets/data/accords.json was updated.
const allDisplayedAccordRecords = computed(() => {
  const seen = new Set()
  const out = []
  for (const a of (Array.isArray(accordsModel.value) ? accordsModel.value : [])) {
    if (!a || !isAccordRecord(a)) continue
    const id = String(a.id || a.key || a.name || "")
    if (id && seen.has(id)) continue
    if (id) seen.add(id)
    const items = repairIngredientReferences(a.items, props.ingredientMap)
    out.push(items === a.items ? a : { ...a, items })
  }
  return out
})

const ingredientsTableSearch = ref("")
// Default OFF: searching ingredients must not hide accords by default.
const filterAccordsTable = ref(false)

function onIngredientsTableSearch(e) {
  const detail = e?.detail || {}
  filterAccordsTable.value = detail.filterAccords === true
  ingredientsTableSearch.value = String(detail.search || "")
}


function accordIdentity(a) {
  return String(a?.id || a?.key || a?.name || "").trim()
}

function mergeAccords(existing, incoming) {
  const seen = new Set()
  const out = []

  for (const a of [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])]) {
    if (!a || !isAccordRecord(a)) continue
    const id = accordIdentity(a)
    if (id && seen.has(id)) continue
    if (id) seen.add(id)
    out.push(a)
  }

  return out
}

async function loadAccordsJson() {
  try {
    const res = await $fetch("/api/accords")
    const loaded = Array.isArray(res) ? res : Array.isArray(res?.accords) ? res.accords : []
    if (loaded.length) {
      accordsModel.value = mergeAccords(accordsModel.value, loaded)
    }
  } catch (err) {
    // Non-fatal: the table still works with currently loaded/emitted accords.
    console.warn("Could not load assets/data/accords.json via /api/accords.", err)
  }
}

onMounted(() => {
  loadAccordsJson()

  if (typeof window !== "undefined") {
    window.addEventListener("ingredient-organiser-search", onIngredientsTableSearch)
    window.dispatchEvent(new CustomEvent("ingredient-organiser-search-request"))
  }
})

onBeforeUnmount(() => {
  if (typeof window !== "undefined") {
    window.removeEventListener("ingredient-organiser-search", onIngredientsTableSearch)
  }
})

const accordSearchTerm = computed(() =>
  filterAccordsTable.value
    ? ingredientsTableSearch.value.trim().toLowerCase()
    : ""
)

const displayedAccords = computed(() => {
  const list = allDisplayedAccordRecords.value
  const term = accordSearchTerm.value
  if (!term) return list

  return list.filter((a) => {
    const name = String(a?.name || "").toLowerCase()
    const cas = String(a?.cas || "").toLowerCase()
    const type = String(a?.type || "").toLowerCase()
    const date = String(a?.dateSaved || a?.date || "").toLowerCase()
    const itemText = Array.isArray(a?.items)
      ? a.items.map((x) => `${x?.name || ""} ${x?.cas || ""}`).join(" ").toLowerCase()
      : ""

    return (
      name.includes(term) ||
      cas.includes(term) ||
      type.includes(term) ||
      date.includes(term) ||
      itemText.includes(term)
    )
  })
})


/* ---------------- helpers ---------------- */
function num(v, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function isFiniteNum(v) {
  return Number.isFinite(Number(v))
}

function fmtPct(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return "-"
  return n.toFixed(2) + "%"
}

function formatDateDdMmYyyy(v) {
  const s = String(v || "").trim()
  if (!s) return "-"

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[3]}-${iso[2]}-${iso[1]}`

  const slash = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/)
  if (slash) {
    const dd = slash[1].padStart(2, "0")
    const mm = slash[2].padStart(2, "0")
    return `${dd}-${mm}-${slash[3]}`
  }

  return s
}

function deepClone(obj) {
  return obj ? JSON.parse(JSON.stringify(obj)) : obj
}

// dilution: null/undefined/"" => 100
function dilutionFrac(row) {
  const d = row?.dilution
  if (d == null || d === "") return 1
  const n = Number(d)
  if (!Number.isFinite(n)) return 1
  return Math.max(0, Math.min(1, n / 100))
}

// Resolve ingredient from accord item (prefer key)
function resolveIngredient(item) {
  return resolveIngredientReference(item, props.ingredientMap)
}

// Ethanol fraction inside the ingredient's own solution (if solvent is ETOH)
function ethanolFractionOfIngredientMixture(ing) {
  const solvent = String(ing?.solvent || "").toUpperCase()
  if (solvent !== "ETOH") return 0

  // ingredient concentration = % raw material; remainder is solvent
  const c = ing?.concentration != null ? num(ing.concentration, 100) : 100
  return Math.max(0, Math.min(1, (100 - c) / 100))
}

// Ethanol fraction of the selected dilutant (we only track ETOH)
function ethanolFractionOfDilutant(row) {
  const d = row?.dilutant === "Other" ? (row?.customDilutant || "") : (row?.dilutant || "")
  return String(d || "").toUpperCase() === "ETOH" ? 1 : 0
}

/**
 * Display ETOH% for accord row:
 * - If saved totalEtohPercent exists => use it
 * - Else compute from accord.items[] using current ingredientMap
 */
function displayEtohPercent(accord) {
  if (accord?.totalEtohPercent != null && accord?.totalEtohPercent !== "") {
    const saved = Number(accord.totalEtohPercent)
    if (Number.isFinite(saved)) return saved
  }

  const items = Array.isArray(accord?.items) ? accord.items : []
  if (!items.length) return NaN

  const totalGrams =
    num(accord?.totalGrams, 0) > 0
      ? num(accord.totalGrams, 0)
      : items.reduce((s, it) => s + num(it?.gramsAdded, 0), 0)

  if (totalGrams <= 0) return NaN

  let etohGrams = 0
  for (const it of items) {
    const g = num(it?.gramsAdded, 0)
    if (g <= 0) continue

    const dFrac = dilutionFrac(it) // portion that is original ingredient mixture
    const baseGrams = g * dFrac
    const dilutantGrams = g * (1 - dFrac)

    const ing = resolveIngredient(it)

    etohGrams += baseGrams * ethanolFractionOfIngredientMixture(ing)
    etohGrams += dilutantGrams * ethanolFractionOfDilutant(it)
  }

  return (etohGrams / totalGrams) * 100
}


/* ---------------- mobile action menu ---------------- */
const actionMenuDialog = ref(false)
const actionMenuAccord = ref(null)

function openActionMenu(accord) {
  actionMenuAccord.value = accord || null
  actionMenuDialog.value = true
}

function closeActionMenu() {
  actionMenuDialog.value = false
  actionMenuAccord.value = null
}

function addActionMenuAccord() {
  if (!actionMenuAccord.value) return
  emit("add-accord", actionMenuAccord.value)
  closeActionMenu()
}

function editActionMenuAccord() {
  if (!actionMenuAccord.value) return
  const accord = actionMenuAccord.value
  closeActionMenu()
  openEditDialog(accord)
}

function deleteActionMenuAccord() {
  if (!actionMenuAccord.value) return
  const accord = actionMenuAccord.value
  closeActionMenu()
  askDeleteAccord(accord)
}

/* ---------------- delete accord modal ---------------- */
const deleteDialog = ref(false)
const pendingDeleteAccord = ref(null)

function askDeleteAccord(accord) {
  pendingDeleteAccord.value = accord || null
  deleteDialog.value = true
}

function cancelDeleteAccord() {
  deleteDialog.value = false
  pendingDeleteAccord.value = null
}

async function confirmDeleteAccord() {
  const accord = pendingDeleteAccord.value
  if (!accord) {
    cancelDeleteAccord()
    return
  }

  await removeAccord(accord)
  cancelDeleteAccord()
}

/* ---------------- actions ---------------- */
async function removeAccord(accordOrId) {
  const accord =
    accordOrId && typeof accordOrId === "object"
      ? accordOrId
      : allDisplayedAccordRecords.value.find((a) => hasAccordKey(a, accordOrId))

  if (!accord) return

  const keys = accordKeys(accord)
  const key = keys[0] || ""
  if (!key) return

  try {
    const res = await $fetch("/api/accords", {
      method: "DELETE",
      body: {
        key,
        id: accord?.id,
        name: accord?.name,
        accord
      },
      query: { key }
    })

    if (res && res.ok === false) {
      throw new Error(res?.message || "Delete failed")
    }
  } catch (err) {
    console.error("Could not delete accord from assets/data/accords.json.", err)
    alert("Could not delete this accord from accords.json. Check that server/api/accords.delete.js exists, then restart Nuxt.")
    return
  }

  accordsModel.value = (Array.isArray(accordsModel.value) ? accordsModel.value : [])
    .filter((a) => !keys.some(k => hasAccordKey(a, k)))
}

/* ---------------- import accords ---------------- */
const loadDialog = ref(false)

function openLoadDialog() {
  loadDialog.value = true
}

function parseAccordImport(json) {
  if (!Array.isArray(json) || json.some(item => !item || typeof item !== "object" || Array.isArray(item) || !isAccordRecord(item))) {
    throw new Error("Invalid accords file. Expected an array of accord records.")
  }
  return json
}

function confirmAccordImport(incoming) {
  accordsModel.value = mergeAccords(accordsModel.value, incoming)
}

/* ---------------- save accords ---------------- */
const saveDialog = ref(false)
const saveFilename = ref("accords.json")

function openSaveDialog() {
  if (!allDisplayedAccordRecords.value.length) return
  saveFilename.value = (saveFilename.value || "accords.json").trim() || "accords.json"
  saveDialog.value = true
}

function normalizeFilename(name) {
  const raw = String(name || "").trim() || "accords.json"
  return raw.toLowerCase().endsWith(".json") ? raw : raw + ".json"
}

function downloadAccords() {
  const filename = normalizeFilename(saveFilename.value)
  const blob = new Blob([JSON.stringify(allDisplayedAccordRecords.value, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  saveDialog.value = false
}

/* ---------------- edit accord dialog ---------------- */
const editDialog = ref(false)
const editValid = ref(true)
const editForm = ref(null)
const editAccordId = ref(null)

const editDraft = ref({
  name: "",
  dateSaved: "",
  notes: "",
  items: []
})


function accordOptionIdentity(a) {
  return String(a?.id || a?.key || a?.name || "").trim()
}

function accordOptionAliases(a) {
  const out = []
  for (const v of [a?.id, a?.key, a?.name]) {
    const s = String(v ?? "").trim()
    if (s && !out.includes(s)) out.push(s)
  }
  return out
}

function optionKey(value) {
  return String(value ?? "").trim()
}

function sameIngredientRecord(left, right) {
  if (!left || !right) return false
  if (left === right) return true
  const leftId = optionKey(left.id)
  const rightId = optionKey(right.id)
  if (leftId && rightId) return leftId === rightId
  const leftKey = optionKey(left.key)
  return !!leftKey && leftKey === optionKey(right.key)
}

const ingredientOptions = computed(() => {
  const seenValues = new Set()
  const seenIngredients = new Set()
  const out = []
  const ingredients = props.ingredientMap || {}

  // The map indexes each stock by key, ID and CAS. These are lookup aliases,
  // not separate ingredients; keep one selectable value for each record.
  for (const [lookupKey, ingredient] of Object.entries(ingredients)) {
    if (!ingredient || typeof ingredient !== "object" || isAccordRecord(ingredient)) continue
    const id = optionKey(ingredient.id)
    const key = optionKey(ingredient.key)
    const identity = id ? `id:${id}` : key ? `key:${key}` : ingredient
    if (seenIngredients.has(identity)) continue

    const value = [key, id, optionKey(lookupKey)].find(candidate =>
      candidate && !seenValues.has(candidate) && sameIngredientRecord(ingredients[candidate], ingredient)
    )
    if (!value) continue
    seenIngredients.add(identity)
    seenValues.add(value)

    out.push({
      value,
      title: String(ingredient.name || "").trim() || value,
      kind: "ingredient",
      ingredient
    })
  }

  for (const accord of allDisplayedAccordRecords.value || []) {
    const value = accordOptionAliases(accord).find(alias => !seenValues.has(alias))
    if (!value) continue
    seenValues.add(value)
    out.push({
      value,
      title: String(accord.name || "").trim() || value,
      kind: "accord",
      accord
    })
  }

  return out.sort((a, b) => a.title.localeCompare(b.title))
})

const computedEditTotalGrams = computed(() => {
  const items = Array.isArray(editDraft.value?.items) ? editDraft.value.items : []
  return items.reduce((s, it) => s + num(it?.gramsAdded, 0), 0)
})

function openEditDialog(accord) {
  editAccordId.value = accord?.id ?? null
  editDraft.value = deepClone(accord || {})

  if (editDraft.value.dateSaved == null) editDraft.value.dateSaved = editDraft.value.date || ""
  editDraft.value.dateSaved = formatDateDdMmYyyy(editDraft.value.dateSaved)
  if (editDraft.value.notes == null) editDraft.value.notes = ""

  if (!Array.isArray(editDraft.value.items)) editDraft.value.items = []

  // internal row keys for stable v-for rendering
  editDraft.value.items = editDraft.value.items.map((it, idx) => ({
    __rowKey: `${Date.now()}-${idx}-${Math.random().toString(16).slice(2)}`,
    id: it?.id ?? idx + 1,
    key: it?.key ?? null,
    cas: it?.cas ?? "",
    name: it?.name ?? "",
    gramsAdded: it?.gramsAdded ?? 0,
    dilution: it?.dilution ?? 100,
    dilutant: it?.dilutant ?? null,
    customDilutant: it?.customDilutant ?? null,
    kind: it?.kind ?? null,
    accordId: it?.accordId ?? null
  }))

  // sync name/cas from ingredientMap where possible
  for (const it of editDraft.value.items) {
    syncItemFromIngredientMap(it)
  }

  editDialog.value = true
  queueMicrotask(() => editForm.value?.resetValidation?.())
}

function cancelEdit() {
  editDialog.value = false
  editAccordId.value = null
}

function isEditItemAccord(it) {
  return String(it?.kind || "").toLowerCase() === "accord" ||
    String(it?.cas || "").toUpperCase() === "ACCORD" ||
    String(it?.accordId || "").trim() !== ""
}

function resolveAccordFromEditItem(it) {
  const candidates = [it?.accordId, it?.key, it?.id, it?.name]
    .map(v => String(v ?? "").trim())
    .filter(Boolean)

  if (!candidates.length) return null

  return (allDisplayedAccordRecords.value || []).find((a) => {
    const aliases = accordOptionAliases(a)
    return candidates.some(c => aliases.includes(c))
  }) || null
}

function syncItemFromIngredientMap(it) {
  const accord = isEditItemAccord(it) ? resolveAccordFromEditItem(it) : null
  if (accord) {
    const identity = accordOptionIdentity(accord)
    const option = ingredientOptions.value.find(candidate => candidate.kind === "accord" && candidate.accord === accord)
    it.key = option?.value || identity || it.key
    it.name = accord?.name || it.name || identity
    it.cas = "ACCORD"
    it.kind = "accord"
    it.accordId = String(accord?.id || identity || "").trim() || it.accordId
    return
  }

  const ing = resolveIngredientReference(it, props.ingredientMap)
  if (!ing) return
  const option = ingredientOptions.value.find(candidate =>
    candidate.kind === "ingredient" && sameIngredientRecord(candidate.ingredient, ing)
  )
  it.key = option?.value || it.key
  // user should not type these; keep them synced to ingredient db
  it.name = ing?.name ?? it.name
  it.cas = ing?.cas ?? it.cas
  it.kind = it.kind === "accord" ? null : it.kind
  it.accordId = null
}

function onEditItemKeyChanged(it) {
  const selected = ingredientOptions.value.find(x => x.value === it?.key)

  if (selected?.kind === "accord") {
    const accord = selected.accord
    const identity = accordOptionIdentity(accord)
    it.key = selected.value
    it.name = accord?.name || identity || ""
    it.cas = "ACCORD"
    it.kind = "accord"
    it.accordId = String(accord?.id || identity || "").trim() || null
    return
  }

  if (selected?.kind === "ingredient") {
    if (isEditItemAccord(it)) it.kind = null
    it.accordId = null
    it.key = selected.value
    it.name = selected.ingredient.name ?? it.name
    it.cas = selected.ingredient.cas ?? it.cas
    return
  }
  syncItemFromIngredientMap(it)
}

function nextItemId(items) {
  const ids = (items || []).map((x) => Number(x?.id)).filter((n) => Number.isFinite(n))
  const max = ids.length ? Math.max(...ids) : 0
  return max + 1
}

function addEditItem() {
  const items = Array.isArray(editDraft.value.items) ? editDraft.value.items : (editDraft.value.items = [])
  items.push({
    __rowKey: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    id: nextItemId(items),
    key: null,
    cas: "",
    name: "",
    gramsAdded: 0,
    dilution: 100,
    dilutant: null,
    customDilutant: null,
    kind: null,
    accordId: null
  })
}

function removeEditItem(idx) {
  if (!confirm("Remove this item?")) return
  editDraft.value.items.splice(idx, 1)
}

function saveEdit() {
  const id = editAccordId.value
  if (!id) {
    editDialog.value = false
    return
  }

  const updated = deepClone(editDraft.value)

  // Keep the existing "date" field in sync if your data uses it
  if (updated.dateSaved != null && updated.dateSaved !== "") updated.date = updated.dateSaved

  // Strip internal row key and enforce derived totalGrams
  if (Array.isArray(updated.items)) {
    updated.items = updated.items.map(({ __rowKey, ...rest }) => rest)
    updated.totalGrams = updated.items.reduce((s, it) => s + num(it?.gramsAdded, 0), 0)
  } else {
    updated.items = []
    updated.totalGrams = 0
  }

  accordsModel.value = accordsModel.value.map((a) => (a?.id === id ? updated : a))
  editDialog.value = false
  editAccordId.value = null
}
</script>

<style scoped>
.accord-save-placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  padding-inline: 12px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.089em;
  text-transform: uppercase;
  white-space: nowrap;
  background: rgba(var(--v-theme-on-surface), 0.12);
  color: rgba(var(--v-theme-on-surface), 0.38);
}

.accords-card {
  height: 100%;
  max-height: 100%;
  overflow: hidden;
  min-height: 0;
}

.accords-toolbar {
  flex: 0 0 auto;
}

.accords-table-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

.accords-table-scroll thead th {
  position: sticky;
  top: 0;
  z-index: 3;
  background-color: #f5f5f5;
  background-clip: padding-box;
}

.accords-table-scroll thead tr {
  background-color: #f5f5f5;
}

table { border-collapse: collapse; }
td, th { padding: 6px 8px; border-bottom: 1px solid #e0e0e0; vertical-align: top; }
th { font-weight: 600; }


.desktop-accord-actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  flex-wrap: nowrap;
}

.mobile-accord-detail,
.mobile-accord-actions-trigger {
  display: none;
}

.accords-table {
  table-layout: auto;
}

.accords-table-scroll {
  overflow-x: hidden;
}

.accords-table-scroll thead th {
  background-color: rgb(var(--v-theme-tableHeader, 245, 245, 245)) !important;
}

.accords-table-scroll thead tr {
  background-color: rgb(var(--v-theme-tableHeader, 245, 245, 245)) !important;
}

.edit-accord-name-date-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
}

.edit-items-table-wrap {
  width: 100%;
  overflow-x: hidden;
}

.edit-items-table {
  table-layout: fixed;
  width: 100%;
}

.edit-items-table :deep(.v-field__input),
.edit-items-table :deep(.v-select__selection-text) {
  min-width: 0;
}

.edit-item-ingredient-col { width: 28%; }
.edit-item-cas-col { width: 16%; }
.edit-item-grams-col { width: 11%; }
.edit-item-dilution-col { width: 11%; }
.edit-item-dilutant-col { width: 14%; }
.edit-item-custom-col { width: 15%; }
.edit-item-actions-col { width: 5%; }

@media (max-width: 760px) {
  .accords-table {
    table-layout: fixed;
    width: 100%;
  }

  .accord-conc-col,
  .accord-etoh-col,
  .accord-cost-col,
  .accord-date-col {
    display: none;
  }

  .accord-actions-header .accord-actions-label {
    display: none;
  }

  .accord-name-col {
    width: auto;
  }

  .accord-actions-col {
    width: 48px;
    text-align: right;
  }

  .desktop-accord-actions {
    display: none;
  }

  .mobile-accord-detail,
  .mobile-accord-actions-trigger {
    display: block;
  }

  .accords-table td,
  .accords-table th {
    padding: 6px 4px;
  }

  .accords-table-scroll {
    overflow-x: hidden;
  }
}

@media (max-width: 900px) {
  .edit-accord-name-date-row {
    grid-template-columns: 1fr;
  }

  .edit-items-table,
  .edit-items-table thead,
  .edit-items-table tbody,
  .edit-items-table tr,
  .edit-items-table th,
  .edit-items-table td {
    display: block;
    width: 100%;
  }

  .edit-items-table thead {
    display: none;
  }

  .edit-items-table tr {
    border-bottom: 1px solid #e0e0e0;
    padding: 8px 0;
  }

  .edit-items-table td {
    border-bottom: 0;
    padding: 4px 0;
  }
}

</style>

