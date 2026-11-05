<template>
  <v-dialog :model-value="modelValue" max-width="760" scrollable @update:model-value="updateOpen">
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between text-h6">
        <span>{{ infoItem?.name || "Ingredient Information" }}</span>
        <v-btn icon="mdi-close" variant="text" size="small" aria-label="Cancel ingredient information" @click="updateOpen(false)" />
      </v-card-title>

      <v-card-text>
        <section class="form-section">
          <div class="section-title">Basic Information</div>

          <v-table density="compact">
            <tbody>
              <tr><td class="font-weight-medium">CAS</td><td>{{ casDisplay(infoItem?.cas) }}</td></tr>
              <tr><td class="font-weight-medium">INCI Name</td><td>{{ infoItem?.inci || infoItem?.inciName || "-" }}</td></tr>
              <tr><td class="font-weight-medium">Concentration</td><td>{{ infoItem?.concentration ?? 100 }}%</td></tr>
              <tr><td class="font-weight-medium">Solvent</td><td>{{ infoItem?.solvent || "-" }}</td></tr>
              <tr><td class="font-weight-medium">Tenacity</td><td>{{ infoItem?.tenacity ?? "-" }}</td></tr>
              <tr><td class="font-weight-medium">IFRA Limit</td><td>{{ infoIfraLimit }}</td></tr>
              <tr><td class="font-weight-medium">Strength</td><td>{{ infoItem?.strength || "-" }}</td></tr>
              <tr>
                <td class="font-weight-medium">Tags</td>
                <td>
                  <div v-if="infoTags.length" class="d-flex flex-wrap ga-1">
                    <v-chip v-for="tag in infoTags" :key="tag" size="x-small" variant="tonal">{{ tag }}</v-chip>
                  </div>
                  <span v-else>-</span>
                </td>
              </tr>
              <tr><td class="font-weight-medium">Description</td><td class="white-space-pre-wrap">{{ infoItem?.description || "-" }}</td></tr>
            </tbody>
          </v-table>

          <v-btn
            class="more-info-toggle"
            block
            variant="text"
            :color="hasFurtherInfo ? undefined : 'disabled'"
            :disabled="!hasFurtherInfo"
            @click="hasFurtherInfo && (showInfoDetails = !showInfoDetails)"
          >
            <div v-if="!hasFurtherInfo" class="toggle-stack">
              <span class="text-grey-darken-4">- No Further Info -</span>
            </div>
            <div v-else-if="!showInfoDetails" class="toggle-stack">
              <span>More Info</span>
              <span class="toggle-triangle">▼</span>
            </div>
            <div v-else class="toggle-stack">
              <span class="toggle-triangle">▲</span>
              <span>Hide</span>
            </div>
          </v-btn>

          <v-expand-transition>
            <div v-if="showInfoDetails" class="more-info-section">
              <div class="info-subsection">
                <div class="text-subtitle-2 mb-1">Allergen Breakdown</div>
                <v-table v-if="infoAllergenList.length" density="compact">
                  <thead><tr><th class="text-left">Name</th><th class="text-left">CAS</th><th class="text-right">Conc. %</th></tr></thead>
                  <tbody>
                    <tr v-for="(x, idx) in infoAllergenList" :key="'allergen-' + idx">
                      <td>{{ x.name || "-" }}</td>
                      <td>{{ casDisplay(x.cas) }}</td>
                      <td class="text-right">{{ x.concentration ?? "-" }}</td>
                    </tr>
                  </tbody>
                </v-table>
                <div v-else class="text-caption text-grey">No allergen breakdown listed.</div>
              </div>

              <div class="info-subsection">
                <div class="text-subtitle-2 mb-1">IFRA Breakdown</div>
                <v-table v-if="infoIfraList.length" density="compact">
                  <thead><tr><th class="text-left">Name</th><th class="text-left">CAS</th><th class="text-right">Conc. %</th></tr></thead>
                  <tbody>
                    <tr v-for="(x, idx) in infoIfraList" :key="'ifra-' + idx">
                      <td>{{ x.name || "-" }}</td>
                      <td>{{ casDisplay(x.cas) }}</td>
                      <td class="text-right">{{ x.concentration ?? "-" }}</td>
                    </tr>
                  </tbody>
                </v-table>
                <div v-else class="text-caption text-grey">No IFRA breakdown listed.</div>
              </div>

            </div>
          </v-expand-transition>

        </section>
      </v-card-text>

      <v-card-actions class="modal-actions-split">
        <v-btn variant="text" @click="updateOpen(false)">Cancel</v-btn>
        <v-spacer />
        <slot name="actions" :ingredient="infoItem" />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, ref, watch } from "vue"

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  ingredient: { type: Object, default: null }
})
const emit = defineEmits(["update:modelValue"])
const infoItem = computed(() => props.ingredient)
const showInfoDetails = ref(false)

// A new ingredient or a fresh opening starts at the basic information section.
watch(() => [props.modelValue, props.ingredient], () => {
  showInfoDetails.value = false
}, { flush: "sync" })

function updateOpen(open) {
  emit("update:modelValue", open)
}

function stringList(value) {
  return (Array.isArray(value) ? value : [value])
    .map(item => String(item || "").trim())
    .filter(Boolean)
}

function casDisplay(value) {
  return stringList(value).join(", ") || "-"
}

const infoTags = computed(() => stringList(infoItem.value?.tags))
const infoAllergenList = computed(() => Array.isArray(infoItem.value?.allergenList) ? infoItem.value.allergenList : [])
const infoIfraList = computed(() => Array.isArray(infoItem.value?.ifraList) ? infoItem.value.ifraList : [])
const infoIfraLimit = computed(() => {
  const value = infoItem.value?.ifraMaxLimit
  return value == null || String(value).trim() === "" ? "unrestricted" : `${value}%`
})
const hasFurtherInfo = computed(() =>
  infoAllergenList.value.length > 0 || infoIfraList.value.length > 0
)
</script>

<style scoped>
table { border-collapse: collapse; }
td, th { padding: 6px 8px; border-bottom: 1px solid #e0e0e0; vertical-align: top; }
th { font-weight: 600; }

.form-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.82);
  margin-bottom: 2px;
}

.white-space-pre-wrap { white-space: pre-wrap; }

.more-info-toggle {
  width: calc(100% - 24px);
  margin: 16px auto 0;
  min-height: 54px;
}

.toggle-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.1;
}

.toggle-triangle {
  font-size: 0.85rem;
  line-height: 1;
}

.more-info-section {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.info-subsection {
  padding: 10px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}
</style>
