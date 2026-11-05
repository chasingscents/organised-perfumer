<template>
  <v-table density="compact" class="ghs-classification-table">
    <thead>
      <tr>
        <th scope="col" class="text-left">Code</th>
        <th scope="col" class="text-left">Hazard statement</th>
        <th v-if="showNotes" scope="col" class="text-left ghs-app-notes">App notes</th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="row in rows"
        :key="row.code"
        :class="{ 'ghs-below-threshold': row.status === 'below', 'ghs-needs-data': row.status === 'review' }"
      >
        <td>
          <div class="d-flex align-center ga-1">
            <span class="font-weight-medium ghs-code">{{ row.code }}</span>
            <ClientOnly>
              <v-tooltip location="top" max-width="440">
                <template #activator="{ props: tipProps }">
                  <v-icon
                    v-bind="tipProps"
                    size="16"
                    class="text-grey-darken-1 source-info"
                    tabindex="0"
                    :aria-label="'Assessment and sources for ' + row.code"
                  >mdi-information-outline</v-icon>
                </template>
                <div class="source-tooltip">
                  <p class="mb-2">{{ row.reason }}</p>
                  <p v-if="row.hasConcentrationRange" class="mb-2">
                    The range covers neat-ingredient and supplied-stock classifications where the basis of a diluted stock's GHS data is unspecified.
                  </p>
                  <p v-if="row.hasProvisionalSources" class="mb-2">
                    Supplier classifications with unresolved data issues are evaluated as unconfirmed contributions.
                  </p>
                  <table class="source-table">
                    <thead><tr><th scope="col">Name</th><th scope="col">CAS</th><th scope="col" class="text-right">%</th></tr></thead>
                    <tbody>
                      <tr v-for="source in row.sources" :key="source.key">
                        <td>{{ source.name }}</td>
                        <td>{{ source.cas }}</td>
                        <td class="text-right source-percent">{{ sourcePercent(source) }}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div class="text-caption mt-1">Contribution to the calculation as % w/w of the complete formula.</div>
                </div>
              </v-tooltip>
              <template #fallback>
                <v-icon size="16" class="text-grey-darken-1 source-info" :title="sourceTitle(row)">mdi-information-outline</v-icon>
              </template>
            </ClientOnly>
          </div>
          <div v-if="row.categories?.length" class="text-caption text-medium-emphasis">
            Category {{ row.categories.join(", ") }}
          </div>
        </td>
        <td class="hazard-statement">{{ row.statement }}</td>
        <td v-if="showNotes" class="ghs-app-notes">{{ row.appNotes }}</td>
      </tr>
      <tr v-if="rows.length === 0">
        <td :colspan="showNotes ? 3 : 2" class="text-center text-grey py-3">
          {{ totalGrams > 0 ? "No recorded GHS codes" : "No ingredients selected" }}
        </td>
      </tr>
    </tbody>
  </v-table>
</template>

<script setup>
defineProps({
  rows: { type: Array, default: () => [] },
  totalGrams: { type: Number, default: 0 },
  showNotes: { type: Boolean, default: false }
})

function formatPercent(value) {
  return value > 0 && value < 0.001 ? "<0.001" : Number(value || 0).toFixed(3)
}

function sourcePercent(source) {
  const lower = formatPercent(source.percent)
  const upper = formatPercent(source.maxPercent)
  return Math.abs(source.percent - source.maxPercent) < 1e-10 ? `${lower}%` : `${lower}–${upper}%`
}

function sourceTitle(row) {
  return row.reason + " " + row.sources.map(source => `${source.name} (${source.cas}): ${sourcePercent(source)}`).join("; ")
}
</script>

<style scoped>
.ghs-classification-table :deep(table) { width: 100%; }
.ghs-classification-table :deep(td),
.ghs-classification-table :deep(th) { padding: 6px 8px; vertical-align: top; }
.hazard-statement, .ghs-app-notes { overflow-wrap: anywhere; }
.ghs-app-notes { min-width: 220px; max-width: 520px; color: #9e9e9e; background-color: rgba(var(--v-theme-on-surface), 0.04); white-space: pre-line; }
.ghs-below-threshold { color: rgba(var(--v-theme-on-surface), 0.38); }
.ghs-needs-data { background-color: rgba(var(--v-theme-warning), 0.16); }
.source-info { cursor: help; flex-shrink: 0; }
.source-info:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
.source-tooltip { max-width: min(420px, calc(100vw - 48px)); overflow-x: auto; }
.source-table { width: 100%; border-collapse: collapse; line-height: 1.35; }
.source-table th, .source-table td { padding: 4px 6px; border-bottom: 1px solid currentColor; text-align: left; vertical-align: top; }
.source-percent { white-space: nowrap; }
</style>
