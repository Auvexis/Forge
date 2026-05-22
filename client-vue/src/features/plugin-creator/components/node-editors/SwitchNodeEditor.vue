<template>
  <div class="node-editor-stack">
    <NodeEditorSection
      title="Switch"
      eyebrow="Control flow"
      description="Route execution by matching one expression against ordered cases."
    >
      <PluginCreatorExpressionInput
        :model-value="String(node?.data.expression ?? '')"
        label="Switch expression"
        placeholder="previous.status"
        @update:model-value="updateNodeData({ expression: String($event) })"
      />
      <div class="switch-node-editor__quick">
        <button type="button" @click="updateNodeData({ expression: 'previous.status' })">
          response status
        </button>
        <button type="button" @click="updateNodeData({ expression: 'params.type' })">
          param type
        </button>
        <button type="button" @click="updateNodeData({ expression: 'previous.body?.state' })">
          body state
        </button>
      </div>
    </NodeEditorSection>

    <NodeEditorSection
      title="Cases"
      description="Each case keeps its handle id when label or value changes."
    >
      <template #toolbar>
        <button
          type="button"
          class="switch-node-editor__icon-action"
          title="Add case"
          @click="addCase"
        >
          <LucideIcon name="plus" :size="14" />
        </button>
      </template>

      <div v-if="cases.length" class="switch-node-editor__cases">
        <div v-for="(item, index) in cases" :key="item.id" class="switch-node-editor__case">
          <span class="switch-node-editor__case-index">{{ index + 1 }}</span>
          <BaseInput
            :model-value="item.label"
            label="Label"
            placeholder="Success"
            @update:model-value="updateCase(index, { label: String($event) })"
          />
          <PluginCreatorExpressionInput
            :model-value="item.value"
            label="Value"
            placeholder="'success'"
            :show-hint="false"
            @update:model-value="updateCase(index, { value: String($event) })"
          />
          <BaseInput
            :model-value="item.handle"
            label="handle"
            placeholder="case_success"
            @update:model-value="
              updateCase(index, { handle: normalizeHandle(String($event), index) })
            "
          />
          <span class="switch-node-editor__case-route">-> {{ item.handle }}</span>
          <div class="switch-node-editor__case-actions">
            <button
              type="button"
              :disabled="index === 0"
              title="Move up"
              @click="moveCase(index, -1)"
            >
              <LucideIcon name="chevron-up" :size="14" />
            </button>
            <button
              type="button"
              :disabled="index === cases.length - 1"
              title="Move down"
              @click="moveCase(index, 1)"
            >
              <LucideIcon name="chevron-down" :size="14" />
            </button>
            <button type="button" title="Remove case" @click="removeCase(index)">
              <LucideIcon name="x" :size="14" />
            </button>
          </div>
        </div>
      </div>
      <div v-else class="switch-node-editor__empty">
        <span>No cases yet.</span>
        <button type="button" @click="addCase">Add case</button>
      </div>
    </NodeEditorSection>

    <NodeEditorSection title="Default branch" description="Fallback route when no case matches.">
      <BaseSwitch
        :model-value="defaultEnabled"
        label="Enable default handle"
        @update:model-value="updateNodeData({ defaultEnabled: $event })"
      />
      <div class="switch-node-editor__default">
        <strong>Default branch</strong>
        <span>Handle: default</span>
      </div>
    </NodeEditorSection>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseSwitch from '@/shared/components/base/BaseSwitch.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import PluginCreatorExpressionInput from '../expressions/PluginCreatorExpressionInput.vue'
import NodeEditorSection from './NodeEditorSection.vue'
import { usePluginCreatorNodeEditorContext } from './usePluginCreatorNodeEditorContext'
import type { PluginCreatorNodeEditorEmits, PluginCreatorNodeEditorProps } from './types'

interface SwitchCaseEditorRow {
  id: string
  label: string
  value: string
  handle: string
}

const props = defineProps<PluginCreatorNodeEditorProps>()
const emit = defineEmits<PluginCreatorNodeEditorEmits>()
const { node, updateNodeData } = usePluginCreatorNodeEditorContext(props, emit)

const cases = computed<SwitchCaseEditorRow[]>(() => normalizeCases(node.value?.data.cases))
const defaultEnabled = computed(() => node.value?.data.defaultEnabled !== false)

function normalizeCases(value: unknown): SwitchCaseEditorRow[] {
  if (!Array.isArray(value)) return []

  return value.map((item, index) => {
    const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
    const id = String(record.id ?? `case_${index + 1}`)
    const handle = String(record.handle ?? record.handleId ?? id)

    return {
      id,
      label: String(record.label ?? record.value ?? `Case ${index + 1}`),
      value: String(record.value ?? ''),
      handle,
    }
  })
}

function commitCases(nextCases: SwitchCaseEditorRow[]) {
  updateNodeData({
    cases: nextCases.map((item) => ({
      id: item.id,
      label: item.label,
      value: item.value,
      handle: item.handle,
    })),
  })
}

function addCase() {
  const id = `case_${Date.now()}`
  commitCases([
    ...cases.value,
    {
      id,
      label: `Case ${cases.value.length + 1}`,
      value: '',
      handle: id,
    },
  ])
}

function updateCase(index: number, patch: Partial<SwitchCaseEditorRow>) {
  commitCases(
    cases.value.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
  )
}

function removeCase(index: number) {
  commitCases(cases.value.filter((_, itemIndex) => itemIndex !== index))
}

function moveCase(index: number, direction: -1 | 1) {
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= cases.value.length) return

  const nextCases = [...cases.value]
  const [item] = nextCases.splice(index, 1)
  if (!item) return
  nextCases.splice(targetIndex, 0, item)
  commitCases(nextCases)
}

function normalizeHandle(value: string, index: number) {
  const clean = value
    .trim()
    .replace(/[^a-zA-Z0-9_:-]/g, '_')
    .replace(/_{2,}/g, '_')

  return clean || cases.value[index]?.handle || `case_${index + 1}`
}
</script>

<style scoped>
.node-editor-stack {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.switch-node-editor__quick,
.switch-node-editor__case-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.switch-node-editor__quick button,
.switch-node-editor__empty button {
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-surface);
  color: var(--sailor-text-primary);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 650;
  padding: 6px 8px;
}

.switch-node-editor__icon-action,
.switch-node-editor__case-actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  background: transparent;
  color: var(--sailor-text-muted);
  cursor: pointer;
}

.switch-node-editor__icon-action:hover,
.switch-node-editor__case-actions button:hover {
  background: var(--sailor-bg-elevated);
  color: var(--sailor-text-primary);
}

.switch-node-editor__case-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.switch-node-editor__cases {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.switch-node-editor__case,
.switch-node-editor__empty,
.switch-node-editor__default {
  display: grid;
  gap: 8px;
}

.switch-node-editor__case {
  grid-template-columns: 18px minmax(120px, 1fr) minmax(120px, 1fr) minmax(130px, 0.8fr) auto;
  display: grid;
  align-items: center;
  gap: 8px;
}

.switch-node-editor__case-index {
  color: var(--sailor-text-muted);
  font-family: var(--sailor-font-mono);
  font-size: 12px;
  text-align: center;
}

.switch-node-editor__case-route {
  color: var(--sailor-text-muted);
  font-family: var(--sailor-font-mono);
  font-size: 11px;
  white-space: nowrap;
}

.switch-node-editor__case-actions {
  display: flex;
  gap: 4px;
}

@media (max-width: 980px) {
  .switch-node-editor__case {
    grid-template-columns: 18px minmax(0, 1fr) auto;
  }

  .switch-node-editor__case > :deep(.base-input-wrapper),
  .switch-node-editor__case > :deep(.plugin-creator-expression-input) {
    grid-column: 2 / -1;
  }
}

.switch-node-editor__empty,
.switch-node-editor__default span {
  color: var(--sailor-text-muted);
  font-size: 12px;
}
</style>
