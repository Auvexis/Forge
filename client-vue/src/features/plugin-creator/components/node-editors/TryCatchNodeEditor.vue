<template>
  <div class="editor-stack">
    <NodeEditorSection
      title="Try/Catch"
      eyebrow="Control flow"
      description="Run the try branch and route failures into ordered catch branches."
    >
      <BaseInput
        :model-value="errorVariable"
        label="Error variable"
        placeholder="error"
        @update:model-value="updateNodeData({ errorVariable: normalizeVariable(String($event)) })"
      />
      <div class="try-catch-node-editor__branches">
        <div>
          <strong>Try branch</strong>
          <span>Handle: try</span>
        </div>
        <div>
          <strong>Fallback catch</strong>
          <span>Handle: catch</span>
        </div>
      </div>
    </NodeEditorSection>

    <NodeEditorSection
      title="Catch cases"
      description="Specific catches match by error code before the fallback catch branch."
    >
      <div v-if="catchCases.length" class="try-catch-node-editor__cases">
        <div v-for="(item, index) in catchCases" :key="item.id" class="try-catch-node-editor__case">
          <div class="try-catch-node-editor__case-head">
            <strong>Catch {{ index + 1 }}</strong>
            <div class="try-catch-node-editor__case-actions">
              <button type="button" :disabled="index === 0" @click="moveCatch(index, -1)">
                Up
              </button>
              <button
                type="button"
                :disabled="index === catchCases.length - 1"
                @click="moveCatch(index, 1)"
              >
                Down
              </button>
              <button type="button" @click="removeCatch(index)">Remove</button>
            </div>
          </div>
          <BaseInput
            :model-value="item.label"
            label="Label"
            placeholder="Rate limit"
            @update:model-value="updateCatch(index, { label: String($event) })"
          />
          <BaseInput
            :model-value="item.errorCode"
            label="errorCode"
            placeholder="RATE_LIMIT"
            @update:model-value="
              updateCatch(index, { errorCode: normalizeErrorCode(String($event)) })
            "
          />
          <BaseInput
            :model-value="item.handle"
            label="handle"
            placeholder="catch_rate_limit"
            @update:model-value="
              updateCatch(index, { handle: normalizeHandle(String($event), index) })
            "
          />
        </div>
      </div>
      <div v-else class="try-catch-node-editor__empty">
        No specific catches yet.
      </div>
      <button class="editor-add-btn" type="button" @click="addCatch">Add catch</button>
    </NodeEditorSection>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import NodeEditorSection from './NodeEditorSection.vue'
import { usePluginCreatorNodeEditorContext } from './usePluginCreatorNodeEditorContext'
import type { PluginCreatorNodeEditorEmits, PluginCreatorNodeEditorProps } from './types'

interface CatchCaseEditorRow {
  id: string
  label: string
  errorCode: string
  handle: string
}

const props = defineProps<PluginCreatorNodeEditorProps>()
const emit = defineEmits<PluginCreatorNodeEditorEmits>()
const { node, updateNodeData } = usePluginCreatorNodeEditorContext(props, emit)

const errorVariable = computed(() => String(node.value?.data.errorVariable ?? 'error'))
const catchCases = computed<CatchCaseEditorRow[]>(() =>
  normalizeCatchCases(node.value?.data.catchCases),
)

function normalizeCatchCases(value: unknown): CatchCaseEditorRow[] {
  if (!Array.isArray(value)) return []

  return value.map((item, index) => {
    const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
    const id = String(record.id ?? `catch_${index + 1}`)
    const handle = String(record.handle ?? id)

    return {
      id,
      label: String(record.label ?? record.errorCode ?? `Catch ${index + 1}`),
      errorCode: String(record.errorCode ?? ''),
      handle,
    }
  })
}

function commitCatchCases(nextCases: CatchCaseEditorRow[]) {
  updateNodeData({
    catchCases: nextCases.map((item) => ({
      id: item.id,
      label: item.label,
      errorCode: item.errorCode || undefined,
      handle: item.handle,
    })),
  })
}

function addCatch() {
  const id = `catch_${Date.now()}`
  commitCatchCases([
    ...catchCases.value,
    {
      id,
      label: `Catch ${catchCases.value.length + 1}`,
      errorCode: '',
      handle: id,
    },
  ])
}

function updateCatch(index: number, patch: Partial<CatchCaseEditorRow>) {
  commitCatchCases(
    catchCases.value.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
  )
}

function removeCatch(index: number) {
  commitCatchCases(catchCases.value.filter((_, itemIndex) => itemIndex !== index))
}

function moveCatch(index: number, direction: -1 | 1) {
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= catchCases.value.length) return

  const nextCases = [...catchCases.value]
  const [item] = nextCases.splice(index, 1)
  if (!item) return
  nextCases.splice(targetIndex, 0, item)
  commitCatchCases(nextCases)
}

function normalizeVariable(value: string) {
  const clean = value.trim().replace(/[^a-zA-Z0-9_$]/g, '')
  return /^[a-zA-Z_$]/.test(clean) ? clean : 'error'
}

function normalizeErrorCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_')
    .replace(/_{2,}/g, '_')
}

function normalizeHandle(value: string, index: number) {
  const clean = value
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_{2,}/g, '_')

  return clean || catchCases.value[index]?.handle || `catch_${index + 1}`
}
</script>

<style scoped>
.try-catch-node-editor__branches,
.try-catch-node-editor__case-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.try-catch-node-editor__case-actions button {
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

.try-catch-node-editor__case-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.try-catch-node-editor__cases {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.try-catch-node-editor__branches > div,
.try-catch-node-editor__case,
.try-catch-node-editor__empty {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--sailor-border-subtle);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-surface);
}

.try-catch-node-editor__case-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.try-catch-node-editor__branches span,
.try-catch-node-editor__empty {
  color: var(--sailor-text-muted);
  font-size: 12px;
}
</style>
