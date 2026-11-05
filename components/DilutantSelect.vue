<template>
  <v-select
    :model-value="selectedValue"
    :items="dilutantOptions"
    :label="label"
    density="compact"
    hide-details
    clearable
    placeholder="-"
    @update:model-value="selectDilutant"
  />

  <v-dialog v-model="dialog" max-width="620" scrollable>
    <v-card>
      <v-card-title class="text-h6">Custom dilutant</v-card-title>
      <v-card-text>
        <v-text-field
          v-model="draftCode"
          label="Dilutant option"
          hint="Letters and numbers only"
          persistent-hint
          :error-messages="codeError"
          variant="outlined"
          density="comfortable"
          autofocus
          @update:model-value="draftCode = sanitizeDilutantCode($event)"
        />
        <v-autocomplete
          v-model="draftIngredientKey"
          :items="ingredientOptions"
          item-title="title"
          item-value="value"
          label="Matched ingredient (optional)"
          variant="outlined"
          density="comfortable"
          clearable
          hide-details
          class="mt-3"
        />
      </v-card-text>
      <v-card-actions class="modal-actions-split dilutant-dialog-actions">
        <v-btn variant="text" @click="dialog = false">Cancel</v-btn>
        <v-spacer />
        <v-btn variant="tonal" :disabled="!validCode" @click="confirmDilutant(false)">Continue without matching</v-btn>
        <v-btn color="btnConfirm" variant="flat" :disabled="!validCode || !matchedIngredient" @click="confirmDilutant(true)">Confirm</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue"
import { buildDilutantIngredientOptions, resolveMatchedDilutantIngredient, sanitizeDilutantCode, useDilutants } from "@/composables/useDilutants.js"

const props = defineProps({
  modelValue: { type: [String, Number], default: null },
  customDilutant: { type: String, default: null },
  ingredientMap: { type: Object, default: () => ({}) },
  label: { type: String, default: undefined }
})
const emit = defineEmits(["update:modelValue", "update:customDilutant"])
const { dilutants, dilutantOptions, hydrateDilutants, upsertDilutant } = useDilutants()
const dialog = ref(false)
const draftCode = ref("")
const draftIngredientKey = ref(null)
const ready = ref(false)
const ingredientOptions = computed(() => buildDilutantIngredientOptions(props.ingredientMap))
const matchedIngredient = computed(() => ingredientOptions.value.find(option => option.value === draftIngredientKey.value)?.raw || null)
const validCode = computed(() => /^[a-z0-9]+$/i.test(draftCode.value) && draftCode.value.toLowerCase() !== "other")
const codeError = computed(() => draftCode.value.toLowerCase() === "other" ? "Other is reserved for adding a custom dilutant." : "")

const selectedValue = computed(() => {
  const value = props.modelValue === "Other" && props.customDilutant ? props.customDilutant : props.modelValue
  const entry = dilutants.value.find(item => item.code.toLowerCase() === String(value || "").toLowerCase())
  return entry?.code || value
})

function registerExistingDilutant() {
  if (!ready.value) return
  const value = props.modelValue === "Other" ? props.customDilutant : props.modelValue
  if (value && /^[a-z0-9]+$/i.test(value) && String(value).toLowerCase() !== "other") upsertDilutant(value)
}

onMounted(() => {
  hydrateDilutants()
  ready.value = true
  registerExistingDilutant()
})
watch(() => [props.modelValue, props.customDilutant], registerExistingDilutant)

function selectDilutant(value) {
  if (value === "Other") {
    draftCode.value = props.modelValue === "Other" ? sanitizeDilutantCode(props.customDilutant) : ""
    const entry = dilutants.value.find(item => item.code.toLowerCase() === draftCode.value.toLowerCase())
    const ingredient = entry && resolveMatchedDilutantIngredient(entry.code, props.ingredientMap, dilutants.value)
    draftIngredientKey.value = ingredientOptions.value.find(option => option.raw === ingredient)?.value || null
    dialog.value = true
    return
  }
  emit("update:modelValue", value || null)
  emit("update:customDilutant", null)
}

function confirmDilutant(match) {
  if (!validCode.value || (match && !matchedIngredient.value)) return
  const ingredient = matchedIngredient.value
  const mapping = match ? {
    ingredientKey: draftIngredientKey.value,
    ingredientCas: Array.isArray(ingredient.cas) ? ingredient.cas[0] : ingredient.cas,
    ingredientName: ingredient.name
  } : undefined
  const entry = upsertDilutant(draftCode.value, mapping)
  emit("update:modelValue", entry.code)
  emit("update:customDilutant", null)
  dialog.value = false
}
</script>

<style scoped>
.dilutant-dialog-actions {
  flex-wrap: wrap;
}
</style>
