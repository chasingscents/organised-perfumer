<template>
  <v-dialog :model-value="modelValue" max-width="560" :persistent="isReading" @update:model-value="updateOpen">
    <v-card>
      <v-card-title class="text-h6">{{ title }}</v-card-title>
      <v-card-text>
        <v-alert v-if="warning" type="warning" variant="tonal" density="compact" class="mb-3" role="alert">
          {{ warning }}
        </v-alert>
        <input
          ref="fileInput"
          type="file"
          accept=".json,application/json"
          multiple
          class="d-none"
          :disabled="isReading"
          @change="onFilePicked"
        />
        <button
          type="button"
          class="json-drop-zone"
          :class="{ 'is-dragging': isDragging }"
          :disabled="isReading"
          :aria-busy="isReading"
          @click="fileInput?.click()"
          @dragenter.prevent.stop="onFileDragOver"
          @dragover.prevent.stop="onFileDragOver"
          @dragleave.prevent.stop="isDragging = false"
          @drop.prevent.stop="onFileDropped"
        >
          <v-icon icon="mdi-upload" size="32" />
          <span class="font-weight-medium">{{ isReading ? "Reading JSON files..." : "Drag and drop JSON files here" }}</span>
          <span v-if="!isReading" class="text-caption text-grey">or click to choose files</span>
        </button>
        <ul v-if="pendingFiles.length" class="import-file-list">
          <li v-for="file in pendingFiles" :key="file.id">
            <div class="import-file-details">
              <span class="import-file-name">{{ file.name }}</span>
              <span class="text-caption text-grey">{{ file.records.length }} {{ itemLabel }}</span>
            </div>
            <v-btn
              icon="mdi-close"
              size="x-small"
              variant="text"
              color="btnDelete"
              :aria-label="'Remove ' + file.name"
              :disabled="isReading"
              @click="removeFile(file.id)"
            />
          </li>
        </ul>
        <v-progress-linear v-if="isReading" indeterminate color="loading" :height="4" class="mt-3" />
        <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-3 import-error">
          {{ error }}
        </v-alert>
      </v-card-text>
      <v-card-actions class="modal-actions-split">
        <v-btn variant="text" :disabled="isReading" @click="updateOpen(false)">Cancel</v-btn>
        <v-spacer />
        <v-btn color="btnConfirm" variant="flat" :disabled="isReading || !pendingFiles.length" @click="confirmFiles">
          Confirm
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { onBeforeUnmount, ref, watch } from "vue"

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: "Upload JSON" },
  parseRecords: { type: Function, required: true },
  itemLabel: { type: String, default: "entries" },
  warning: { type: String, default: "" }
})
const emit = defineEmits(["update:modelValue", "confirm"])
const fileInput = ref(null)
const pendingFiles = ref([])
const error = ref("")
const isReading = ref(false)
const isDragging = ref(false)
let fileSequence = 0
let readVersion = 0

function resetFiles() {
  readVersion++
  pendingFiles.value = []
  error.value = ""
  isReading.value = false
  isDragging.value = false
  if (fileInput.value) fileInput.value.value = ""
}

watch(() => props.modelValue, resetFiles, { flush: "sync" })
onBeforeUnmount(resetFiles)

function updateOpen(value) {
  if (isReading.value) return
  if (!value) resetFiles()
  emit("update:modelValue", value)
}

function onFileDragOver(event) {
  if (isReading.value) return
  isDragging.value = true
  if (event.dataTransfer) event.dataTransfer.dropEffect = "copy"
}

async function onFileDropped(event) {
  isDragging.value = false
  await stageFiles(Array.from(event?.dataTransfer?.files || []))
}

async function onFilePicked(event) {
  const input = event?.target
  try {
    await stageFiles(Array.from(input?.files || []))
  } finally {
    if (input) input.value = ""
  }
}

async function stageFiles(files) {
  if (!props.modelValue || isReading.value || !files.length) return
  const version = ++readVersion
  const parseRecords = props.parseRecords
  error.value = ""
  isReading.value = true
  isDragging.value = false
  const errors = []

  try {
    for (const file of files) {
      if (version !== readVersion) return
      try {
        if (!/\.json$/i.test(file.name || "")) throw new Error("Choose a .json file.")
        const text = await file.text()
        if (version !== readVersion) return
        const records = await parseRecords(JSON.parse(text.replace(/^\uFEFF/, "")), file)
        if (version !== readVersion) return
        if (!Array.isArray(records)) throw new Error("Expected an array of records.")
        pendingFiles.value.push({ id: ++fileSequence, name: file.name, records })
      } catch (err) {
        if (version !== readVersion) return
        const message = err instanceof SyntaxError
          ? "Could not read this JSON file. Check that it contains valid JSON."
          : err?.message || "Could not read this JSON file."
        errors.push(`${file.name || "File"}: ${message}`)
      }
    }
    if (version === readVersion) error.value = errors.join("\n")
  } finally {
    if (version === readVersion) isReading.value = false
  }
}

function removeFile(id) {
  if (isReading.value) return
  pendingFiles.value = pendingFiles.value.filter(file => file.id !== id)
}

function confirmFiles() {
  if (!props.modelValue || isReading.value || !pendingFiles.value.length) return
  emit("confirm", pendingFiles.value.flatMap(file => file.records))
  updateOpen(false)
}
</script>

<style scoped>
.json-drop-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 160px;
  padding: 24px 16px;
  border: 2px dashed rgba(var(--v-theme-on-surface), 0.3);
  border-radius: 10px;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.json-drop-zone > * {
  pointer-events: none;
}

.json-drop-zone:hover,
.json-drop-zone.is-dragging {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.08);
}

.json-drop-zone:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 3px;
}

.json-drop-zone:disabled {
  cursor: wait;
  opacity: 0.65;
}

.import-file-list {
  list-style: none;
  margin: 16px 0 0;
  padding: 0;
  max-height: 240px;
  overflow-y: auto;
}

.import-file-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}

.import-file-list li:last-child {
  border-bottom: 0;
}

.import-file-details {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
}

.import-file-name {
  white-space: normal;
  overflow-wrap: anywhere;
}

.import-error {
  white-space: pre-line;
}
</style>
