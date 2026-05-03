<template>
  <Transition name="settings-slide">
    <div
      v-if="store.isOpen"
      class="global-settings"
    >
      <!-- Header -->
      <header class="global-settings__header">
        <button class="global-settings__back" @click="store.close" title="Back">
          <LucideIcon name="arrow-left" :size="16" />
        </button>
        <span class="global-settings__title">Settings</span>
      </header>

      <!-- Tabs -->
      <nav class="global-settings__tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="global-settings__tab"
          :class="{ 'global-settings__tab--active': activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <LucideIcon :name="tab.icon" :size="13" />
          {{ tab.label }}
        </button>
      </nav>

      <!-- Scrollable content -->
      <div class="global-settings__content">

        <!-- ── Variables Tab ───────────────────────────────────────────── -->
        <section v-if="activeTab === 'variables'" class="gs-section">
          <p class="gs-section__desc">
            Use <code class="gs-code">{{ '{{env.KEY}}' }}</code> in any workflow to reference these values.
          </p>

          <!-- Add form -->
          <div class="gs-card">
            <BaseInput
              v-model="newVar.key"
              label="Key"
              placeholder="MY_VARIABLE"
              :error="newVar.keyError"
            />
            <BaseInput
              v-model="newVar.value"
              label="Value"
              placeholder="my-value"
            />
            <BaseInput
              v-model="newVar.description"
              label="Description (optional)"
              placeholder="What is this for?"
            />
            <BaseButton
              variant="primary"
              icon-left="plus"
              :loading="isSavingVar"
              :disabled="!newVar.key.trim()"
              :full-width="true"
              @click="handleSaveVariable"
            >
              Add Variable
            </BaseButton>
          </div>

          <!-- Loading -->
          <div v-if="store.isLoadingVariables" class="gs-state">
            <LucideIcon name="loader-2" :size="18" class="gs-spin" />
          </div>

          <!-- Empty -->
          <div v-else-if="store.variables.length === 0" class="gs-state">
            <LucideIcon name="variable" :size="24" />
            <p>No variables yet</p>
          </div>

          <!-- List -->
          <ul v-else class="gs-var-list">
            <li v-for="v in store.variables" :key="v.key" class="gs-var-item">
              <div class="gs-var-item__info">
                <code class="gs-var-item__key">{{ v.key }}</code>
                <span class="gs-var-item__value">{{ v.value }}</span>
                <span v-if="v.description" class="gs-var-item__desc">{{ v.description }}</span>
              </div>
              <BaseButton
                variant="ghost"
                size="icon"
                :loading="deletingKey === v.key"
                @click="handleDeleteVariable(v.key)"
                title="Delete"
              >
                <template #left>
                  <LucideIcon name="trash-2" :size="13" />
                </template>
              </BaseButton>
            </li>
          </ul>
        </section>

        <!-- ── Preferences Tab ─────────────────────────────────────────── -->
        <section v-if="activeTab === 'preferences'" class="gs-section">
          <p class="gs-section__desc">System preferences for this Nod8 instance.</p>

          <div class="gs-pref-list">
            <div class="gs-pref-row">
              <div class="gs-pref-row__label">
                <LucideIcon name="sun-moon" :size="14" />
                <span>Theme</span>
              </div>
              <BaseSelect
                :model-value="themeValue"
                :options="themeOptions"
                @update:model-value="handleThemeChange"
              />
            </div>

            <div class="gs-pref-row">
              <div class="gs-pref-row__label">
                <LucideIcon name="database" :size="14" />
                <span>Log Retention</span>
              </div>
              <BaseSelect
                :model-value="logRetentionValue"
                :options="logRetentionOptions"
                @update:model-value="handleLogRetentionChange"
              />
            </div>
          </div>
        </section>

      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSettingsStore } from '@/shared/stores/settings.store'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'

// ─── Store ────────────────────────────────────────────────────────────────────

const store = useSettingsStore()

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const tabs = [
  { id: 'variables', label: 'Variables', icon: 'variable' },
  { id: 'preferences', label: 'Preferences', icon: 'sliders-horizontal' },
] as const

type TabId = (typeof tabs)[number]['id']
const activeTab = ref<TabId>('variables')

// ─── Load data when opened ────────────────────────────────────────────────────

watch(
  () => store.isOpen,
  (opened) => {
    if (opened) {
      store.fetchVariables()
      store.fetchSettings()
    }
  },
)

// ─── Variables ────────────────────────────────────────────────────────────────

const newVar = ref({ key: '', value: '', description: '', keyError: '' })
const isSavingVar = ref(false)
const deletingKey = ref<string | null>(null)

async function handleSaveVariable() {
  newVar.value.keyError = ''
  const key = newVar.value.key.trim().toUpperCase()

  if (!key) return
  if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) {
    newVar.value.keyError = 'Must be a valid identifier (letters, digits, underscores)'
    return
  }

  isSavingVar.value = true
  try {
    await store.saveVariable(key, newVar.value.value, newVar.value.description)
    newVar.value = { key: '', value: '', description: '', keyError: '' }
  } catch (err: any) {
    newVar.value.keyError = err.message
  } finally {
    isSavingVar.value = false
  }
}

async function handleDeleteVariable(key: string) {
  deletingKey.value = key
  try {
    await store.deleteVariable(key)
  } finally {
    deletingKey.value = null
  }
}

// ─── Preferences ──────────────────────────────────────────────────────────────

const themeOptions = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light (coming soon)' },
]

const logRetentionOptions = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '0', label: 'Keep forever' },
]

const themeValue = computed(() => String(store.settings.theme ?? 'dark'))
const logRetentionValue = computed(() => String(store.settings.log_retention_days ?? '30'))

async function handleThemeChange(value: string) {
  await store.saveSetting('theme', value)
}

async function handleLogRetentionChange(value: string) {
  await store.saveSetting('log_retention_days', value)
}
</script>

<style scoped>
/* ─── Panel — positioned like SidebarGlobalPanel, anchored to AppShell ──────── */
.global-settings {
  display: flex;
  flex-direction: column;
  position: absolute;
  top: 0;
  bottom: 0;
  left: var(--nod8-sidebar-width);
  width: 360px;
  background-color: var(--nod8-bg-surface);
  border-right: 1px solid var(--nod8-border);
  z-index: var(--nod8-z-raised);
  overflow: hidden;
}

/* ─── Header ─────────────────────────────────────────────────────────────── */
.global-settings__header {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-2);
  height: 48px;
  padding: 0 var(--nod8-space-3);
  border-bottom: 1px solid var(--nod8-border);
  flex-shrink: 0;
}

.global-settings__back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--nod8-radius-sm);
  color: var(--nod8-text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background-color var(--nod8-duration-fast), color var(--nod8-duration-fast);
  flex-shrink: 0;
}

.global-settings__back:hover {
  background: var(--nod8-bg-muted);
  color: var(--nod8-text-primary);
}

.global-settings__title {
  font-size: var(--nod8-text-sm);
  font-weight: var(--nod8-font-semibold);
  color: var(--nod8-text-primary);
}

/* ─── Tabs ───────────────────────────────────────────────────────────────── */
.global-settings__tabs {
  display: flex;
  gap: 2px;
  padding: var(--nod8-space-2) var(--nod8-space-3);
  border-bottom: 1px solid var(--nod8-border);
  flex-shrink: 0;
}

.global-settings__tab {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-2);
  padding: 4px var(--nod8-space-3);
  border-radius: var(--nod8-radius-sm);
  font-size: var(--nod8-text-xs);
  font-weight: var(--nod8-font-medium);
  color: var(--nod8-text-muted);
  cursor: pointer;
  background: transparent;
  border: none;
  transition: all var(--nod8-duration-fast);
}

.global-settings__tab:hover {
  background: var(--nod8-bg-muted);
  color: var(--nod8-text-secondary);
}

.global-settings__tab--active {
  background: var(--nod8-bg-muted);
  color: var(--nod8-text-primary);
}

/* ─── Scrollable content ─────────────────────────────────────────────────── */
.global-settings__content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.global-settings__content::-webkit-scrollbar { width: 4px; }
.global-settings__content::-webkit-scrollbar-track { background: transparent; }
.global-settings__content::-webkit-scrollbar-thumb {
  background: var(--nod8-border);
  border-radius: 4px;
}

/* ─── Section ────────────────────────────────────────────────────────────── */
.gs-section {
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-3);
  padding: var(--nod8-space-4) var(--nod8-space-3);
}

.gs-section__desc {
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-muted);
  line-height: 1.5;
  margin: 0;
}

.gs-code {
  font-family: monospace;
  font-size: 11px;
  background: var(--nod8-bg-muted);
  border: 1px solid var(--nod8-border);
  border-radius: 3px;
  padding: 1px 4px;
  color: var(--nod8-text-secondary);
}

/* ─── Add variable card ──────────────────────────────────────────────────── */
.gs-card {
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-3);
  padding: var(--nod8-space-3);
  background: var(--nod8-bg-muted);
  border-radius: var(--nod8-radius-md);
  border: 1px solid var(--nod8-border);
}

/* ─── State (loading / empty) ────────────────────────────────────────────── */
.gs-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--nod8-space-2);
  padding: var(--nod8-space-6) 0;
  color: var(--nod8-text-muted);
  font-size: var(--nod8-text-xs);
}

.gs-spin {
  animation: gs-spin 1s linear infinite;
}

@keyframes gs-spin {
  to { transform: rotate(360deg); }
}

/* ─── Variable list ──────────────────────────────────────────────────────── */
.gs-var-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-1);
}

.gs-var-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--nod8-space-2);
  padding: var(--nod8-space-2) var(--nod8-space-3);
  background: var(--nod8-bg-muted);
  border: 1px solid var(--nod8-border);
  border-radius: var(--nod8-radius-sm);
}

.gs-var-item__info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  flex: 1;
}

.gs-var-item__key {
  font-family: monospace;
  font-size: 11px;
  font-weight: var(--nod8-font-semibold);
  color: var(--nod8-accent);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gs-var-item__value {
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gs-var-item__desc {
  font-size: 11px;
  color: var(--nod8-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ─── Preferences ────────────────────────────────────────────────────────── */
.gs-pref-list {
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-2);
}

.gs-pref-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--nod8-space-3);
  padding: var(--nod8-space-2) var(--nod8-space-3);
  background: var(--nod8-bg-muted);
  border: 1px solid var(--nod8-border);
  border-radius: var(--nod8-radius-sm);
}

.gs-pref-row__label {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-2);
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-secondary);
  flex-shrink: 0;
}

/* ─── Slide transition — enters from left (same as SidebarGlobalPanel pattern) */
.settings-slide-enter-active {
  transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
}
.settings-slide-leave-active {
  transition: transform 0.22s cubic-bezier(0.32, 0.72, 0, 1);
}
.settings-slide-enter-from,
.settings-slide-leave-to {
  transform: translateX(-100%);
}
</style>
