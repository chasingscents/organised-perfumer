<template>
  <v-card class="ghs-summary pa-3">
    <div class="ghs-summary-content" :inert="!acknowledged" :aria-hidden="!acknowledged ? 'true' : undefined">
      <div class="ghs-summary-heading mb-2">
        <div class="ghs-summary-title">
          <h2 class="text-h6">GHS Summary</h2>
          <ClientOnly>
            <v-tooltip location="top" max-width="400" :text="helpText">
              <template #activator="{ props: tipProps }">
                <v-btn v-bind="tipProps" icon="mdi-help-circle-outline" size="x-small" variant="text" aria-label="About the GHS Summary" />
              </template>
            </v-tooltip>
            <template #fallback>
              <v-icon size="18" :title="helpText" aria-label="About the GHS Summary">mdi-help-circle-outline</v-icon>
            </template>
          </ClientOnly>
        </div>
        <div class="d-flex align-center flex-shrink-0">
          <v-tooltip v-if="hydrated" location="top" :text="copyStatus || 'Copy GHS table'">
            <template #activator="{ props: tipProps }">
              <v-btn
                v-bind="tipProps"
                icon="mdi-content-copy"
                size="x-small"
                variant="text"
                aria-label="Copy GHS table"
                :disabled="summary.rows.length === 0"
                @click="copyGhsTable"
              />
            </template>
          </v-tooltip>
          <span v-else class="summary-copy-placeholder" aria-hidden="true" />
          <v-btn
            icon="mdi-arrow-expand"
            size="x-small"
            variant="text"
            title="Expand GHS Summary"
            aria-label="Expand GHS Summary"
            @click="informationDialog = true"
          />
        </div>
      </div>
      <div class="ghs-summary-scroll">
        <GHSClassificationTable :rows="summary.rows" :total-grams="summary.totalGrams" />
      </div>
      <div class="mt-2 text-caption">Data accuracy is not guaranteed.</div>
      <span class="copy-feedback" role="status" aria-live="polite">{{ copyStatus }}</span>
    </div>

    <div v-if="!acknowledged" class="ghs-ack-overlay" role="region" aria-label="GHS Summary acknowledgement">
      <div class="ghs-ack-content">
        <p class="text-body-2 font-weight-medium text-white mb-3">You must double check against your supplier's SDS, use this only as a guide.</p>
        <v-btn color="btnImportant" variant="flat" @click="acknowledged = true">I Understand</v-btn>
      </div>
    </div>

    <v-dialog v-model="informationDialog" max-width="1100" scrollable :persistent="false" @click:outside="informationDialog = false">
      <v-card class="ghs-information-dialog">
        <v-card-title class="d-flex align-center justify-space-between">
          <span>GHS Information</span>
          <v-btn icon="mdi-close" size="small" variant="text" title="Close GHS Information" aria-label="Close GHS Information" @click="informationDialog = false" />
        </v-card-title>
        <v-card-text>
          <p class="text-body-2 mb-4">This is intended for Australian GHS 7 thresholds for liquid mixtures</p>
          <h3 class="text-subtitle-1 font-weight-medium mb-2">SDS Section 2 Summary</h3>
          <div class="ghs-information-table mb-3">
            <GHSClassificationTable :rows="summary.rows" :total-grams="summary.totalGrams" show-notes />
          </div>
          <p class="text-caption text-medium-emphasis mb-3">Missing M-factors default to using fallback M=1. Supplied factors take priority.</p>
          <details v-if="summary.assumptions.length" class="ghs-data-details mb-3 text-caption">
            <summary>M-factor assumptions</summary>
            <ul class="pl-5 mt-1">
              <li v-for="assumption in summary.assumptions" :key="assumption.materialKey + assumption.factorName">
                {{ assumption.name }}: {{ assumption.factorName }} M={{ assumption.value }} assumed.
              </li>
            </ul>
          </details>

          <h3 class="text-subtitle-1 font-weight-medium mt-4 mb-2">SDS Section 3 Summary</h3>
          <p class="text-caption text-medium-emphasis mb-2">Calculated formula composition (% w/w), including dilutants. Confirm required disclosures, impurities and stock constituents against your supplier's SDS.</p>
          <div class="ghs-information-table">
            <v-table density="compact" class="ghs-composition-table">
              <thead>
                <tr><th scope="col">Name</th><th scope="col">CAS</th><th scope="col" class="text-right">% in formula</th><th scope="col" class="ghs-app-notes">App notes</th></tr>
              </thead>
              <tbody>
                <tr v-for="row in summary.section3" :key="row.key">
                  <td>{{ row.name }}</td><td>{{ row.cas }}</td><td class="text-right composition-percent">{{ formatCompositionPercent(row.percent) }}%</td><td class="ghs-app-notes">{{ row.notes }}</td>
                </tr>
                <tr v-if="summary.section3.length === 0"><td colspan="4" class="text-center text-grey py-3">No ingredients selected</td></tr>
              </tbody>
            </v-table>
          </div>

          <details v-if="summary.missing.length" class="ghs-data-details mt-3 text-caption">
            <summary>GHS information missing for {{ summary.missing.length }} source(s)</summary>
            <table class="source-table mt-1">
              <thead><tr><th scope="col">Name</th><th scope="col">CAS</th><th scope="col">Missing information</th></tr></thead>
              <tbody><tr v-for="source in summary.missing" :key="source.key"><td>{{ source.name }}</td><td>{{ source.cas }}</td><td>{{ source.reason }}</td></tr></tbody>
            </table>
          </details>
          <details v-if="summary.dataIssues.length" class="ghs-data-details mt-3 text-caption">
            <summary>Supplier data checks</summary>
            <div v-for="source in summary.dataIssues" :key="source.key" class="mt-2">
              <div class="font-weight-medium">{{ source.name }} ({{ source.cas }})</div>
              <ul class="pl-5"><li v-for="reason in source.reasons" :key="reason">{{ reason }}</li></ul>
            </div>
          </details>
        </v-card-text>
        <v-card-actions class="modal-actions-split">
          <v-btn variant="text" @click="informationDialog = false">Cancel</v-btn>
          <v-spacer />
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from "vue"
import { useDilutants } from "@/composables/useDilutants.js"
import { buildGhsSummary } from "@/utils/ghsHelpers.js"
import GHSClassificationTable from "@/components/GHSClassificationTable.vue"

const props = defineProps({
  items: { type: Array, default: () => [] },
  ingredientMap: { type: Object, default: () => ({}) },
  accordMap: { type: Object, default: () => ({}) }
})
const helpText = "This is intended for Australian GHS 7 thresholds for liquid mixtures. Grey rows are below the evaluated criteria. Yellow rows require review or more data. Missing M-factors default to using fallback M=1."
const acknowledged = ref(false)
const informationDialog = ref(false)
const hydrated = ref(false)
const copyStatus = ref("")
let copyTimer = null
onMounted(() => { hydrated.value = true })
onBeforeUnmount(() => { if (copyTimer !== null) clearTimeout(copyTimer) })
const { dilutants } = useDilutants()
const summary = computed(() => buildGhsSummary({
  items: props.items, ingredientMap: props.ingredientMap, accordMap: props.accordMap, dilutants: dilutants.value
}))

function formatCompositionPercent(value) {
  return value > 0 && value < 0.0001 ? "<0.0001" : Number(value || 0).toFixed(4)
}
function tsvEscape(value) {
  const text = String(value ?? "")
  return /[\t\n\r"]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text
}
const copyableGhsText = computed(() => [
  ["Code", "Hazard statement", "App notes"],
  ...summary.value.rows.map(row => [row.code, row.statement,
    [row.status === "below" ? "Below evaluated criteria" : "", row.appNotes].filter(Boolean).join("\n")])
].map(columns => columns.map(tsvEscape).join("\t")).join("\n"))

function copyTextFallback(text) {
  if (typeof document === "undefined") return false
  const field = document.createElement("textarea")
  const previouslyFocused = document.activeElement
  field.value = text
  field.setAttribute("readonly", "")
  field.style.position = "fixed"
  field.style.top = "-9999px"
  document.body.appendChild(field)
  try {
    field.select()
    return document.execCommand("copy")
  } finally {
    field.remove()
    previouslyFocused?.focus?.()
  }
}
async function copyGhsTable() {
  if (!acknowledged.value || !hydrated.value || !summary.value.rows.length) return
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) await navigator.clipboard.writeText(copyableGhsText.value)
    else if (!copyTextFallback(copyableGhsText.value)) throw new Error("Clipboard API unavailable")
    copyStatus.value = "Copied"
  } catch {
    copyStatus.value = "Copy failed"
  }
  if (copyTimer !== null) clearTimeout(copyTimer)
  copyTimer = setTimeout(() => { copyStatus.value = ""; copyTimer = null }, 1500)
}
</script>

<style scoped>
.ghs-summary { display: grid; position: relative; isolation: isolate; min-width: 0; min-height: 180px; }
.summary-copy-placeholder { display: inline-block; width: 32px; height: 32px; flex: 0 0 32px; }
.ghs-summary-content { grid-area: 1 / 1; min-width: 0; }
.ghs-summary-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 4px; }
.ghs-summary-title { display: flex; align-items: center; min-width: 0; gap: 2px; }
.ghs-summary-title h2 { min-width: 0; }
.ghs-summary-scroll { max-height: 33vh; overflow-y: auto; border: 2px solid transparent; border-radius: 10px; }
.ghs-ack-overlay { grid-area: 1 / 1; position: relative; z-index: 2; display: flex; align-items: center; justify-content: center; margin: -12px; padding: 16px; border-radius: inherit; background-color: rgba(var(--v-theme-disabled, 128, 128, 128), 0.8); }
.ghs-ack-content { max-width: 340px; text-align: center; color: rgb(var(--v-theme-on-surface)); }
.ghs-information-dialog { max-height: 85dvh; }
.ghs-information-table { overflow-x: auto; }
.ghs-composition-table :deep(table) { width: 100%; }
.ghs-composition-table :deep(td), .ghs-composition-table :deep(th) { padding: 6px 8px; text-align: left; vertical-align: top; }
.composition-percent { white-space: nowrap; }
.ghs-app-notes { color: #9e9e9e; background-color: rgba(var(--v-theme-on-surface), 0.04); white-space: pre-line; }
.ghs-data-details summary { cursor: pointer; }
.ghs-data-details summary:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
.source-table { width: 100%; border-collapse: collapse; }
.source-table th, .source-table td { padding: 4px 6px; border-bottom: 1px solid currentColor; text-align: left; vertical-align: top; }
.copy-feedback { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
.modal-actions-split { flex: 0 0 auto; }
</style>
