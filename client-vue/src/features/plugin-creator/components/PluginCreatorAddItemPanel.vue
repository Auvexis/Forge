<template>
  <aside v-if="open" class="plugin-creator-add-panel" aria-label="Add Item/Node">
    <header class="plugin-creator-add-panel__header">
      <div>
        <p>Add Item/Node</p>
        <h2>Plugin blocks</h2>
      </div>
      <button type="button" aria-label="Close add item panel" @click="emit('close')">
        <X :size="16" />
      </button>
    </header>

    <div class="plugin-creator-add-panel__items">
      <button v-for="item in items" :key="item.type" type="button" @click="emit('add', item.type)">
        <component :is="item.icon" :size="16" />
        <span>{{ item.label }}</span>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import {
  Braces,
  CircleAlert,
  FileInput,
  FileOutput,
  FormInput,
  KeyRound,
  ListFilter,
  Network,
  Rows3,
  Send,
  X,
} from 'lucide-vue-next'
import type { Component } from 'vue'

type AddItemType =
  | 'method'
  | 'input'
  | 'credential'
  | 'request'
  | 'header'
  | 'query'
  | 'body'
  | 'responseMapper'
  | 'errorMapper'
  | 'output'

withDefaults(
  defineProps<{
    open?: boolean
  }>(),
  {
    open: false,
  },
)

const emit = defineEmits<{
  close: []
  add: [type: AddItemType]
}>()

const items: Array<{ type: AddItemType; label: string; icon: Component }> = [
  { type: 'method', label: 'Method', icon: Network },
  { type: 'input', label: 'Input Field', icon: FormInput },
  { type: 'credential', label: 'Credential Field', icon: KeyRound },
  { type: 'request', label: 'Request', icon: Send },
  { type: 'header', label: 'Header', icon: Rows3 },
  { type: 'query', label: 'Query Param', icon: ListFilter },
  { type: 'body', label: 'JSON Body', icon: Braces },
  { type: 'responseMapper', label: 'Response Mapper', icon: FileInput },
  { type: 'errorMapper', label: 'Error Mapper', icon: CircleAlert },
  { type: 'output', label: 'Output Field', icon: FileOutput },
]
</script>

<style scoped>
.plugin-creator-add-panel {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 30;
  width: min(360px, calc(100% - 32px));
  max-height: calc(100% - 32px);
  display: flex;
  flex-direction: column;
  border: 1px solid var(--sailor-border-subtle);
  border-radius: 0;
  background: var(--sailor-bg-base);
  box-shadow: -18px 0 40px rgba(0, 0, 0, 0.32);
  overflow: hidden;
}

.plugin-creator-add-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--sailor-border-subtle);
}

.plugin-creator-add-panel__header p,
.plugin-creator-add-panel__header h2 {
  margin: 0;
}

.plugin-creator-add-panel__header p {
  color: var(--sailor-text-secondary);
  font-size: 12px;
  font-weight: 700;
}

.plugin-creator-add-panel__header h2 {
  margin-top: 4px;
  color: var(--sailor-text-primary);
  font-size: 16px;
  line-height: 1.2;
}

.plugin-creator-add-panel__header button {
  width: 30px;
  height: 30px;
  display: inline-grid;
  place-items: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--sailor-text-secondary);
  cursor: pointer;
}

.plugin-creator-add-panel__items {
  display: grid;
  gap: 4px;
  padding: 10px;
  overflow: auto;
}

.plugin-creator-add-panel__items button {
  min-height: 40px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--sailor-text-primary);
  font-size: 13px;
  font-weight: 650;
  text-align: left;
  cursor: pointer;
}

.plugin-creator-add-panel__items button:hover {
  border-color: var(--sailor-border-subtle);
  background: var(--sailor-bg-elevated);
}
</style>
