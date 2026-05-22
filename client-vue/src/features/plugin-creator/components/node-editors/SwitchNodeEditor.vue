<template>
  <div class="editor-stack">
    <NodeEditorSection title="Step Name">
      <BaseInput
        :model-value="String(node?.data.name ?? node?.data.label ?? '')"
        placeholder="Name this switch"
        @update:model-value="updateNodeData({ name: String($event), label: String($event) })"
      />
    </NodeEditorSection>

    <NodeEditorSection
      title="Input Expression"
      icon="git-branch-plus"
      description="Result is compared as a string."
    >
      <div class="editor-hint editor-hint--violet">
        JS expression evaluated against
        <span class="editor-code-snippet">params</span>,
        <span class="editor-code-snippet">previous</span>,
        <span class="editor-code-snippet">steps</span>.
        Result is compared as a string.
      </div>
      <PluginCreatorExpressionInput
        :model-value="String(node?.data.expression ?? '')"
        label=""
        placeholder="previous.status"
        @update:model-value="updateNodeData({ expression: String($event) })"
      />
      <div class="te-methods">
        <button class="te-method-btn" type="button" @click="updateNodeData({ expression: 'previous.status' })">
          response status
        </button>
        <button class="te-method-btn" type="button" @click="updateNodeData({ expression: 'params.type' })">
          param type
        </button>
        <button class="te-method-btn" type="button" @click="updateNodeData({ expression: 'previous.body?.state' })">
          body state
        </button>
      </div>
    </NodeEditorSection>

    <NodeEditorSection
      title="Cases"
      description="Each case keeps its handle id when label or value changes."
    >
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
        No cases yet.
      </div>
      <button class="editor-add-btn" type="button" @click="addCase">
        <LucideIcon name="plus" :size="14" />
        Add Case
      </button>
    </NodeEditorSection>

    <NodeEditorSection title="Default / Fallback Output" icon="corner-down-right">
      <div class="editor-hint">
        Output handle activated when no case matches. Keep this as
        <span class="editor-code-snippet">default</span>
        unless you intentionally want a dead-end.
      </div>
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
.switch-node-editor__case-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

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
