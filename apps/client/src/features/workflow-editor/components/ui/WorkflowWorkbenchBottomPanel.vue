<script setup lang="ts">
import { computed } from 'vue'
import ExecutionBottomPanel from '../execution/ExecutionBottomPanel.vue'
import { useExecutionStore } from '../../stores/execution.store'
import { useWorkflowStore } from '../../stores/workflow.store'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

export type WorkflowBottomPanelView = 'tree' | 'execution' | 'variables' | 'logs'

const props = defineProps<{
  activeView: WorkflowBottomPanelView
}>()

const emit = defineEmits<{
  'update:activeView': [view: WorkflowBottomPanelView]
}>()

const workflowStore = useWorkflowStore()
const executionStore = useExecutionStore()

const tabs: Array<{ id: WorkflowBottomPanelView; label: string; icon: string }> = [
  { id: 'tree', label: 'Tree', icon: 'list-tree' },
  { id: 'execution', label: 'Execution', icon: 'activity' },
  { id: 'variables', label: 'Variables', icon: 'tags' },
  { id: 'logs', label: 'Logs', icon: 'scroll-text' },
]

const workflowNodes = computed(() =>
  Object.entries(workflowStore.activeWorkflow?.nodes ?? {}).map(([id, node]) => ({
    id,
    name: typeof node.name === 'string' && node.name.trim() ? node.name : id,
    type: node.type,
  })),
)

const workflowVariables = computed(() => workflowStore.activeWorkflow?.variables ?? [])
const timeline = computed(() => executionStore.timeline)
</script>

<template>
  <section class="workflow-bottom-panel" aria-label="Workflow bottom panel">
    <header class="workflow-bottom-panel__tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="workflow-bottom-panel__tab"
        :class="{ 'workflow-bottom-panel__tab--active': activeView === tab.id }"
        type="button"
        @click="emit('update:activeView', tab.id)"
      >
        <LucideIcon :name="tab.icon" :size="14" />
        <span>{{ tab.label }}</span>
      </button>
    </header>

    <div class="workflow-bottom-panel__body">
      <div v-if="activeView === 'tree'" class="workflow-bottom-panel__tree">
        <div class="workflow-bottom-panel__heading">
          <strong>Workflow tree</strong>
          <code>{{ workflowNodes.length }} nodes</code>
        </div>
        <div v-if="workflowNodes.length" class="workflow-bottom-panel__rows">
          <button
            v-for="node in workflowNodes"
            :key="node.id"
            class="workflow-bottom-panel__row"
            type="button"
          >
            <LucideIcon name="box" :size="14" />
            <span>{{ node.name }}</span>
            <code>{{ node.type }}</code>
          </button>
        </div>
        <div v-else class="workflow-bottom-panel__empty">No nodes added.</div>
      </div>

      <ExecutionBottomPanel v-else-if="activeView === 'execution'" />

      <div v-else-if="activeView === 'variables'" class="workflow-bottom-panel__tree">
        <div class="workflow-bottom-panel__heading">
          <strong>Variables</strong>
          <code>{{ workflowVariables.length }} local</code>
        </div>
        <div v-if="workflowVariables.length" class="workflow-bottom-panel__rows">
          <div
            v-for="variable in workflowVariables"
            :key="variable.name"
            class="workflow-bottom-panel__row"
          >
            <LucideIcon name="tag" :size="14" />
            <span>{{ variable.name }}</span>
            <code>{{ variable.type }}</code>
          </div>
        </div>
        <div v-else class="workflow-bottom-panel__empty">No workflow variables.</div>
      </div>

      <div v-else class="workflow-bottom-panel__tree">
        <div class="workflow-bottom-panel__heading">
          <strong>Execution logs</strong>
          <code>{{ timeline.length }} events</code>
        </div>
        <div v-if="timeline.length" class="workflow-bottom-panel__rows">
          <div
            v-for="(event, index) in timeline"
            :key="`${event.nodeId ?? 'workflow'}:${index}`"
            class="workflow-bottom-panel__row"
          >
            <LucideIcon name="terminal" :size="14" />
            <span>{{ event.nodeId ?? 'workflow' }}</span>
            <code>{{ event.status }}</code>
          </div>
        </div>
        <div v-else class="workflow-bottom-panel__empty">No execution events.</div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.workflow-bottom-panel {
  display: grid;
  grid-template-rows: 32px minmax(0, 1fr);
  height: 100%;
  min-height: 0;
  color: var(--fabric-workbench-text);
  background: var(--fabric-workbench-panel-bg);
}

.workflow-bottom-panel__tabs {
  display: flex;
  align-items: stretch;
  min-width: 0;
  border-bottom: 1px solid var(--fabric-workbench-border);
  background: var(--fabric-workbench-status-bg);
}

.workflow-bottom-panel__tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 104px;
  height: 31px;
  padding: 0 12px;
  border-right: 1px solid var(--fabric-workbench-border);
  color: var(--fabric-text-muted);
  font-size: var(--fabric-text-xs);
}

.workflow-bottom-panel__tab:hover,
.workflow-bottom-panel__tab--active {
  color: var(--fabric-text-primary);
  background: var(--fabric-bg-surface);
}

.workflow-bottom-panel__body {
  min-height: 0;
  overflow: hidden;
}

.workflow-bottom-panel__tree {
  display: grid;
  grid-template-rows: 32px minmax(0, 1fr);
  height: 100%;
  min-height: 0;
}

.workflow-bottom-panel__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 10px;
  border-bottom: 1px solid var(--fabric-workbench-border);
  font-size: var(--fabric-text-xs);
}

.workflow-bottom-panel__heading code,
.workflow-bottom-panel__row code {
  color: var(--fabric-text-muted);
  font-size: 11px;
}

.workflow-bottom-panel__rows {
  min-height: 0;
  overflow: auto;
}

.workflow-bottom-panel__row {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 28px;
  padding: 0 10px;
  border-bottom: 1px solid var(--fabric-border-muted);
  color: var(--fabric-text-secondary);
  font-size: var(--fabric-text-xs);
  text-align: left;
}

.workflow-bottom-panel__row:hover {
  color: var(--fabric-text-primary);
  background: var(--fabric-button-ghost-hover);
}

.workflow-bottom-panel__row span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workflow-bottom-panel__empty {
  display: flex;
  align-items: center;
  padding: 0 10px;
  color: var(--fabric-text-muted);
  font-size: var(--fabric-text-xs);
}
</style>
