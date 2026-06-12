<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { useSettingsStore } from '@/shared/stores/settings.store'
import { useWorkflowStore } from '@/features/workflow-editor/stores/workflow.store'
import { buildExpressionItems, type ExpressionItem, type ExpressionScope } from './expressionVariables'

const emit = defineEmits<{
  (e: 'select', item: ExpressionItem): void
}>()

const settingsStore = useSettingsStore()
const workflowStore = useWorkflowStore()
const activeTab = ref<ExpressionScope>('local')
const search = ref('')

onMounted(() => {
  if (!settingsStore.variables.length && !settingsStore.isLoadingVariables) {
    void settingsStore.fetchVariables()
  }
})

const items = computed(() =>
  buildExpressionItems({
    localVariables: workflowStore.activeWorkflow?.variables ?? [],
    globalVariables: settingsStore.variables,
  }),
)

const filteredItems = computed(() => {
  const q = search.value.trim().toLowerCase()
  return items.value.filter((item) => {
    if (item.scope !== activeTab.value) return false
    if (!q) return true
    return [item.name, item.description ?? '', item.type, item.preview].some((value) =>
      value.toLowerCase().includes(q),
    )
  })
})

function itemScopeLabel(scope: ExpressionScope) {
  return scope === 'local' ? 'Local' : 'Global'
}
</script>

<template>
  <div class="variable-picker" role="dialog" aria-label="Variables">
    <header class="variable-picker__header">
      <div class="variable-picker__title">
        <LucideIcon name="braces" :size="14" />
        <span>Variables</span>
      </div>
    </header>

    <div class="variable-picker__tabs" role="tablist" aria-label="Variable scope">
      <button
        type="button"
        class="variable-picker__tab"
        :class="{ 'variable-picker__tab--active': activeTab === 'local' }"
        @click="activeTab = 'local'"
      >
        <LucideIcon name="tags" :size="13" />
        Local
      </button>
      <button
        type="button"
        class="variable-picker__tab"
        :class="{ 'variable-picker__tab--active': activeTab === 'global' }"
        @click="activeTab = 'global'"
      >
        <LucideIcon name="globe" :size="13" />
        Global
      </button>
    </div>

    <div class="variable-picker__search">
      <BaseInput v-model="search" icon-left="search" placeholder="Search variables" />
    </div>

    <div class="variable-picker__list">
      <button
        v-for="item in filteredItems"
        :key="item.id"
        type="button"
        class="variable-picker__item"
        @click="emit('select', item)"
      >
        <LucideIcon :name="item.icon" :size="14" class="variable-picker__item-icon" />
        <span class="variable-picker__item-main">
          <span class="variable-picker__item-name">{{ item.name }}</span>
          <span class="variable-picker__item-preview">{{ item.preview }}</span>
        </span>
        <span class="variable-picker__badges">
          <span class="variable-picker__badge variable-picker__badge--type">{{ item.type }}</span>
          <span
            class="variable-picker__badge"
            :class="`variable-picker__badge--${item.scope}`"
          >
            {{ itemScopeLabel(item.scope) }}
          </span>
        </span>
      </button>

      <div v-if="filteredItems.length === 0" class="variable-picker__empty">
        <template v-if="activeTab === 'global' && settingsStore.isLoadingVariables">
          Loading global variables
        </template>
        <template v-else>No variables found</template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.variable-picker {
  width: min(420px, calc(100vw - 32px));
  overflow: hidden;
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-surface);
  box-shadow: var(--sailor-shadow-xl);
}

.variable-picker__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sailor-space-3);
  border-bottom: 1px solid var(--sailor-border);
}

.variable-picker__title,
.variable-picker__tab,
.variable-picker__item,
.variable-picker__badges {
  display: flex;
  align-items: center;
}

.variable-picker__title {
  gap: var(--sailor-space-2);
  font-size: var(--sailor-text-sm);
  font-weight: var(--sailor-font-semibold);
  color: var(--sailor-text-primary);
}

.variable-picker__tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px;
  padding: var(--sailor-space-2);
  border-bottom: 1px solid var(--sailor-border);
}

.variable-picker__tab {
  justify-content: center;
  gap: var(--sailor-space-2);
  height: 28px;
  border: 1px solid transparent;
  border-radius: var(--sailor-radius-sm);
  color: var(--sailor-text-muted);
  font-size: var(--sailor-text-xs);
}

.variable-picker__tab--active {
  border-color: var(--sailor-border-strong);
  background: var(--sailor-bg-overlay);
  color: var(--sailor-text-primary);
}

.variable-picker__search {
  padding: var(--sailor-space-2);
  border-bottom: 1px solid var(--sailor-border);
}

.variable-picker__list {
  display: flex;
  flex-direction: column;
  max-height: 280px;
  overflow-y: auto;
  padding: var(--sailor-space-2);
  gap: 2px;
}

.variable-picker__item {
  width: 100%;
  min-width: 0;
  gap: var(--sailor-space-2);
  padding: var(--sailor-space-2);
  border-radius: var(--sailor-radius-sm);
  text-align: left;
}

.variable-picker__item:hover,
.variable-picker__item:focus-visible {
  background: var(--sailor-bg-overlay);
  outline: none;
}

.variable-picker__item-icon {
  flex-shrink: 0;
  color: var(--sailor-text-muted);
}

.variable-picker__item-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  gap: 2px;
}

.variable-picker__item-name {
  overflow: hidden;
  color: var(--sailor-text-primary);
  font-family: var(--sailor-font-mono);
  font-size: var(--sailor-text-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.variable-picker__item-preview {
  overflow: hidden;
  color: var(--sailor-text-muted);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.variable-picker__badges {
  flex-shrink: 0;
  gap: 4px;
}

.variable-picker__badge {
  max-width: 88px;
  overflow: hidden;
  padding: 2px 6px;
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-full);
  color: var(--sailor-text-muted);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.variable-picker__badge--local {
  border-color: rgba(168, 85, 247, 0.35);
  background: rgba(168, 85, 247, 0.14);
  color: rgb(216, 180, 254);
}

.variable-picker__badge--global {
  border-color: rgba(6, 182, 212, 0.35);
  background: rgba(6, 182, 212, 0.14);
  color: rgb(103, 232, 249);
}

.variable-picker__badge--type {
  background: var(--sailor-bg-base);
}

.variable-picker__empty {
  padding: var(--sailor-space-4);
  color: var(--sailor-text-muted);
  font-size: var(--sailor-text-xs);
  text-align: center;
}
</style>
