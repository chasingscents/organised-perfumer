<!-- pages/settings.vue -->
<template>
  <v-container fluid class="settings-page">
    <v-row justify="center">
      <v-col cols="12" md="10" class="settings-col">
        <v-card class="settings-card">
          <div class="settings-layout">
            <ClientOnly>
              <div class="settings-tabs-wrap desktop-settings-tabs">
                <v-tabs
                  v-model="activeTab"
                  direction="vertical"
                  bg-color="primary"
                  color="btnActive"
                  class="settings-tabs"
                >
                  <v-tab
                    v-for="tab in tabs"
                    :key="tab.key"
                    :value="tab.key"
                    class="settings-tab"
                  >
                    {{ tab.title }}
                  </v-tab>
                </v-tabs>
              </div>
            </ClientOnly>

            <main class="settings-content" :aria-busy="isTabLoading">
              <ClientOnly>
                <div class="mobile-settings-tabs mb-3">
                  <v-tabs
                    v-model="activeTab"
                    bg-color="primary"
                    color="btnActive"
                    show-arrows
                    grow
                    class="settings-tabs"
                  >
                    <v-tab
                      v-for="tab in tabs"
                      :key="tab.key"
                      :value="tab.key"
                      class="settings-tab"
                    >
                      {{ tab.title }}
                    </v-tab>
                  </v-tabs>
                </div>
              </ClientOnly>
              <div v-if="isTabLoading" class="settings-tab-loader" role="status" aria-live="polite">
                <div class="text-body-2 mb-2">Loading...</div>
                <v-progress-linear indeterminate color="loading" :height="4" rounded />
              </div>
              <div v-show="!isTabLoading" class="settings-tab-content">
              <!-- DILUTANTS -->
              <section class="settings-tab-panel" v-if="visitedTabs.has('dilutants')" v-show="displayedTab === 'dilutants'">
                <div class="settings-panel-header d-flex align-center justify-space-between flex-wrap ga-2 mb-3">
                  <h2 class="text-h6">Dilutants</h2>
                </div>

                <div class="text-body-2 text-grey-darken-1 mb-3">
                  Match each SelectedTable dilutant option to an ingredient in <code>ingredients.json</code>.
                  This lets diluted rows include the dilutant cost.
                </div>

                <div class="settings-table-scroll">
                  <v-table density="compact">
                    <thead>
                      <tr class="settings-table-header">
                        <th class="text-left">Dilutant option</th>
                        <th class="text-left">Matched ingredient</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(row, idx) in dilutantRows" :key="row.__rowKey">
                        <td>
                          <v-text-field
                            :ref="instance => setDilutantCodeRef(row.__rowKey, instance)"
                            v-model="row.code"
                            density="compact"
                            variant="outlined"
                            hint="Letters and numbers only"
                            persistent-hint
                            hide-details="auto"
                            :error-messages="dilutantRowError(row)"
                            @update:model-value="row.code = sanitizeDilutantCode($event)"
                          />
                        </td>
                        <td>
                          <v-autocomplete
                            v-model="row.ingredientKey"
                            :items="ingredientOptions"
                            item-title="title"
                            item-value="value"
                            density="compact"
                            variant="outlined"
                            hide-details
                            clearable
                            @update:modelValue="syncDilutantIngredient(row)"
                            @keydown.tab="onDilutantRowTab($event, idx)"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </v-table>
                </div>
              </section>

              <!-- ALLERGENS -->
              <section class="settings-tab-panel" v-if="visitedTabs.has('allergens')" v-show="displayedTab === 'allergens'">
                <div class="settings-panel-header d-flex align-center justify-space-between flex-wrap ga-2 mb-3">
                  <h2 class="text-h6">Allergens</h2>
                  <div class="d-flex flex-wrap ga-2">
                    <v-btn size="small" color="btnDelete" variant="flat" @click="openSettingsUpload('allergens')">Replace JSON</v-btn>
                    <v-btn size="small" color="btnAdd" variant="flat" @click="addAllergenRow">New Entry</v-btn>
                  </div>
                </div>

                <v-text-field
                  v-model="allergenSearch"
                  label="Search name or CAS"
                  prepend-inner-icon="mdi-magnify"
                  density="compact"
                  variant="outlined"
                  hide-details
                  clearable
                  class="settings-search mb-3"
                />

                <div class="settings-table-scroll">
                  <v-table density="compact">
                    <thead>
                      <tr class="settings-table-header">
                        <th class="text-left">Name</th>
                        <th class="text-left">INCI</th>
                        <th class="text-left">CAS</th>
                        <th class="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="row in filteredAllergenRows" :key="row.__rowKey">
                        <td><v-text-field v-model="row.name" density="compact" variant="outlined" hide-details /></td>
                        <td><v-text-field v-model="row.inci" density="compact" variant="outlined" hide-details /></td>
                        <td><v-text-field v-model="row.casText" density="compact" variant="outlined" hide-details placeholder="semicolon separated" /></td>
                        <td class="text-right">
                          <v-btn icon="mdi-delete" size="x-small" variant="text" color="btnDelete" @click="removeSettingsRow(allergenRows, row)" />
                        </td>
                      </tr>
                      <tr v-if="!filteredAllergenRows.length">
                        <td colspan="4" class="text-center text-grey py-4">No entries found.</td>
                      </tr>
                    </tbody>
                  </v-table>
                </div>
              </section>

              <!-- IFRA -->
              <section class="settings-tab-panel" v-if="visitedTabs.has('ifra')" v-show="displayedTab === 'ifra'">
                <div class="settings-panel-header d-flex align-center justify-space-between flex-wrap ga-2 mb-3">
                  <h2 class="text-h6">IFRA</h2>
                  <div class="d-flex flex-wrap ga-2">
                    <v-btn size="small" color="btnDelete" variant="flat" @click="openSettingsUpload('ifra')">Replace JSON</v-btn>
                    <v-btn size="small" color="btnAdd" variant="flat" @click="openAddIfraDialog">New Entry</v-btn>
                  </div>
                </div>

                <p class="text-body-2 mb-3">
                  In the Recommendation column; 'R' refers to 'Restriction', 'S' refers to 'Specification', 'P' refers to 'Prohibition'.
                </p>

                <v-text-field
                  v-model="ifraSearch"
                  label="Search name or CAS"
                  prepend-inner-icon="mdi-magnify"
                  density="compact"
                  variant="outlined"
                  hide-details
                  clearable
                  class="settings-search mb-3"
                />

                <div class="settings-table-scroll">
                  <v-table density="compact">
                    <thead>
                      <tr class="settings-table-header">
                        <th class="text-left">Name</th>
                        <th class="text-left">INCI</th>
                        <th class="text-left">CAS</th>
                        <th class="text-right">Cat. 4 Limit</th>
                        <th class="text-left">Recommendation</th>
                        <th class="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="row in filteredIfraRows" :key="row.__rowKey">
                        <td><v-text-field v-model="row.name" density="compact" variant="outlined" hide-details /></td>
                        <td><v-text-field v-model="row.inci" density="compact" variant="outlined" hide-details /></td>
                        <td><v-text-field v-model="row.casText" density="compact" variant="outlined" hide-details placeholder="semicolon separated" /></td>
                        <td>
                          <v-text-field
                            v-model="row.categoryFour"
                            type="number"
                            density="compact"
                            variant="outlined"
                            hide-details
                            class="text-right"
                          />
                        </td>
                        <td>
                          <v-select
                            v-model="row.recommendation"
                            :items="recommendationOptions"
                            item-title="title"
                            item-value="value"
                            multiple
                            chips
                            closable-chips
                            density="compact"
                            variant="outlined"
                            hide-details
                          />
                        </td>
                        <td class="text-right">
                          <v-btn icon="mdi-delete" size="x-small" variant="text" color="btnDelete" @click="removeSettingsRow(ifraRows, row)" />
                        </td>
                      </tr>
                      <tr v-if="!filteredIfraRows.length">
                        <td colspan="6" class="text-center text-grey py-4">No entries found.</td>
                      </tr>
                    </tbody>
                  </v-table>
                </div>
              </section>

              <!-- TAGS -->
              <section class="settings-tab-panel" v-if="visitedTabs.has('tags')" v-show="displayedTab === 'tags'">
                <div class="settings-panel-header d-flex align-center justify-space-between flex-wrap ga-2 mb-3">
                  <h2 class="text-h6">Tags</h2>
                  <div class="d-flex flex-wrap ga-2">
                    <v-btn size="small" color="btnAdd" variant="flat" @click="addTagRow">Add Tag</v-btn>
                  </div>
                </div>

                <div class="settings-table-scroll">
                  <v-table density="compact">
                    <thead>
                      <tr class="settings-table-header">
                        <th class="text-left">Tag</th>
                        <th class="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(row, idx) in tagRows" :key="row.__rowKey">
                        <td><v-text-field v-model="row.tag" density="compact" variant="outlined" hide-details /></td>
                        <td class="text-right">
                          <v-btn icon="mdi-delete" size="x-small" variant="text" color="btnDelete" @click="tagRows.splice(idx, 1)" />
                        </td>
                      </tr>
                    </tbody>
                  </v-table>
                </div>
              </section>

              </div>

              <footer class="settings-save-bar">
                <v-alert
                  v-if="saveStatus"
                  class="settings-save-status"
                  density="compact"
                  variant="tonal"
                  :type="saveStatusType"
                  closable
                  @click:close="clearStatus"
                >
                  {{ saveStatus }}
                </v-alert>
                <v-btn
                  color="btnSave"
                  variant="flat"
                  size="small"
                  :loading="isSaving"
                  :disabled="isSaving || isTabLoading || !canSaveCurrentTab || (activeTab === 'dilutants' && !areDilutantsValid)"
                  class="settings-save-button"
                  @click="saveActiveTab"
                >Save</v-btn>
              </footer>
            </main>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <JsonUploadDialog
      v-model="settingsUploadDialog"
      title="Replace JSON"
      :parse-records="parseSettingsImport"
      :warning="settingsUploadWarning"
      @confirm="confirmSettingsImport"
    />

    <!-- ADD IFRA MODAL -->
    <v-dialog v-model="ifraDialog" max-width="1100">
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between text-h6">
          <span>Add IFRA Ingredient</span>
          <v-btn icon="mdi-close" variant="text" size="small" @click="closeIfraDialog" />
        </v-card-title>

        <v-card-text>
          <div class="settings-form d-flex flex-column ga-4">
            <section class="form-section">
              <div class="section-title">General</div>

              <div class="form-row">
                <v-text-field
                  v-model="ifraDraft.name"
                  class="field-50"
                  label="Name"
                  variant="outlined"
                  density="comfortable"
                  required
                />

                <v-text-field
                  v-model="ifraDraft.inci"
                  class="field-50"
                  label="INCI"
                  variant="outlined"
                  density="comfortable"
                />

                <v-text-field
                  v-model="ifraDraft.casText"
                  class="field-50"
                  label="CAS"
                  placeholder="semicolon separated"
                  variant="outlined"
                  density="comfortable"
                />
              </div>

              <v-combobox
                v-model="ifraDraft.synonyms"
                label="Synonyms"
                variant="outlined"
                density="comfortable"
                multiple
                chips
                closable-chips
                clearable
                :delimiters="[';']"
              />
            </section>

            <section class="form-section">
              <div class="section-title">Recommendation</div>

              <v-select
                v-model="ifraDraft.recommendation"
                :items="recommendationOptions"
                item-title="label"
                item-value="value"
                label="Recommendation"
                multiple
                chips
                closable-chips
                variant="outlined"
                density="comfortable"
              />
            </section>

            <section class="form-section">
              <div class="section-title">Category Limits</div>

              <div class="category-grid">
                <v-text-field
                  v-for="field in ifraCategoryFields"
                  :key="field.key"
                  v-model="ifraDraft[field.key]"
                  :label="field.label"
                  type="number"
                  variant="outlined"
                  density="compact"
                  hide-details
                />
              </div>
            </section>

            <section class="form-section">
              <div class="section-title">Notes</div>

              <v-textarea
                v-model="ifraDraft.flavorRequirements"
                label="Flavor Requirements"
                variant="outlined"
                density="comfortable"
                auto-grow
                rows="2"
              />

              <v-textarea
                v-model="ifraDraft.restrictionNotes"
                label="Restriction Notes"
                variant="outlined"
                density="comfortable"
                auto-grow
                rows="2"
              />

              <v-textarea
                v-model="ifraDraft.prohibitionNotes"
                label="Prohibition Notes"
                variant="outlined"
                density="comfortable"
                auto-grow
                rows="2"
              />

              <v-textarea
                v-model="ifraDraft.specificationNotes"
                label="Specification Notes"
                variant="outlined"
                density="comfortable"
                auto-grow
                rows="2"
              />
            </section>
          </div>
        </v-card-text>

        <v-card-actions class="modal-actions-split">
          <v-btn variant="text" @click="closeIfraDialog">Cancel</v-btn>
          <v-spacer />
          <v-btn color="btnSave" variant="flat" class="settings-save-button" :disabled="!canAddIfra" @click="confirmAddIfra">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue"
import JsonUploadDialog from "@/components/JsonUploadDialog.vue"
import rawIngredients from "@/assets/data/ingredients.json"
import rawAllergens from "@/assets/data/allergens.json"
import rawIfra51 from "@/assets/data/ifra51.json"
import rawTags from "@/assets/data/tags.json"
import { buildDilutantIngredientOptions, sanitizeDilutantCode, useDilutants } from "@/composables/useDilutants.js"

const SETTINGS_SAVE_STATUS_KEY = "ingredientOrganiser.settings.saveStatus"

const tabs = [
  { key: "dilutants", title: "Dilutants" },
  { key: "allergens", title: "Allergens" },
  { key: "ifra", title: "IFRA" },
  { key: "tags", title: "Tags" }
]

const firstTabKey = tabs[0].key
const activeTab = ref(firstTabKey)
const displayedTab = ref(firstTabKey)
const visitedTabs = ref(new Set([firstTabKey]))
const isTabLoading = ref(false)
let tabLoadVersion = 0
const saveStatus = ref("")
const saveStatusType = ref("success")
const isSaving = ref(false)
const canSaveCurrentTab = computed(() => ["dilutants", "allergens", "ifra", "tags"].includes(activeTab.value))

function saveActiveTab() {
  if (isSaving.value || isTabLoading.value) return
  const save = { dilutants: saveDilutants, allergens: saveAllergens, ifra: saveIfra, tags: saveTags }[activeTab.value]
  return save?.()
}

onMounted(() => {
  if (typeof window === "undefined") return
  try {
    const status = JSON.parse(window.sessionStorage.getItem(SETTINGS_SAVE_STATUS_KEY) || "null")
    if (typeof status?.message === "string") {
      saveStatus.value = status.message
      saveStatusType.value = status.type === "error" ? "error" : "success"
    }
  } catch {
    // Keep settings usable when session storage is unavailable.
  }
})

watch(activeTab, async (tab) => {
  const version = ++tabLoadVersion

  if (typeof window === "undefined") {
    visitedTabs.value.add(tab)
    displayedTab.value = tab
    return
  }

  // Visited panels stay mounted, including their current editable data.
  if (visitedTabs.value.has(tab)) {
    displayedTab.value = tab
    isTabLoading.value = false
    return
  }

  isTabLoading.value = true
  try {
    await nextTick()
    // Paint the indicator only before a panel's first render.
    await new Promise(resolve => {
      window.requestAnimationFrame(() => window.requestAnimationFrame(resolve))
    })
    if (version !== tabLoadVersion) return
    visitedTabs.value.add(tab)
    displayedTab.value = tab
    await nextTick()
  } finally {
    if (version === tabLoadVersion) isTabLoading.value = false
  }
}, { flush: "sync" })

onBeforeUnmount(() => {
  tabLoadVersion++
})

function uid(prefix = "row") {
  return `${prefix}::${Date.now()}::${Math.random().toString(16).slice(2)}`
}

function casArray(v) {
  if (Array.isArray(v)) return v.map(x => String(x || "").trim()).filter(Boolean)
  const s = String(v || "").trim()
  return s ? [s] : []
}

function stringList(v) {
  if (Array.isArray(v)) return v.map(x => String(x || "").trim()).filter(Boolean)
  const s = String(v || "").trim()
  return s ? [s] : []
}

function casText(v) {
  return casArray(v).join("; ")
}

function splitCasText(v) {
  return String(v || "")
    .split(/[;,]/)
    .map(x => x.trim())
    .filter(Boolean)
}

function splitSemiText(v) {
  return String(v || "")
    .split(";")
    .map(x => x.trim())
    .filter(Boolean)
}

function firstNameFromIfra(entry) {
  if (Array.isArray(entry?.names)) return String(entry.names[0] || "").trim()
  if (Array.isArray(entry?.name)) return String(entry.name[0] || "").trim()
  return String(entry?.name || entry?.inci || "").trim()
}

function showStatus(message, type = "success") {
  saveStatus.value = message
  saveStatusType.value = type

  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(SETTINGS_SAVE_STATUS_KEY, JSON.stringify({ message, type }))
  } catch {
    // The badge still persists while this page is open.
  }
}

function clearStatus() {
  saveStatus.value = ""

  if (typeof window === "undefined") return
  try {
    window.sessionStorage.removeItem(SETTINGS_SAVE_STATUS_KEY)
  } catch {
    // Dismissing the badge must not depend on session storage.
  }
}

async function saveDataFile(file, data) {
  if (isSaving.value) return
  isSaving.value = true
  const tabBeforeSave = activeTab.value

  try {
    const res = await $fetch("/api/settings-data", {
      method: "POST",
      body: { file, data }
    })
    if (res && res.ok === false) throw new Error(res?.message || "Save failed")
    activeTab.value = tabBeforeSave
    showStatus(`${file} saved.`)
  } catch (err) {
    activeTab.value = tabBeforeSave
    console.error(err)
    showStatus(`Could not save ${file}. Check server/api/settings-data.post.js, then restart Nuxt.`, "error")
  } finally {
    isSaving.value = false
  }
}

/* ---------------- Dilutants ---------------- */
const { dilutants, replaceDilutants } = useDilutants()
const dilutantCodeRefs = new Map()

function makeDilutantRow(entry = {}) {
  return {
    __rowKey: uid("dilutant"),
    code: entry.code || "",
    ingredientKey: entry.ingredientKey || "",
    ingredientCas: entry.ingredientCas || "",
    ingredientName: entry.ingredientName || ""
  }
}

const dilutantRows = ref([...dilutants.value.map(makeDilutantRow), makeDilutantRow()])
watch(dilutants, entries => {
  dilutantRows.value = [...entries.map(makeDilutantRow), makeDilutantRow()]
})
const ingredientOptions = computed(() => buildDilutantIngredientOptions(rawIngredients))

function setDilutantCodeRef(key, instance) {
  if (instance) dilutantCodeRefs.set(key, instance)
  else dilutantCodeRefs.delete(key)
}

async function onDilutantRowTab(event, index) {
  if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey || index !== dilutantRows.value.length - 1) return
  event.preventDefault()
  const row = makeDilutantRow()
  dilutantRows.value.push(row)
  await nextTick()
  const field = dilutantCodeRefs.get(row.__rowKey)
  const input = field?.$el?.querySelector?.("input")
  if (input) input.focus()
  else field?.focus?.()
}

function dilutantRowError(row) {
  const code = String(row.code || "")
  if (!code) return row.ingredientKey ? "Enter a dilutant option." : ""
  if (!/^[a-z0-9]+$/i.test(code)) return "Use letters and numbers only."
  if (code.toLowerCase() === "other") return "Other is reserved for adding a custom dilutant."
  if (dilutantRows.value.filter(entry => String(entry.code || "").toLowerCase() === code.toLowerCase()).length > 1) return "This dilutant option already exists."
  return ""
}

const areDilutantsValid = computed(() =>
  dilutantRows.value.some(row => row.code) && dilutantRows.value.every(row => !dilutantRowError(row))
)

function syncDilutantIngredient(row) {
  const ingredient = ingredientOptions.value.find(option => option.value === row.ingredientKey)?.raw
  row.ingredientName = ingredient?.name || ""
  row.ingredientCas = casArray(ingredient?.cas)[0] || ""
}

function saveDilutants() {
  if (!areDilutantsValid.value) return
  const data = dilutantRows.value.filter(row => row.code).map(row => ({
    code: row.code,
    label: row.code,
    ingredientKey: String(row.ingredientKey || ""),
    ingredientCas: String(row.ingredientCas || ""),
    ingredientName: String(row.ingredientName || "")
  }))
  replaceDilutants(data)
  return saveDataFile("dilutants", data)
}

/* ---------------- Allergens ---------------- */
function makeAllergenRow(entry = {}, id = 0) {
  const name = firstNameFromIfra(entry)
  return {
    __rowKey: uid("allergen"),
    id: entry.id ?? id,
    name,
    inci: String(entry.inci || name).trim(),
    casText: casText(entry.cas)
  }
}

const allergenRows = ref((Array.isArray(rawAllergens) ? rawAllergens : []).map(makeAllergenRow))
const allergenSearch = ref("")
const ifraSearch = ref("")

// Both tables use the same matching rules and retain references to editable rows.
function filterSettingsEntries(rows, query) {
  const terms = String(query || "").trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (!terms.length) return rows
  return rows.filter(row => {
    const text = `${row.name || ""} ${row.casText || ""}`.toLowerCase()
    return terms.every(term => text.includes(term))
  })
}

const filteredAllergenRows = computed(() => filterSettingsEntries(allergenRows.value, allergenSearch.value))
const filteredIfraRows = computed(() => filterSettingsEntries(ifraRows.value, ifraSearch.value))

function removeSettingsRow(rows, row) {
  const index = rows.findIndex(entry => entry.__rowKey === row.__rowKey)
  if (index >= 0) rows.splice(index, 1)
}

function addAllergenRow() {
  allergenSearch.value = ""
  allergenRows.value.unshift({
    __rowKey: uid("allergen"),
    id: allergenRows.value.length ? Math.max(...allergenRows.value.map(x => Number(x.id)).filter(Number.isFinite), -1) + 1 : 0,
    name: "",
    inci: "",
    casText: ""
  })
}

function saveAllergens() {
  const data = allergenRows.value
    .map((row, idx) => ({
      id: Number.isFinite(Number(row.id)) ? Number(row.id) : idx,
      name: String(row.name || "").trim(),
      inci: String(row.inci || row.name || "").trim(),
      cas: splitCasText(row.casText)
    }))
    .filter(x => x.name || x.inci || x.cas.length)

  return saveDataFile("allergens", data)
}

/* ---------------- IFRA ---------------- */
const ifraCategoryFields = [
  { key: "categoryOne", label: "Cat. 1" },
  { key: "categoryTwo", label: "Cat. 2" },
  { key: "categoryThree", label: "Cat. 3" },
  { key: "categoryFour", label: "Cat. 4" },
  { key: "categoryFive", label: "Cat. 5" },
  { key: "categorySix", label: "Cat. 6" },
  { key: "categorySeven", label: "Cat. 7" },
  { key: "categoryEight", label: "Cat. 8" },
  { key: "categoryNine", label: "Cat. 9" },
  { key: "categoryTen", label: "Cat. 10" },
  { key: "categoryEleven", label: "Cat. 11" },
  { key: "categoryTwelve", label: "Cat. 12" },
  { key: "categoryFiveA", label: "Cat. 5A" },
  { key: "categoryFiveB", label: "Cat. 5B" },
  { key: "categoryFiveC", label: "Cat. 5C" },
  { key: "categoryFiveD", label: "Cat. 5D" },
  { key: "categorySevenA", label: "Cat. 7A" },
  { key: "categorySevenB", label: "Cat. 7B" },
  { key: "categoryTenA", label: "Cat. 10A" },
  { key: "categoryTenB", label: "Cat. 10B" },
  { key: "categoryElevenA", label: "Cat. 11A" },
  { key: "categoryElevenB", label: "Cat. 11B" }
]

const ifraCategoryKeys = ifraCategoryFields.map(x => x.key)

const ifraKnownKeys = [
  "name",
  "names",
  "inci",
  "synonyms",
  "cas",
  "recommendation",
  "flavorRequirements",
  "restrictionNotes",
  "prohibitionNotes",
  "specificationNotes",
  ...ifraCategoryKeys
]

const recommendationOptions = [
  { title: "R", label: "Restriction", value: "restriction" },
  { title: "S", label: "Specification", value: "specification" },
  { title: "P", label: "Prohibition", value: "prohibition" }
]

function numericOrNull(v) {
  if (v === "" || v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function recommendationValues(v) {
  const arr = Array.isArray(v) ? v : v ? [v] : []
  return arr
    .map(x => String(x || "").trim().toLowerCase())
    .map(x => {
      if (x === "r") return "restriction"
      if (x === "s") return "specification"
      if (x === "p") return "prohibition"
      return x
    })
    .filter(x => ["restriction", "specification", "prohibition"].includes(x))
}

function makeIfraExtra(entry) {
  const extra = {}
  for (const [key, value] of Object.entries(entry || {})) {
    if (!ifraKnownKeys.includes(key)) extra[key] = value
  }
  return extra
}

function makeIfraRow(entry = {}) {
  const row = {
    __rowKey: uid("ifra"),
    __extra: makeIfraExtra(entry),
    name: firstNameFromIfra(entry),
    inci: String(entry.inci || firstNameFromIfra(entry)).trim(),
    casText: casText(entry.cas),
    synonymsText: stringList(entry.synonyms).join("; "),
    recommendation: recommendationValues(entry.recommendation),
    flavorRequirements: String(entry.flavorRequirements || ""),
    restrictionNotes: String(entry.restrictionNotes || ""),
    prohibitionNotes: String(entry.prohibitionNotes || ""),
    specificationNotes: String(entry.specificationNotes || "")
  }

  for (const key of ifraCategoryKeys) {
    row[key] = entry?.[key] ?? null
  }

  return row
}

const ifraRows = ref((Array.isArray(rawIfra51) ? rawIfra51 : []).map(makeIfraRow))

const ifraDialog = ref(false)
const ifraDraft = ref(makeIfraRow())

const canAddIfra = computed(() =>
  String(ifraDraft.value?.name || "").trim().length > 0 ||
  String(ifraDraft.value?.inci || "").trim().length > 0 ||
  splitCasText(ifraDraft.value?.casText).length > 0
)

function openAddIfraDialog() {
  ifraDraft.value = makeIfraRow()
  ifraDraft.value.__rowKey = uid("ifra-draft")
  ifraDialog.value = true
}

function closeIfraDialog() {
  ifraDialog.value = false
}

function confirmAddIfra() {
  if (!canAddIfra.value) return

  const row = makeIfraRow(buildIfraEntryFromRow(ifraDraft.value))
  row.__rowKey = uid("ifra")
  ifraSearch.value = ""
  ifraRows.value.unshift(row)
  closeIfraDialog()
}

function buildIfraEntryFromRow(row) {
  const entry = {
    ...(row.__extra || {}),
    name: String(row.name || "").trim(),
    inci: String(row.inci || row.name || "").trim(),
    synonyms: Array.isArray(row.synonyms)
      ? row.synonyms.map(x => String(x || "").trim()).filter(Boolean)
      : splitSemiText(row.synonymsText),
    cas: splitCasText(row.casText),
    recommendation: recommendationValues(row.recommendation),
    flavorRequirements: String(row.flavorRequirements || ""),
    restrictionNotes: String(row.restrictionNotes || ""),
    prohibitionNotes: String(row.prohibitionNotes || ""),
    specificationNotes: String(row.specificationNotes || "")
  }

  for (const key of ifraCategoryKeys) {
    entry[key] = numericOrNull(row[key])
  }

  return entry
}

function saveIfra() {
  const data = ifraRows.value
    .map(buildIfraEntryFromRow)
    .filter(x => x.name || x.inci || x.cas.length)

  return saveDataFile("ifra51", data)
}

/* ---------------- Shared settings imports ---------------- */
const settingsUploadDialog = ref(false)
const settingsUploadTarget = ref("allergens")
const settingsUploadWarning = computed(() =>
  `Confirming this upload will replace the entire ${settingsUploadTarget.value === "allergens" ? "Allergens" : "IFRA"} list, including any unsaved edits. Only entries from the selected JSON files will remain. Click Save afterwards to apply the replacement.`
)

function openSettingsUpload(target) {
  settingsUploadTarget.value = target
  settingsUploadDialog.value = true
}

function parseSettingsImport(json) {
  const entries = Array.isArray(json) ? json : json?.items
  if (!Array.isArray(entries) || entries.some(entry =>
    !entry || typeof entry !== "object" || Array.isArray(entry) ||
    !(firstNameFromIfra(entry) || casArray(entry.cas).length)
  )) {
    throw new Error("Expected an array of entries with a name or CAS, or an object with an items array.")
  }
  return entries
}

function confirmSettingsImport(entries) {
  const isAllergens = settingsUploadTarget.value === "allergens"
  if (isAllergens) {
    allergenRows.value = entries.map(makeAllergenRow)
    allergenSearch.value = ""
  } else {
    ifraRows.value = entries.map(makeIfraRow)
    ifraSearch.value = ""
  }
  showStatus(`Replaced the ${isAllergens ? "Allergens" : "IFRA"} list with ${entries.length} entries. Save to apply changes.`)
}

/* ---------------- Tags ---------------- */
const tagRows = ref((Array.isArray(rawTags) ? rawTags : []).map((tag) => ({
  __rowKey: uid("tag"),
  tag: typeof tag === "string" ? tag : String(tag?.tag || tag?.name || tag?.label || tag?.value || "")
})))

function addTagRow() {
  tagRows.value.unshift({ __rowKey: uid("tag"), tag: "" })
}

function saveTags() {
  const seen = new Set()
  const data = []

  for (const row of tagRows.value) {
    const tag = String(row.tag || "").trim()
    const key = tag.toLowerCase()
    if (!tag || seen.has(key)) continue
    seen.add(key)
    data.push(tag)
  }

  return saveDataFile("tags", data.sort((a, b) => a.localeCompare(b)))
}
</script>

<style scoped>
.settings-page {
  height: 100%;
}

.settings-card {
  height: calc(100dvh - var(--v-layout-top, 0px) - var(--v-layout-bottom, 0px) - 32px);
  overflow: hidden;
}

.settings-layout {
  display: flex;
  height: 100%;
  min-height: 0;
}

.settings-tabs-wrap {
  flex: 0 0 210px;
  background: rgb(var(--v-theme-primary));
}

.settings-tabs {
  width: 100%;
}

.settings-tab {
  justify-content: flex-start;
  border-radius: 0 !important;
  width: 100%;
}

.mobile-settings-tabs {
  display: none;
}

.settings-tab-loader {
  padding: 24px 0;
}

.settings-content {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  padding: 18px;
}

.settings-tab-content {
  flex: 1 1 auto;
  min-height: 0;
}

.settings-tab-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.settings-tab-panel > :not(.settings-table-scroll) {
  flex-shrink: 0;
}

.settings-search {
  flex-grow: 0;
}

.settings-table-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding-bottom: 120px;
}

.settings-save-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 8;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  padding: 12px 18px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  background: rgba(var(--v-theme-surface), 0.86);
  backdrop-filter: blur(4px);
}

.settings-save-status {
  flex: 0 0 auto;
  min-width: 0;
}

.settings-save-button {
  align-self: center;
  flex-shrink: 0;
  width: 128px;
  max-width: 100%;
}

.settings-table-header th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: rgb(var(--v-theme-tableHeader, 245, 245, 245));
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.82);
}

.form-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  width: 100%;
}

.field-50 {
  flex: 1 1 calc(50% - 6px);
  min-width: 240px;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}


@media (max-width: 1400px) {
  .category-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .settings-col {
    flex: 0 0 100%;
    max-width: 100%;
  }

  .settings-layout {
    flex-direction: column;
  }

  .desktop-settings-tabs {
    display: none;
  }

  .mobile-settings-tabs {
    display: block;
  }

  .settings-tab {
    justify-content: center;
    width: auto;
  }

  .settings-content {
    padding: 12px;
  }

  .field-50 {
    min-width: 0;
    flex-basis: 100%;
  }

  .category-grid {
    grid-template-columns: 1fr;
  }
}
</style>
