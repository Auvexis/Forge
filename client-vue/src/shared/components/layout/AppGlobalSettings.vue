<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition name="settings-backdrop">
      <div
        v-if="store.isOpen"
        class="settings-backdrop"
        @click="store.close"
      />
    </Transition>

    <!-- Slide-over panel -->
    <Transition name="settings-panel">
      <div
        v-if="store.isOpen"
        class="settings-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
      >
        <!-- Header -->
        <header class="settings-panel__header">
          <button class="settings-panel__back" @click="store.close" title="Close Settings">
            <LucideIcon name="arrow-left" :size="18" />
          </button>
          <span class="settings-panel__title">Settings</span>
        </header>

        <!-- Tabs -->
        <nav class="settings-tabs">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="settings-tab"
            :class="{ 'settings-tab--active': activeTab === tab.id }"
            @click="activeTab = tab.id"
          >
            <LucideIcon :name="tab.icon" :size="14" />
            {{ tab.label }}
          </button>
        </nav>

        <!-- Content -->
        <div class="settings-panel__content">
          <!-- ── Variables Tab ────────────────────────────────────────────── -->
          <section v-if="activeTab === 'variables'" class="settings-section">
            <p class="settings-section__description">
              Global variables accessible in any workflow via
              <code class="settings-code">{{ '{{env.KEY}}' }}</code>.
            </p>

            <!-- Add Variable Form -->
            <div class="variable-form">
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
                label="Description"
                placeholder="What is this variable for?"
              />
              <BaseButton
                variant="primary"
                icon-left="plus"
                :loading="isSavingVar"
                :disabled="!newVar.key.trim()"
                @click="handleSaveVariable"
              >
                Add Variable
              </BaseButton>
            </div>

            <!-- Variables List -->
            <div v-if="store.isLoadingVariables" class="settings-loading">
              <LucideIcon name="loader-2" :size="20" class="spin" />
            </div>

            <div v-else-if="store.variables.length === 0" class="settings-empty">
              <LucideIcon name="variable" :size="28" />
              <p>No variables defined yet.</p>
            </div>

            <ul v-else class="variable-list">
              <li
                v-for="v in store.variables"
                :key="v.key"
                class="variable-item"
              >
                <div class="variable-item__info">
                  <code class="variable-item__key">{{ v.key }}</code>
                  <span class="variable-item__value">{{ v.value }}</span>
                  <span v-if="v.description" class="variable-item__desc">{{ v.description }}</span>
                </div>
                <BaseButton
                  variant="ghost"
                  size="icon"
                  :loading="deletingKey === v.key"
                  @click="handleDeleteVariable(v.key)"
                  title="Delete variable"
                >
                  <template #left>
                    <LucideIcon name="trash-2" :size="14" />
                  </template>
                </BaseButton>
              </li>
            </ul>
          </section>

          <!-- ── Preferences Tab ─────────────────────────────────────────── -->
          <section v-if="activeTab === 'preferences'" class="settings-section">
            <p class="settings-section__description">
              System preferences for this Nod8 instance.
            </p>

            <div class="preferences-list">
              <!-- Theme preference (cosmetic only — no server persistence needed yet) -->
              <div class="preference-row">
                <div class="preference-row__label">
                  <LucideIcon name="sun-moon" :size="15" />
                  <span>Theme</span>
                </div>
                <BaseSelect
                  :model-value="themeValue"
                  :options="themeOptions"
                  @update:model-value="handleThemeChange"
                />
              </div>

              <!-- Execution logs retention -->
              <div class="preference-row">
                <div class="preference-row__label">
                  <LucideIcon name="database" :size="15" />
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
  </Teleport>
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

// ─── Load data on open ────────────────────────────────────────────────────────

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
    newVar.value.keyError = 'Key must be a valid identifier (letters, digits, underscores)'
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
/* ── Backdrop ─────────────────────────────────────────────────────────────── */
.settings-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 1000;
}

/* ── Panel ────────────────────────────────────────────────────────────────── */
.settings-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 420px;
  max-width: 100vw;
  background: var(--nod8-bg-surface);
  border-left: 1px solid var(--nod8-border);
  z-index: 1001;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Header ───────────────────────────────────────────────────────────────── */
.settings-panel__header {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-3);
  height: 52px;
  padding: 0 var(--nod8-space-4);
  border-bottom: 1px solid var(--nod8-border);
  flex-shrink: 0;
}

.settings-panel__back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--nod8-radius-sm);
  color: var(--nod8-text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background-color var(--nod8-duration-fast), color var(--nod8-duration-fast);
}

.settings-panel__back:hover {
  background: var(--nod8-bg-muted);
  color: var(--nod8-text-primary);
}

.settings-panel__title {
  font-size: var(--nod8-text-base);
  font-weight: var(--nod8-font-semibold);
  color: var(--nod8-text-primary);
}

/* ── Tabs ─────────────────────────────────────────────────────────────────── */
.settings-tabs {
  display: flex;
  gap: 2px;
  padding: var(--nod8-space-2) var(--nod8-space-3);
  border-bottom: 1px solid var(--nod8-border);
  flex-shrink: 0;
}

.settings-tab {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-2);
  padding: var(--nod8-space-1) var(--nod8-space-3);
  border-radius: var(--nod8-radius-sm);
  font-size: var(--nod8-text-sm);
  font-weight: var(--nod8-font-medium);
  color: var(--nod8-text-muted);
  cursor: pointer;
  background: transparent;
  border: none;
  transition: all var(--nod8-duration-fast);
}

.settings-tab:hover {
  background: var(--nod8-bg-muted);
  color: var(--nod8-text-secondary);
}

.settings-tab--active {
  background: var(--nod8-bg-muted);
  color: var(--nod8-text-primary);
}

/* ── Content ──────────────────────────────────────────────────────────────── */
.settings-panel__content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--nod8-space-5) var(--nod8-space-4);
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-4);
}

.settings-panel__content::-webkit-scrollbar {
  width: 4px;
}
.settings-panel__content::-webkit-scrollbar-track {
  background: transparent;
}
.settings-panel__content::-webkit-scrollbar-thumb {
  background: var(--nod8-border);
  border-radius: 4px;
}

/* ── Section ──────────────────────────────────────────────────────────────── */
.settings-section {
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-4);
}

.settings-section__description {
  font-size: var(--nod8-text-sm);
  color: var(--nod8-text-muted);
  line-height: 1.5;
  margin: 0;
}

.settings-code {
  font-family: monospace;
  font-size: var(--nod8-text-xs);
  background: var(--nod8-bg-muted);
  border: 1px solid var(--nod8-border);
  border-radius: 4px;
  padding: 1px 5px;
  color: var(--nod8-text-secondary);
}

/* ── Variable Form ────────────────────────────────────────────────────────── */
.variable-form {
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-3);
  padding: var(--nod8-space-4);
  background: var(--nod8-bg-muted);
  border-radius: var(--nod8-radius-md);
  border: 1px solid var(--nod8-border);
}

/* ── Variable List ────────────────────────────────────────────────────────── */
.variable-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-2);
}

.variable-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--nod8-space-3);
  padding: var(--nod8-space-3) var(--nod8-space-3);
  background: var(--nod8-bg-muted);
  border: 1px solid var(--nod8-border);
  border-radius: var(--nod8-radius-sm);
}

.variable-item__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.variable-item__key {
  font-family: monospace;
  font-size: var(--nod8-text-xs);
  font-weight: var(--nod8-font-semibold);
  color: var(--nod8-accent);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.variable-item__value {
  font-size: var(--nod8-text-sm);
  color: var(--nod8-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.variable-item__desc {
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Loading / Empty ──────────────────────────────────────────────────────── */
.settings-loading,
.settings-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--nod8-space-3);
  padding: var(--nod8-space-8) 0;
  color: var(--nod8-text-muted);
  font-size: var(--nod8-text-sm);
}

/* ── Preferences ──────────────────────────────────────────────────────────── */
.preferences-list {
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-2);
}

.preference-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--nod8-space-4);
  padding: var(--nod8-space-3) var(--nod8-space-3);
  background: var(--nod8-bg-muted);
  border: 1px solid var(--nod8-border);
  border-radius: var(--nod8-radius-sm);
}

.preference-row__label {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-2);
  font-size: var(--nod8-text-sm);
  color: var(--nod8-text-secondary);
  flex-shrink: 0;
}

/* ── Transitions ──────────────────────────────────────────────────────────── */

/* Backdrop fade */
.settings-backdrop-enter-active,
.settings-backdrop-leave-active {
  transition: opacity 0.25s ease;
}
.settings-backdrop-enter-from,
.settings-backdrop-leave-to {
  opacity: 0;
}

/* Panel slides in from the right, slides out to the right */
.settings-panel-enter-active {
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}
.settings-panel-leave-active {
  transition: transform 0.25s cubic-bezier(0.32, 0.72, 0, 1);
}
.settings-panel-enter-from,
.settings-panel-leave-to {
  transform: translateX(100%);
}

/* Loader spin */
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
