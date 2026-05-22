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
        <button type="button" class="switch-node-editor__action" @click="addCase">Add case</button>
      </template>

      <div v-if="cases.length" class="switch-node-editor__cases">
        <div v-for="(item, index) in cases" :key="item.id" class="switch-node-editor__case">
          <div class="switch-node-editor__case-head">
            <strong>Case {{ index + 1 }}</strong>
            <div class="switch-node-editor__case-actions">
              <button type="button" :disabled="index === 0" @click="moveCase(index, -1)">Up</button>
              <button
                type="button"
                :disabled="index === cases.length - 1"
                @click="moveCase(index, 1)"
              >
                Down
              </button>
              <button type="button" @click="removeCase(index)">Remove</button>
            </div>
          </div>
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
}

.switch-node-editor__quick,
.switch-node-editor__case-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.switch-node-editor__quick button,
.switch-node-editor__action,
.switch-node-editor__case-actions button,
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
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--sailor-border-subtle);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-surface);
}

.switch-node-editor__case-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.switch-node-editor__empty,
.switch-node-editor__default span {
  color: var(--sailor-text-muted);
  font-size: 12px;
}
</style>
