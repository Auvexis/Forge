<template>
  <div class="editor-stack">
    <EditorField label="Step Name">
      <BaseInput
        :model-value="(node.data.name as string) || ''"
        @update:model-value="updateNodeData({ name: $event as string })"
        placeholder="Name this merge"
      />
    </EditorField>

    <EditorField label="Merge Mode" icon="merge">
      <div class="merge-modes">
        <button
          class="merge-mode-btn"
          :class="{ 'merge-mode-btn--active': currentMode === 'wait-any' }"
          @click="updateNodeData({ mode: 'wait-any' })"
        >
          <LucideIcon name="zap" :size="16" />
          <div class="merge-mode-info">
            <span class="merge-mode-label">Wait Any</span>
            <span class="merge-mode-desc">Execute when first branch arrives</span>
          </div>
        </button>

        <button
          class="merge-mode-btn"
          :class="{ 'merge-mode-btn--active': currentMode === 'wait-all' }"
          @click="updateNodeData({ mode: 'wait-all' })"
        >
          <LucideIcon name="layers" :size="16" />
          <div class="merge-mode-info">
            <span class="merge-mode-label">Wait All</span>
            <span class="merge-mode-desc">Block until all branches complete</span>
          </div>
        </button>
      </div>

      <div v-if="currentMode === 'wait-all'" class="editor-hint editor-hint--violet">
        ⚠ Wait-All counts distinct upstream paths. Make sure all branches eventually reach this node.
      </div>
    </EditorField>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { NodeEditorProps } from './types'
import EditorField from './EditorField.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

const props = defineProps<NodeEditorProps>()

const currentMode = computed(() => (props.node.data.mode as string) ?? 'wait-any')
</script>

<style scoped>
.merge-modes {
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-2);
  margin-top: var(--nod8-space-2);
}

.merge-mode-btn {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-3);
  padding: var(--nod8-space-3);
  background: var(--nod8-bg-surface);
  border: 1px solid var(--nod8-border);
  border-radius: var(--nod8-radius-md);
  cursor: pointer;
  font-family: inherit;
  color: var(--nod8-text-muted);
  text-align: left;
  transition: border-color var(--nod8-duration-fast), color var(--nod8-duration-fast);
  width: 100%;
}

.merge-mode-btn:hover {
  border-color: var(--nod8-border-strong);
  color: var(--nod8-text-primary);
}

.merge-mode-btn--active {
  border-color: var(--nod8-node-merge-icon, #a78bfa);
  color: var(--nod8-text-primary);
  background: color-mix(in srgb, var(--nod8-node-merge-bg, rgba(167,139,250,0.12)) 60%, transparent);
}

.merge-mode-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.merge-mode-label {
  font-size: var(--nod8-text-sm);
  font-weight: 600;
}

.merge-mode-desc {
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-muted);
}
</style>
