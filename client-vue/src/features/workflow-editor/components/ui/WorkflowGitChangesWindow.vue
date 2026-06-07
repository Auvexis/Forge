<script setup lang="ts">
import { computed } from 'vue'
import type { WorkflowItem } from '@/core/types/workflow.types'
import BaseFloatingWindow from '@/shared/components/base/BaseFloatingWindow.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

const props = defineProps<{
  workflow: WorkflowItem
}>()

const rawWorkflowJson = computed(() => JSON.stringify(props.workflow, null, 2))
</script>

<template>
  <BaseFloatingWindow
    title="Changes"
    subtitle="workflow.json"
    aria-label="Workflow changes viewer"
    storage-key="workflow-git-changes-window"
    :default-width="720"
    :default-height="520"
    :min-width="460"
    :min-height="280"
  >
    <div class="workflow-git-changes-window">
      <div class="workflow-git-changes-window__toolbar" role="toolbar" aria-label="Workflow git changes actions">
        <button type="button" disabled title="Available in the snapshots phase">
          <LucideIcon name="git-commit-horizontal" :size="13" />
          <span>Create Snapshot</span>
        </button>
        <button type="button" disabled title="Available in the snapshots phase">
          <LucideIcon name="history" :size="13" />
          <span>Snapshots</span>
        </button>
        <button type="button" disabled title="Available in the diff phase">
          <LucideIcon name="git-compare-arrows" :size="13" />
          <span>Diff</span>
        </button>
      </div>

      <div class="workflow-git-changes-window__viewer">
        <pre class="workflow-git-changes-window__raw"><code>{{ rawWorkflowJson }}</code></pre>
      </div>
    </div>
  </BaseFloatingWindow>
</template>

<style scoped>
.workflow-git-changes-window {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.workflow-git-changes-window__toolbar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  border-bottom: 1px solid var(--sailor-border-muted);
  padding-bottom: 8px;
}

.workflow-git-changes-window__toolbar button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 8px;
  border: 1px solid var(--sailor-border-subtle);
  border-radius: 6px;
  background: var(--sailor-bg-elevated);
  color: var(--sailor-text-primary);
  font-size: 11px;
}

.workflow-git-changes-window__toolbar button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.workflow-git-changes-window__viewer {
  min-height: 0;
  flex: 1;
  overflow: auto;
  border: 1px solid var(--sailor-border-muted);
  border-radius: 6px;
  background: var(--sailor-bg-base);
}

.workflow-git-changes-window__raw {
  min-width: max-content;
  margin: 0;
  padding: 12px 14px;
  color: var(--sailor-text-primary);
  font-family: var(--sailor-font-mono);
  font-size: 11px;
  line-height: 1.55;
  white-space: pre;
}
</style>
