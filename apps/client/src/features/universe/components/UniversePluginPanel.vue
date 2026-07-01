<template>
  <aside class="upanel" aria-label="Plugin details">
    <!-- ── Header ───────────────────────────────────────────── -->
    <header class="upanel__header">
      <div class="upanel__icon" :style="{ '--nc': node.color }">
        <UniversePluginIcon
          :icon="node.icon"
          :fallback="node.plugin.manifest.metadata.style?.icon"
          :size="22"
        />
      </div>
      <div class="upanel__title-area">
        <h2 class="upanel__name">{{ node.label }}</h2>
        <div class="upanel__meta-row">
          <span class="upanel__category">{{ node.category }}</span>
          <span class="upanel__dot" :class="`upanel__dot--${node.status}`" />
          <span class="upanel__status-text">{{ statusLabel }}</span>
        </div>
      </div>
      <button class="upanel__close" @click="emit('close')" title="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6 6 18M6 6l12 12"/>
        </svg>
      </button>
    </header>

    <!-- ── Tabs ─────────────────────────────────────────────── -->
    <div class="upanel__tabs" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="upanel__tab"
        :class="{ 'upanel__tab--active': activeTab === tab.id }"
        role="tab"
        :aria-selected="activeTab === tab.id"
        @click="activeTab = tab.id"
      >{{ tab.label }}</button>
    </div>

    <!-- ── Tab content ──────────────────────────────────────── -->
    <div class="upanel__body">

      <!-- OVERVIEW tab -->
      <template v-if="activeTab === 'overview'">
        <!-- Description -->
        <section class="upanel__section">
          <p class="upanel__desc">{{ meta.description }}</p>
        </section>

        <!-- Author / version / repo -->
        <section class="upanel__section upanel__section--info">
          <div class="upanel__info-row">
            <span class="upanel__info-label">Author</span>
            <span class="upanel__info-value">{{ meta.author }}</span>
          </div>
          <div class="upanel__info-row">
            <span class="upanel__info-label">Version</span>
            <span class="upanel__info-value">{{ meta.version }}</span>
          </div>
          <div v-if="meta.repository" class="upanel__info-row">
            <span class="upanel__info-label">Repository</span>
            <a :href="meta.repository" target="_blank" rel="noopener noreferrer" class="upanel__link">
              {{ repoShort }}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="upanel__link-icon">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </a>
          </div>
        </section>

        <!-- Install / Uninstall -->
        <section class="upanel__section">
          <button
            class="upanel__action-btn upanel__action-btn--primary"
            :disabled="actionLoading"
            @click="handleInstallToggle"
          >
            <svg v-if="actionLoading" class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            <template v-else-if="isInstalled">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
              Uninstall
            </template>
            <template v-else>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Install
            </template>
          </button>
        </section>
      </template>

      <!-- AUTH tab -->
      <template v-if="activeTab === 'auth'">
        <PluginMenuAuth :plugin-id="node.id" />
      </template>

      <!-- METHODS tab -->
      <template v-if="activeTab === 'methods'">
        <div v-if="methodEntries.length === 0" class="upanel__empty">
          No methods documented.
        </div>
        <ul v-else class="upanel__methods">
          <li v-for="[key, method] in methodEntries" :key="key" class="upanel__method">
            <div class="upanel__method-header">
              <code class="upanel__method-name">{{ key }}</code>
              <span class="upanel__method-label">{{ method.metadata.label }}</span>
            </div>
            <p v-if="method.metadata.description" class="upanel__method-desc">
              {{ method.metadata.description }}
            </p>
            <!-- Parameters -->
            <div
              v-if="Object.keys(method.parameters?.properties ?? {}).length"
              class="upanel__method-params"
            >
              <span class="upanel__method-params-title">Parameters</span>
              <div
                v-for="(prop, pKey) in method.parameters.properties"
                :key="pKey"
                class="upanel__param"
              >
                <code class="upanel__param-name">{{ pKey }}</code>
                <span class="upanel__param-type">{{ prop.type }}</span>
                <span v-if="prop.description" class="upanel__param-desc">{{ prop.description }}</span>
              </div>
            </div>
          </li>
        </ul>
      </template>

    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { UniversePluginNode } from '../types/universe.types'
import UniversePluginIcon from './UniversePluginIcon.vue'
import PluginMenuAuth from '@/features/workflow-editor/components/settings/editors/PluginMenuAuth.vue'

const props = defineProps<{ node: UniversePluginNode }>()
const emit  = defineEmits<{ close: [] }>()

const meta = computed(() => props.node.plugin.manifest.metadata)

const repoShort = computed(() => {
  try { return new URL(meta.value.repository).hostname.replace('www.', '') + '…' }
  catch { return meta.value.repository }
})

const statusLabel = computed(() => ({
  connected:      'Connected',
  configured:     'Configured',
  not_configured: 'Not configured',
  error:          'Error',
}[props.node.status] ?? props.node.status))

const isInstalled = computed(() => props.node.status !== 'not_configured')

const actionLoading = ref(false)
async function handleInstallToggle() {
  // Placeholder — real install/uninstall flow to be wired to the API
  actionLoading.value = true
  await new Promise(r => setTimeout(r, 800))
  actionLoading.value = false
}

const methodEntries = computed(() =>
  Object.entries(props.node.plugin.manifest.methods ?? {}),
)

type TabId = 'overview' | 'auth' | 'methods'
const tabs: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview'  },
  { id: 'auth',     label: 'Auth'      },
  { id: 'methods',  label: 'Methods'   },
]
const activeTab = ref<TabId>('overview')
</script>

<style scoped>
/* ── Shell ───────────────────────────────────────────────────── */
.upanel {
  display: flex;
  flex-direction: column;
  width: 320px;
  max-height: calc(100vh - 80px);
  background: rgba(6,8,18,0.88);
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 16px;
  backdrop-filter: blur(28px);
  box-shadow: 0 24px 80px rgba(0,0,0,0.7);
  overflow: hidden;
  animation: panelIn .22s cubic-bezier(.22,1,.36,1);
}
@keyframes panelIn {
  from { opacity:0; transform:translateX(18px); }
  to   { opacity:1; transform:translateX(0); }
}

/* ── Header ──────────────────────────────────────────────────── */
.upanel__header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 14px 0;
  flex-shrink: 0;
}
.upanel__icon {
  width: 38px; height: 38px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  padding: 7px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--nc,#88bbff) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--nc,#88bbff) 24%, transparent);
  color: var(--nc,#88bbff);
  contain: paint;
  overflow: hidden;
}
.upanel__icon :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.upanel__title-area { flex: 1; min-width: 0; }
.upanel__name {
  font-size: 14px; font-weight: 600; color: rgba(255,255,255,.92);
  margin: 0 0 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.upanel__meta-row { display: flex; align-items: center; gap: 6px; }
.upanel__category { font-size: 10px; color: rgba(255,255,255,.35); }
.upanel__dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
.upanel__dot--connected    { background:#22c55e; }
.upanel__dot--configured   { background:#eab308; }
.upanel__dot--not_configured { background:rgba(255,255,255,.20); }
.upanel__dot--error        { background:#ef4444; }
.upanel__status-text { font-size:10px; color:rgba(255,255,255,.40); }

.upanel__close {
  width:28px; height:28px; display:flex; align-items:center; justify-content:center;
  background:none; border:1px solid rgba(255,255,255,.08); border-radius:7px;
  cursor:pointer; color:rgba(255,255,255,.4); flex-shrink:0;
  transition:background .15s, color .15s;
}
.upanel__close svg { width:13px; height:13px; }
.upanel__close:hover { background:rgba(255,255,255,.08); color:rgba(255,255,255,.8); }

/* ── Tabs ────────────────────────────────────────────────────── */
.upanel__tabs {
  display: flex; gap: 2px; padding: 10px 14px 0; flex-shrink: 0;
  border-bottom: 1px solid rgba(255,255,255,.07);
}
.upanel__tab {
  padding: 6px 12px; border-radius: 7px 7px 0 0; font-size: 12px; font-weight: 500;
  background: none; border: none; cursor: pointer; color: rgba(255,255,255,.40);
  transition: color .15s, background .15s;
}
.upanel__tab:hover { color: rgba(255,255,255,.70); }
.upanel__tab--active {
  color: rgba(255,255,255,.92);
  background: rgba(255,255,255,.06);
  border-bottom: 2px solid rgba(136,187,255,.6);
}

/* ── Body ────────────────────────────────────────────────────── */
.upanel__body {
  flex: 1; overflow-y: auto; padding: 14px;
  display: flex; flex-direction: column; gap: 12px;
}
.upanel__body::-webkit-scrollbar { width: 4px; }
.upanel__body::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border-radius: 4px; }

.upanel__section { display: flex; flex-direction: column; gap: 8px; }
.upanel__desc { font-size: 12.5px; color: rgba(255,255,255,.60); line-height: 1.6; margin: 0; }

/* Info rows */
.upanel__section--info {
  background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.07);
  border-radius: 10px; padding: 10px 12px; gap: 7px;
}
.upanel__info-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.upanel__info-label { font-size: 11px; color: rgba(255,255,255,.35); }
.upanel__info-value { font-size: 12px; color: rgba(255,255,255,.72); }
.upanel__link {
  font-size: 12px; color: rgba(136,187,255,.85); text-decoration: none;
  display: flex; align-items: center; gap: 4px;
  transition: color .15s;
}
.upanel__link:hover { color: rgba(136,187,255,1); }
.upanel__link-icon { width:11px; height:11px; }

/* Action buttons */
.upanel__action-btn {
  display: flex; align-items: center; justify-content: center; gap: 7px;
  height: 36px; border-radius: 9px; font-size: 13px; font-weight: 500;
  cursor: pointer; border: none; width: 100%; transition: opacity .15s, background .15s;
}
.upanel__action-btn--primary {
  background: rgba(255,255,255,.08); color: rgba(255,255,255,.80);
  border: 1px solid rgba(255,255,255,.12);
}
.upanel__action-btn--primary:hover { background: rgba(255,255,255,.13); }
.upanel__action-btn--primary:disabled { opacity:.5; cursor:not-allowed; }
.upanel__action-btn svg { width:15px; height:15px; }
.spin { animation: spin .9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Methods */
.upanel__empty { font-size:12px; color:rgba(255,255,255,.30); text-align:center; padding:20px 0; }
.upanel__methods { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:10px; }
.upanel__method {
  background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.07);
  border-radius: 10px; padding: 10px 12px;
}
.upanel__method-header { display:flex; align-items:baseline; gap:8px; margin-bottom:4px; }
.upanel__method-name {
  font-size: 11px; font-family: monospace; color: rgba(136,187,255,.85);
  background: rgba(136,187,255,.08); padding: 2px 6px; border-radius: 4px;
}
.upanel__method-label { font-size:12px; color:rgba(255,255,255,.70); }
.upanel__method-desc  { font-size:11px; color:rgba(255,255,255,.40); margin:0 0 8px; line-height:1.5; }

.upanel__method-params { margin-top:8px; display:flex; flex-direction:column; gap:5px; }
.upanel__method-params-title { font-size:10px; color:rgba(255,255,255,.25); text-transform:uppercase; letter-spacing:.06em; }
.upanel__param { display:flex; align-items:baseline; gap:6px; padding:4px 0; border-top:1px solid rgba(255,255,255,.05); }
.upanel__param-name { font-size:11px; font-family:monospace; color:rgba(255,255,255,.65); }
.upanel__param-type { font-size:10px; color:rgba(153,102,255,.75); }
.upanel__param-desc { font-size:11px; color:rgba(255,255,255,.30); }
</style>
