<!-- app.vue -->
<template>
  <v-app>
    <GlobalLoader />

    <div class="app-logo-overlay" aria-hidden="true">
      <img :src="CSLogo" alt="" draggable="false" />
    </div>

    <v-app-bar
      app
      color="primary"
      class="app-bar"
      :class="{ 'app-chrome-hidden': chromeHidden }"
    >
      <v-toolbar-title class="app-title">Ingredient Organiser</v-toolbar-title>

      <div class="app-logo-center">
        <v-img
          :src="CSLogo"
          alt="CS Logo"
          height="180"
          width="180"
          contain
        />
      </div>

      <v-spacer />

      <div class="desktop-main-nav">
        <v-btn variant="text" to="/" router :color="navButtonColor('/')">Home</v-btn>
        <v-btn
          variant="text"
          to="/ingredient-organiser"
          router
          :color="navButtonColor('/ingredient-organiser')"
        >
          Ingredient Organiser
        </v-btn>
        <v-btn variant="text" to="/settings" router :color="navButtonColor('/settings')">
          Settings
        </v-btn>
      </div>

      <v-menu location="bottom end">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            class="mobile-main-nav"
            icon="mdi-menu"
            variant="text"
            aria-label="Main navigation"
          />
        </template>

        <v-list density="compact">
          <v-list-item to="/" router :active="route.path === '/'" :color="navButtonColor('/')">
            <v-list-item-title>Home</v-list-item-title>
          </v-list-item>
          <v-list-item
            to="/ingredient-organiser"
            router
            :active="route.path === '/ingredient-organiser'"
            :color="navButtonColor('/ingredient-organiser')"
          >
            <v-list-item-title>Ingredient Organiser</v-list-item-title>
          </v-list-item>
          <v-list-item
            to="/settings"
            router
            :active="route.path === '/settings'"
            :color="navButtonColor('/settings')"
          >
            <v-list-item-title>Settings</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-app-bar>

    <v-main class="bg-body">
      <NuxtPage />
    </v-main>

    <v-footer
      :key="isFooterFixed ? 'fixed-footer' : 'flow-footer'"
      :app="isFooterFixed"
      class="footer-bar"
      color="footer"
      height="auto"
    >
      <span class="footer-copyright">©2026 Chasing Scents. MIT Licensed.</span>
      <div class="footer-content">
        Support us at <a href="https://chasingscents.com" class="footer-support-link" target="_blank" rel="noopener noreferrer">chasingscents.com</a>
      </div>
      <div class="footer-right">
        <a
          href="https://instagram.com/chasingscents"
          class="footer-instagram-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          <v-icon icon="mdi-instagram" size="18" aria-hidden="true" />
          <span>@chasingscents</span>
        </a>
      </div>
    </v-footer>

    <ClientOnly>
      <v-dialog
        v-model="riskDialog"
        persistent
        max-width="640"
        scrim="black"
      >
        <v-card>
          <v-card-title class="text-h5 text-center">Before you continue</v-card-title>

          <v-card-text class="text-body-1">
            <p class="mb-3">
              This website and its tools are provided for convenience only. Any calculations,
              regulatory summaries, ingredient information, or other outputs may contain errors,
              omissions, or outdated information.
            </p>

            <p class="mb-0">
              You are responsible for independently checking all results, complying with any
              applicable laws, standards, and safety requirements, and deciding whether the
              information is suitable for your use. By continuing, you agree that you use this
              website at your own risk and responsibility.
            </p>
          </v-card-text>

          <v-card-actions class="risk-dialog-actions">
            <v-spacer />
            <v-btn color="btnImportant" variant="flat" @click="acceptRiskNotice" centered>
              I Agree
            </v-btn>
            <v-spacer></v-spacer>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </ClientOnly>
  </v-app>
</template>

<script setup>
import GlobalLoader from "~/components/GlobalLoader.vue"
import { computed, onBeforeUnmount, onMounted, ref } from "vue"
import { useDisplay } from "vuetify"
import CSLogo from "~/assets/img/CSLogo Transparent.svg?url";

const route = useRoute()
const { mdAndUp } = useDisplay()
const footerReady = ref(false)
const isFooterFixed = computed(() => footerReady.value && mdAndUp.value)
const chromeHidden = ref(false)
const riskDialog = ref(false)
const RISK_NOTICE_SESSION_KEY = "ingredientOrganiser.riskNoticeAccepted"

function navButtonColor(path) {
  return route.path === path ? "btnActive" : undefined
}

function acceptRiskNotice() {
  riskDialog.value = false

  if (typeof window === "undefined") return
  window.sessionStorage.setItem(RISK_NOTICE_SESSION_KEY, "true")
}

function checkRiskNotice() {
  if (typeof window === "undefined") return
  riskDialog.value = window.sessionStorage.getItem(RISK_NOTICE_SESSION_KEY) !== "true"
}

function onWindowScroll() {
  if (typeof window === "undefined") return
  chromeHidden.value = window.scrollY > 8
}

onMounted(() => {
  footerReady.value = true
  if (typeof window === "undefined") return
  window.addEventListener("scroll", onWindowScroll, { passive: true })
  onWindowScroll()
  checkRiskNotice()
})

onBeforeUnmount(() => {
  if (typeof window === "undefined") return
  window.removeEventListener("scroll", onWindowScroll)
})
</script>

<style scoped>
.app-logo-overlay {
  position: fixed;
  inset: 0;
  z-index: 1999;
  display: grid;
  place-items: center;
  opacity: 0.01;
  pointer-events: none;
  user-select: none;
}

.app-logo-overlay img {
  display: block;
  width: min(80vw, 1200px);
  max-height: 60dvh;
  object-fit: contain;
}

.app-bar {
  position: relative;
  transition: transform 180ms ease, opacity 180ms ease;
}

.app-title {
  flex: 0 0 auto;
}

.app-logo-center {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 2;
}

.desktop-main-nav {
  display: flex;
  align-items: center;
}

.mobile-main-nav {
  display: none;
}

.footer-bar {
  flex: 0 0 auto;
  font-size: 0.85rem;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 6px 16px;
  min-height: 34px;
  padding: 6px 16px;
}

.footer-content {
  grid-column: 1;
  grid-row: 1;
  justify-self: start;
  text-align: left;
}

.footer-support-link {
  color: #0645ad;
  text-decoration: underline;
}

.footer-instagram-link {
  color: inherit;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.footer-right {
  grid-column: 3;
  grid-row: 1;
  justify-self: end;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.footer-copyright {
  grid-column: 2;
  grid-row: 1;
  justify-self: center;
  font-size: 0.75rem;
  text-align: center;
}

@media (width < 960px) {
  .footer-bar {
    position: static;
    width: 100%;
    margin-top: auto;
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .footer-copyright {
    grid-column: 1 / -1;
    grid-row: 1;
  }

  .footer-content {
    grid-column: 1;
    grid-row: 2;
  }

  .footer-right {
    grid-column: 2;
    grid-row: 2;
  }

  .app-title,
  .desktop-main-nav {
    display: none;
  }

  .mobile-main-nav {
    display: inline-flex;
  }
}

@media (max-width: 760px) {
  .app-bar.app-chrome-hidden {
    transform: translateY(-110%);
    opacity: 0;
    pointer-events: none;
  }
}

.risk-dialog-actions {
  padding-inline: 16px;
  padding-bottom: 16px;
}

</style>

<style>
.modal-actions-split {
  justify-content: flex-start;
  flex-shrink: 0;
  gap: 8px;
  padding: 8px 16px 14px;
}

/* Vuetify 3 fallback: animate the segments with transforms instead of insets. */
.v-progress-linear.v-progress-linear--active > .v-progress-linear__indeterminate > .long,
.v-progress-linear.v-progress-linear--active > .v-progress-linear__indeterminate > .short {
  left: 0;
  right: auto;
  width: 40%;
  animation: cs-progress-indeterminate 1.6s linear infinite;
  will-change: transform;
}

.v-progress-linear.v-progress-linear--active > .v-progress-linear__indeterminate > .short {
  animation-delay: -0.8s;
}

.v-progress-linear.v-progress-linear--active.v-progress-linear--reverse > .v-progress-linear__indeterminate > .long,
.v-progress-linear.v-progress-linear--active.v-progress-linear--reverse > .v-progress-linear__indeterminate > .short {
  animation-name: cs-progress-indeterminate-reverse;
}

@keyframes cs-progress-indeterminate {
  from {
    transform: translate3d(-100%, 0, 0);
  }
  to {
    transform: translate3d(250%, 0, 0);
  }
}

@keyframes cs-progress-indeterminate-reverse {
  from {
    transform: translate3d(250%, 0, 0);
  }
  to {
    transform: translate3d(-100%, 0, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .v-progress-linear.v-progress-linear--active > .v-progress-linear__indeterminate > .long,
  .v-progress-linear.v-progress-linear--active > .v-progress-linear__indeterminate > .short,
  .v-progress-linear.v-progress-linear--active.v-progress-linear--reverse > .v-progress-linear__indeterminate > .long,
  .v-progress-linear.v-progress-linear--active.v-progress-linear--reverse > .v-progress-linear__indeterminate > .short {
    animation: none;
    transform: translate3d(75%, 0, 0);
    will-change: auto;
  }
}
</style>
