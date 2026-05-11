<template>
  <section class="universe-shell" aria-label="ND8 Universe">
    <UniverseScene
      ref="sceneRef"
      :nodes="plugins.nodes"
      :focused-node="selectedNode"
      @ready="sceneReady = true"
      @select-node="handleSelectNode"
    />

    <Transition name="universe-loader" appear>
      <div v-if="showUniverseLoader" class="universe-loader" role="status" aria-live="polite">
        <div class="universe-loader__field" aria-hidden="true"></div>
        <div class="universe-loader__center">
          <div class="universe-loader__mark" aria-hidden="true">
            <span class="universe-loader__orbit universe-loader__orbit--wide"></span>
            <span class="universe-loader__orbit universe-loader__orbit--tilt"></span>
            <span class="universe-loader__pulse"></span>
            <img src="/favicon.svg" alt="" class="universe-loader__logo" />
          </div>
          <p class="universe-loader__eyebrow">Universe Mode</p>
          <p class="universe-loader__status">{{ loadingMessage }}</p>
          <div class="universe-loader__meter" aria-hidden="true">
            <span></span>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── HUD (hidden in cinematic mode) ─────────────────────── -->
    <Transition name="hud">
      <div v-if="!uiStore.hideUI" class="universe-shell__hud">
        <!-- Top bar: brand + hints + centered search -->
        <div class="universe-shell__topbar">
          <div class="universe-shell__topbar-left">
            <div
              class="universe-shell__brand"
              :class="{ 'universe-shell__brand--ready': sceneReady }"
            >
              <img src="/favicon.svg" alt="" class="universe-shell__logo" />
              <span class="universe-shell__wordmark">nd.8</span>
            </div>

            <div class="universe-shell__hints">
              <span><kbd>Esc</kbd> Exit Universe</span>
              <span><kbd>F</kbd> Fly Mode</span>
              <span><kbd>Space</kbd> Unfocus</span>
              <span><kbd>/</kbd> Search</span>
              <span><kbd>H</kbd> Cinematic</span>
            </div>
          </div>

          <div class="universe-shell__topbar-search">
            <UniverseSearchBar
              :nodes="plugins.nodes"
              @select="handleSearchSelect"
              @pointerdown.stop
              @wheel.stop
            />
          </div>
        </div>

        <!-- Intro overlay (loading / empty state) -->
        <div v-if="showIntro" class="universe-shell__intro">
          <p class="universe-shell__eyebrow">Universe Mode</p>
          <h1 class="universe-shell__title">{{ heroTitle }}</h1>
          <p class="universe-shell__subtitle">{{ heroSubtitle }}</p>
        </div>
      </div>
    </Transition>

    <!-- ── Plugin detail panel (shown even in cinematic) ──────── -->
    <Transition name="panel">
      <UniversePluginPanel
        v-if="selectedNode && !uiStore.hideUI"
        :node="selectedNode"
        class="universe-shell__panel"
        @pointerdown.stop
        @pointerup.stop
        @click.stop
        @wheel.stop
        @close="handleSelectNode(null)"
      />
    </Transition>

    <!-- Error -->
    <div v-if="error" class="universe-shell__error" role="alert">{{ error }}</div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useUniversePlugins } from '../composables/useUniversePlugins'
import { useUniverseUiStore } from '../stores/universeUiStore'
import UniverseScene from './UniverseScene.vue'
import UniverseSearchBar from './UniverseSearchBar.vue'
import UniversePluginPanel from './UniversePluginPanel.vue'

// ── Data ──────────────────────────────────────────────────────
const { plugins, isLoading, error, hasPlugins } = useUniversePlugins()
const uiStore = useUniverseUiStore()
const sceneReady = ref(false)
const loaderMinimumElapsed = ref(false)
const loadingStepIndex = ref(0)
const selectedNodeId = ref<string | null>(null)
const sceneRef = ref<InstanceType<typeof UniverseScene> | null>(null)

let loadingStepInterval: number | undefined
let loadingMinimumTimer: number | undefined

const loadingSteps = [
  'Mapping plugin constellations',
  'Warming galaxy core',
  'Aligning orbit paths',
  'Calibrating spatial artifacts',
]

const selectedNode = computed(
  () => plugins.value.nodes.find((n) => n.id === selectedNodeId.value) ?? null,
)

const loadingMessage = computed(() => loadingSteps[loadingStepIndex.value]!)
const showUniverseLoader = computed(
  () =>
    !uiStore.hideUI &&
    !error.value &&
    (!loaderMinimumElapsed.value || isLoading.value || !sceneReady.value),
)

// ── Intro state ───────────────────────────────────────────────
const showIntro = computed(() => isLoading.value || Boolean(error.value) || !hasPlugins.value)
const heroTitle = computed(() => {
  if (isLoading.value) return 'Plugin galaxy initializing'
  if (!hasPlugins.value) return 'Universe is waiting for plugins'
  return `${plugins.value.totalPlugins} plugins in orbit`
})
const heroSubtitle = computed(() => {
  if (isLoading.value) return 'A cinematic map for exploring ND8 integrations is coming online.'
  if (!hasPlugins.value)
    return 'When plugins are available, they will appear here as a calm galaxy of integrations.'
  return `${plugins.value.categories.length} categories · ${plugins.value.connectedPlugins} connected`
})

// ── Selection ─────────────────────────────────────────────────
function handleSelectNode(id: string | null) {
  selectedNodeId.value = id
}

// ── Search select ─────────────────────────────────────────────
// If the plugin is already in the scene → just focus.
// If not (future marketplace) → we'd spawn it first (placeholder for now).
function handleSearchSelect(nodeId: string) {
  const existingNode = plugins.value.nodes.find((n) => n.id === nodeId)
  if (existingNode) {
    // Already in scene → focus camera on it
    selectedNodeId.value = nodeId
  } else {
    // Future: spawn plugin at the opposite side of the camera, then focus
    // For now just select so panel opens
    selectedNodeId.value = nodeId
  }
}

// ── Keyboard: H toggles cinematic ────────────────────────────
function onKey(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return
  if (e.key === 'h' || e.key === 'H') uiStore.toggleUI()
}

function onIntent(e: Event) {
  const intent = (e as CustomEvent).detail
  if (intent?.type === 'plugin.open' && intent.target) {
    handleSearchSelect(intent.target)
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  window.addEventListener('nod8:command-palette:intent', onIntent)
  loadingStepInterval = window.setInterval(() => {
    loadingStepIndex.value = (loadingStepIndex.value + 1) % loadingSteps.length
  }, 820)
  loadingMinimumTimer = window.setTimeout(() => {
    loaderMinimumElapsed.value = true
  }, 2600)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('nod8:command-palette:intent', onIntent)
  if (loadingStepInterval) window.clearInterval(loadingStepInterval)
  if (loadingMinimumTimer) window.clearTimeout(loadingMinimumTimer)
})
</script>

<style scoped>
/* ── Shell ───────────────────────────────────────────────────── */
.universe-shell {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: 'Inter', 'Outfit', system-ui, sans-serif;
}

.universe-loader {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 48%, rgba(136, 187, 255, 0.14), transparent 24rem),
    radial-gradient(circle at 50% 54%, rgba(167, 139, 250, 0.12), transparent 18rem), #01030a;
  color: rgba(247, 250, 255, 0.92);
  pointer-events: auto;
  z-index: 50;
}

.universe-loader__field {
  position: absolute;
  inset: -20%;
  background-image:
    radial-gradient(circle, rgba(255, 255, 255, 0.72) 0 1px, transparent 1.3px),
    radial-gradient(circle, rgba(136, 187, 255, 0.48) 0 1px, transparent 1.2px),
    radial-gradient(circle, rgba(167, 139, 250, 0.32) 0 1px, transparent 1.4px);
  background-position:
    0 0,
    48px 38px,
    90px 110px;
  background-size:
    160px 160px,
    230px 230px,
    310px 310px;
  opacity: 0.42;
  transform: rotate(-10deg) scale(1.12);
  animation: universe-loader-field 18s linear infinite;
}

.universe-loader__center {
  position: relative;
  display: flex;
  align-items: center;
  flex-direction: column;
  text-align: center;
  transform: translateY(-2vh);
}

.universe-loader__mark {
  position: relative;
  display: grid;
  width: 126px;
  height: 126px;
  place-items: center;
  margin-bottom: 22px;
}

.universe-loader__logo {
  position: relative;
  width: 34px;
  height: 34px;
  filter: drop-shadow(0 0 18px rgba(255, 136, 68, 0.64));
  animation: universe-loader-logo 1.9s ease-in-out infinite;
  z-index: 2;
}

.universe-loader__pulse {
  position: absolute;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(255, 136, 68, 0.24),
    rgba(136, 187, 255, 0.05) 54%,
    transparent 70%
  );
  animation: universe-loader-pulse 2.2s ease-in-out infinite;
}

.universe-loader__orbit {
  position: absolute;
  inset: 10px;
  border: 1px solid rgba(136, 187, 255, 0.24);
  border-top-color: rgba(255, 255, 255, 0.64);
  border-radius: 50%;
  box-shadow: 0 0 28px rgba(136, 187, 255, 0.08);
}

.universe-loader__orbit--wide {
  animation: universe-loader-orbit 3.6s linear infinite;
}

.universe-loader__orbit--tilt {
  inset: 25px 5px;
  border-color: rgba(167, 139, 250, 0.16);
  border-right-color: rgba(255, 136, 68, 0.5);
  transform: rotateX(62deg) rotateZ(-18deg);
  animation: universe-loader-orbit-tilt 4.8s linear infinite;
}

.universe-loader__eyebrow {
  margin: 0 0 8px;
  color: rgba(136, 187, 255, 0.62);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.universe-loader__status {
  min-width: 240px;
  margin: 0;
  color: rgba(247, 250, 255, 0.82);
  font-size: 13px;
  letter-spacing: 0.02em;
}

.universe-loader__meter {
  width: 180px;
  height: 1px;
  margin-top: 20px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.12);
}

.universe-loader__meter span {
  display: block;
  width: 42%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(136, 187, 255, 0.9),
    rgba(255, 136, 68, 0.72),
    transparent
  );
  animation: universe-loader-meter 1.35s ease-in-out infinite;
}

/* ── HUD ─────────────────────────────────────────────────────── */
.universe-shell__hud {
  position: absolute;
  inset: 0;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  z-index: 10;
}

/* ── Top bar ─────────────────────────────────────────────────── */
.universe-shell__topbar {
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 14px 20px;
  pointer-events: auto;
}

.universe-shell__topbar-left {
  display: flex;
  align-items: center;
  gap: 18px;
  min-width: 0;
  max-width: calc(50vw - 250px);
}

.universe-shell__topbar-search {
  position: absolute;
  top: 14px;
  left: 50%;
  width: clamp(160px, 42vw, 420px);
  transform: translateX(-50%);
  pointer-events: auto;
}

/* ── Brand ───────────────────────────────────────────────────── */
.universe-shell__brand {
  position: relative;
  top: auto;
  left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  opacity: 0;
  transform: translateY(-6px);
  transition:
    opacity 0.6s ease,
    transform 0.6s ease;
  flex-shrink: 0;
  z-index: 1;
}
.universe-shell__brand--ready {
  opacity: 1;
  transform: translateY(0);
}
.universe-shell__logo {
  width: 22px;
  height: 22px;
}
.universe-shell__wordmark {
  font-size: 14px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 0.04em;
}

:deep(.usearch) {
  width: 100%;
  max-width: none;
  flex: none;
}

/* ── Intro ───────────────────────────────────────────────────── */
.universe-shell__intro {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px;
  pointer-events: none;
}
.universe-shell__eyebrow {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(136, 187, 255, 0.6);
  margin: 0 0 10px;
}
.universe-shell__title {
  font-size: clamp(24px, 4vw, 40px);
  font-weight: 700;
  color: rgba(255, 255, 255, 0.88);
  margin: 0 0 12px;
  line-height: 1.2;
}
.universe-shell__subtitle {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4);
  max-width: 420px;
  line-height: 1.7;
  margin: 0;
}

/* ── Keyboard hints ──────────────────────────────────────────── */
.universe-shell__hints {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 0;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.25);
  pointer-events: none;
}

.universe-shell__hints span {
  white-space: nowrap;
}
.universe-shell__hints kbd {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 10px;
  font-family: inherit;
  color: rgba(255, 255, 255, 0.45);
  margin-right: 3px;
}

/* ── Plugin panel ────────────────────────────────────────────── */
.universe-shell__panel {
  position: absolute;
  top: 70px;
  right: 16px;
  z-index: 20;
}

/* ── Error ───────────────────────────────────────────────────── */
.universe-shell__error {
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 30;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: rgb(239, 68, 68);
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 12px;
}

/* ── Transitions ─────────────────────────────────────────────── */
.universe-loader-leave-active {
  transition:
    opacity 0.78s ease,
    transform 0.72s ease,
    filter 0.72s ease;
}

.universe-loader-leave-to {
  opacity: 0;
  filter: blur(12px);
  transform: scale(1.015);
}

.universe-loader-enter-active {
  transition:
    transform 0.72s ease,
    filter 0.72s ease;
}

.universe-loader-enter-from {
  filter: blur(12px);
  transform: scale(1.015);
}

.universe-loader-enter-active .universe-loader__center,
.universe-loader-enter-active .universe-loader__field,
.universe-loader-leave-active .universe-loader__center,
.universe-loader-leave-active .universe-loader__field {
  transition:
    opacity 0.72s ease,
    transform 0.72s ease;
}

.universe-loader-enter-from .universe-loader__center,
.universe-loader-enter-from .universe-loader__field,
.universe-loader-leave-to .universe-loader__center,
.universe-loader-leave-to .universe-loader__field {
  opacity: 0;
}

.universe-loader-enter-from .universe-loader__center {
  transform: translateY(calc(-2vh + 10px)) scale(0.98);
}

.universe-loader-leave-to .universe-loader__center {
  transform: translateY(calc(-2vh - 8px)) scale(0.985);
}

.hud-enter-active,
.hud-leave-active {
  transition: opacity 0.3s;
}
.hud-enter-from,
.hud-leave-to {
  opacity: 0;
}

.panel-enter-active {
  transition:
    opacity 0.22s,
    transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
}
.panel-leave-active {
  transition:
    opacity 0.15s,
    transform 0.15s;
}
.panel-enter-from {
  opacity: 0;
  transform: translateX(20px);
}
.panel-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

@keyframes universe-loader-field {
  from {
    background-position:
      0 0,
      48px 38px,
      90px 110px;
  }

  to {
    background-position:
      160px 160px,
      278px 268px,
      400px 420px;
  }
}

@keyframes universe-loader-logo {
  0%,
  100% {
    opacity: 0.86;
    transform: scale(1);
  }

  50% {
    opacity: 1;
    transform: scale(1.08);
  }
}

@keyframes universe-loader-pulse {
  0%,
  100% {
    opacity: 0.54;
    transform: scale(0.88);
  }

  50% {
    opacity: 1;
    transform: scale(1.18);
  }
}

@keyframes universe-loader-orbit {
  to {
    transform: rotate(360deg);
  }
}

@keyframes universe-loader-orbit-tilt {
  to {
    transform: rotateX(62deg) rotateZ(342deg);
  }
}

@keyframes universe-loader-meter {
  0% {
    transform: translateX(-120%);
  }

  100% {
    transform: translateX(260%);
  }
}

@media (max-width: 980px) {
  .universe-shell__topbar-left {
    max-width: calc(50vw - 110px);
  }

  .universe-shell__hints {
    display: none;
  }
}
</style>
