<template>
  <div class="editor-stack">
    <EditorField label="Step Name">
      <BaseInput
        :model-value="(node.data.name as string) || ''"
        @update:model-value="updateNodeData({ name: $event as string })"
        placeholder="Name this switch"
      />
    </EditorField>

    <EditorField label="Input Expression" icon="git-branch-plus">
      <div class="editor-hint editor-hint--violet">
        JS expression evaluated against
        <span class="editor-code-snippet">trigger</span>,
        <span class="editor-code-snippet">steps</span>,
        <span class="editor-code-snippet">variables</span>.
        Result is compared as a string.
      </div>
      <BaseTextarea
        :model-value="(node.data.inputExpression as string) || ''"
        @update:model-value="updateNodeData({ inputExpression: $event })"
        placeholder="steps.prev.output.status"
        spellcheck="false"
      />
    </EditorField>

    <EditorField label="Cases" icon="list">
      <div class="switch-cases">
        <div
          v-for="(c, i) in cases"
          :key="i"
          class="switch-case-row"
        >
          <div class="switch-case-index">{{ i + 1 }}</div>

          <!-- Value to match -->
          <BaseInput
            :model-value="c.value"
            @update:model-value="updateCaseValue(i, $event as string)"
            placeholder="200"
            class="switch-case-value"
            title="Value to match"
          />

          <!-- Handle ID (auto-generated, shown for info) -->
          <span class="switch-case-handle-label">→ {{ c.handleId }}</span>

          <!-- Remove -->
          <button class="switch-case-remove" @click="removeCase(i)" title="Remove case">
            <LucideIcon name="x" :size="14" />
          </button>
        </div>

        <div v-if="cases.length === 0" class="switch-empty-hint">
          No cases yet — click <strong>Add Case</strong>.
        </div>

        <button class="switch-add-btn" @click="addCase">
          <LucideIcon name="plus" :size="14" />
          Add Case
        </button>
      </div>
    </EditorField>

    <EditorField label="Default / Fallback Output" icon="corner-down-right">
      <div class="editor-hint">
        Output handle activated when no case matches. Keep this as
        <span class="editor-code-snippet">fallback</span>
        unless you intentionally want a custom handle id. Empty means dead-end.
      </div>
      <BaseInput
        :model-value="(node.data.fallbackHandleId as string) || ''"
        @update:model-value="updateNodeData({ fallbackHandleId: $event as string || undefined })"
        placeholder="fallback"
        spellcheck="false"
      />
    </EditorField>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { NodeEditorProps } from './types'
import type { SwitchNodeCase } from '@/core/types/workflow.types'
import EditorField from './EditorField.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseTextarea from '@/shared/components/base/BaseTextarea.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

const props = defineProps<NodeEditorProps>()

const cases = computed<SwitchNodeCase[]>(
  () => (props.node.data.cases as SwitchNodeCase[]) ?? [],
)

function saveCases(next: SwitchNodeCase[]) {
  props.updateNodeData({ cases: next })
}

function addCase() {
  const idx = cases.value.length
  saveCases([...cases.value, { value: '', handleId: `case_${idx}` }])
}

function removeCase(i: number) {
  // Re-generate handleIds after removal to keep them sequential
  const next = cases.value
    .filter((_, idx) => idx !== i)
    .map((c, idx) => ({ ...c, handleId: `case_${idx}` }))
  saveCases(next)
}

function updateCaseValue(i: number, value: string) {
  const next = cases.value.map((c, idx) => (idx === i ? { ...c, value } : c))
  saveCases(next)
}
</script>

<style scoped>
.switch-cases {
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-2);
  margin-top: var(--nod8-space-2);
}

.switch-case-row {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-2);
}

.switch-case-index {
  font-size: var(--nod8-text-xs);
  font-weight: 700;
  color: var(--nod8-text-muted);
  width: 16px;
  text-align: center;
  flex-shrink: 0;
}

.switch-case-value {
  flex: 1;
  min-width: 0;
}

.switch-case-handle-label {
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-muted);
  font-family: var(--nod8-font-mono, monospace);
  white-space: nowrap;
  flex-shrink: 0;
}

.switch-case-remove {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--nod8-text-muted);
  padding: 4px;
  border-radius: var(--nod8-radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: color var(--nod8-duration-fast);
}

.switch-case-remove:hover {
  color: var(--nod8-danger, #ef4444);
}

.switch-empty-hint {
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-muted);
  font-style: italic;
  padding: var(--nod8-space-2) 0;
}

.switch-add-btn {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-1);
  background: transparent;
  border: 1px dashed var(--nod8-border);
  border-radius: var(--nod8-radius-md);
  padding: var(--nod8-space-2) var(--nod8-space-3);
  font-size: var(--nod8-text-xs);
  font-family: inherit;
  color: var(--nod8-text-muted);
  cursor: pointer;
  width: 100%;
  justify-content: center;
  transition: border-color var(--nod8-duration-fast), color var(--nod8-duration-fast);
}

.switch-add-btn:hover {
  border-color: var(--nod8-accent);
  color: var(--nod8-accent);
}
</style>
