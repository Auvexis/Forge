<template>
  <div class="add-node-panel">
    <div class="add-node-search-wrapper">
      <div class="plugin-creator-add-panel__search">
        <Search :size="15" />
        <input v-model="search" type="search" placeholder="Search plugin blocks..." />
      </div>
    </div>

    <div class="add-node-content">
      <div class="add-node-section">
        <p class="add-node-section-label">Plugin blocks</p>
        <div class="add-node-list">
          <button
            v-for="item in filteredItems"
            :key="item.type"
            type="button"
            class="add-node-item"
            @click="addItem(item.type)"
          >
            <div
              class="add-node-item-icon-well"
              :style="{ backgroundColor: item.bgColor, borderColor: item.borderColor }"
            >
              <component :is="item.icon" :size="16" :color="item.color" />
            </div>
            <div class="add-node-item-info">
              <span class="add-node-item-label">{{ item.label }}</span>
              <span class="add-node-item-desc">{{ item.description }}</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, type Component } from 'vue'
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
  Search,
  Send,
} from 'lucide-vue-next'

export type PluginCreatorAddItemType =
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

const props = defineProps<{
  onAddItem?: (type: PluginCreatorAddItemType) => void
}>()

const emit = defineEmits<{
  add: [type: PluginCreatorAddItemType]
}>()

const search = ref('')

const items: Array<{
  type: PluginCreatorAddItemType
  label: string
  description: string
  icon: Component
  color: string
  bgColor: string
  borderColor: string
}> = [
  {
    type: 'method',
    label: 'Method',
    description: 'Plugin action entry point',
    icon: Network,
    color: '#818cf8',
    bgColor: 'rgba(99, 102, 241, 0.16)',
    borderColor: 'rgba(129, 140, 248, 0.38)',
  },
  {
    type: 'input',
    label: 'Input Field',
    description: 'Parameter passed to a method',
    icon: FormInput,
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.14)',
    borderColor: 'rgba(34, 197, 94, 0.34)',
  },
  {
    type: 'credential',
    label: 'Credential Field',
    description: 'Auth value injected into requests',
    icon: KeyRound,
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.14)',
    borderColor: 'rgba(245, 158, 11, 0.34)',
  },
  {
    type: 'request',
    label: 'Request',
    description: 'HTTP method, URL, headers and body',
    icon: Send,
    color: '#60a5fa',
    bgColor: 'rgba(96, 165, 250, 0.14)',
    borderColor: 'rgba(96, 165, 250, 0.34)',
  },
  {
    type: 'header',
    label: 'Header',
    description: 'Add a request header mapping',
    icon: Rows3,
    color: '#38bdf8',
    bgColor: 'rgba(56, 189, 248, 0.14)',
    borderColor: 'rgba(56, 189, 248, 0.34)',
  },
  {
    type: 'query',
    label: 'Query Param',
    description: 'Add a URL query mapping',
    icon: ListFilter,
    color: '#2dd4bf',
    bgColor: 'rgba(45, 212, 191, 0.14)',
    borderColor: 'rgba(45, 212, 191, 0.34)',
  },
  {
    type: 'body',
    label: 'JSON Body',
    description: 'Add a request payload mapping',
    icon: Braces,
    color: '#f472b6',
    bgColor: 'rgba(244, 114, 182, 0.14)',
    borderColor: 'rgba(244, 114, 182, 0.34)',
  },
  {
    type: 'responseMapper',
    label: 'Response Mapper',
    description: 'Map response data to outputs',
    icon: FileInput,
    color: '#34d399',
    bgColor: 'rgba(52, 211, 153, 0.14)',
    borderColor: 'rgba(52, 211, 153, 0.34)',
  },
  {
    type: 'errorMapper',
    label: 'Error Mapper',
    description: 'Map status or body errors',
    icon: CircleAlert,
    color: '#fb7185',
    bgColor: 'rgba(251, 113, 133, 0.14)',
    borderColor: 'rgba(251, 113, 133, 0.34)',
  },
  {
    type: 'output',
    label: 'Output Field',
    description: 'Final typed method output',
    icon: FileOutput,
    color: '#93c5fd',
    bgColor: 'rgba(147, 197, 253, 0.14)',
    borderColor: 'rgba(147, 197, 253, 0.34)',
  },
]

const filteredItems = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return items
  return items.filter(
    (item) =>
      item.label.toLowerCase().includes(term) || item.description.toLowerCase().includes(term),
  )
})

function addItem(type: PluginCreatorAddItemType) {
  props.onAddItem?.(type)
  emit('add', type)
}
</script>

<style scoped>
.plugin-creator-add-panel__search {
  position: relative;
  display: flex;
  align-items: center;
}

.plugin-creator-add-panel__search svg {
  position: absolute;
  left: 10px;
  color: var(--sailor-text-muted);
  pointer-events: none;
}

.plugin-creator-add-panel__search input {
  width: 100%;
  height: 38px;
  padding: 0 12px 0 34px;
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-md);
  background: var(--sailor-bg-surface);
  color: var(--sailor-text-primary);
  font: inherit;
  font-size: var(--sailor-text-sm);
  outline: none;
}

.plugin-creator-add-panel__search input:focus {
  border-color: var(--sailor-accent);
}

.add-node-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--sailor-bg-base);
  overflow: hidden;
}

.add-node-search-wrapper {
  flex-shrink: 0;
  padding: var(--sailor-space-3) var(--sailor-space-4);
  border-bottom: 1px solid var(--sailor-border);
}

.add-node-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--sailor-space-3);
}

.add-node-section {
  display: flex;
  flex-direction: column;
  gap: var(--sailor-space-2);
}

.add-node-section-label {
  margin: 0;
  padding: 0 var(--sailor-space-1);
  color: var(--sailor-text-muted);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.add-node-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.add-node-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--sailor-space-3);
  padding: var(--sailor-space-2);
  border: 0;
  border-radius: var(--sailor-radius-md);
  background: transparent;
  color: var(--sailor-text-primary);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.add-node-item:hover {
  background: var(--sailor-bg-overlay);
}

.add-node-item-icon-well {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
}

.add-node-item-info {
  min-width: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
}

.add-node-item-label {
  color: var(--sailor-text-primary);
  font-size: var(--sailor-text-sm);
  font-weight: 600;
  line-height: 1.3;
}

.add-node-item-desc {
  margin-top: 1px;
  overflow: hidden;
  color: var(--sailor-text-muted);
  font-size: var(--sailor-text-xs);
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
