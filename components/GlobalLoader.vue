<template>
  <ClientOnly>
    <div
      v-if="isLoading"
      class="page-loading-overlay"
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      <v-progress-circular
        indeterminate
        color="loading"
        :size="48"
        :width="4"
        aria-label="Loading page"
      />
    </div>
  </ClientOnly>
</template>

<script setup>
import { onBeforeUnmount, ref } from "vue"

const nuxtApp = useNuxtApp()
const router = useRouter()
const isLoading = ref(false)

function startLoading() {
  isLoading.value = true
}

function finishLoading() {
  isLoading.value = false
}

const stopListening = [
  nuxtApp.hook("page:loading:start", startLoading),
  nuxtApp.hook("page:start", startLoading),
  nuxtApp.hook("page:finish", finishLoading),
  nuxtApp.hook("page:loading:end", finishLoading),
  nuxtApp.hook("app:error", finishLoading),
  router.onError(finishLoading),
  router.afterEach((_to, _from, failure) => {
    if (failure) finishLoading()
  })
]

onBeforeUnmount(() => {
  finishLoading()
  for (const stop of stopListening) stop()
})
</script>

<style scoped>
.page-loading-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: grid;
  place-items: center;
  background: rgba(var(--v-theme-surface, 255, 255, 255), 0.7);
}
</style>
