<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  workflowsApi,
  type WorkflowGitSnapshotFile,
  type WorkflowGitSnapshotSummary,
} from '@/core/api/workflows.api'
import type { WorkflowItem } from '@/core/types/workflow.types'
import BaseFloatingWindow from '@/shared/components/base/BaseFloatingWindow.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

const props = defineProps<{
  workflow: WorkflowItem
}>()

const snapshots = ref<WorkflowGitSnapshotSummary[]>([])
const selectedSnapshotHash = ref('')
const selectedSnapshot = ref<WorkflowGitSnapshotFile | null>(null)
const isLoadingSnapshots = ref(false)
const snapshotError = ref('')

const snapshotOptions = computed(() => snapshots.value)
const rawWorkflowJson = computed(() =>
  selectedSnapshot.value?.rawWorkflowJson ?? JSON.stringify(props.workflow, null, 2),
)
const viewerLabel = computed(() =>
  selectedSnapshot.value ? `snapshot ${selectedSnapshot.value.hash}` : 'live workflow',
)

onMounted(loadSnapshots)

watch(
  () => props.workflow.metadata.id,
  () => {
    selectedSnapshotHash.value = ''
    selectedSnapshot.value = null
    void loadSnapshots()
  },
)

watch(selectedSnapshotHash, (hash) => {
  void loadSelectedSnapshot(hash)
})

async function loadSnapshots() {
  isLoadingSnapshots.value = true
  snapshotError.value = ''
  try {
    snapshots.value = await workflowsApi.listGitSnapshots(props.workflow.metadata.id)
  } catch (error) {
    snapshots.value = []
    snapshotError.value = error instanceof Error ? error.message : 'Failed to load snapshots'
  } finally {
    isLoadingSnapshots.value = false
  }
}

async function loadSelectedSnapshot(hash: string) {
  if (!hash) {
    selectedSnapshot.value = null
    return
  }

  snapshotError.value = ''
  try {
    selectedSnapshot.value = await workflowsApi.getGitSnapshot(props.workflow.metadata.id, hash)
  } catch (error) {
    selectedSnapshot.value = null
    snapshotError.value = error instanceof Error ? error.message : 'Failed to load snapshot'
  }
}

function formatSnapshotDate(value: string) {
  if (!value) return 'unknown date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}
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
        <label class="workflow-git-changes-window__snapshot-select">
          <LucideIcon name="history" :size="13" />
          <span>Snapshots</span>
          <select v-model="selectedSnapshotHash" :disabled="isLoadingSnapshots">
            <option value="">Live workflow</option>
            <option
              v-for="snapshot in snapshotOptions"
              :key="snapshot.hash"
              :value="snapshot.hash"
            >
              {{ snapshot.shortHash }} · {{ formatSnapshotDate(snapshot.committedAt) }} · {{ snapshot.message }}
            </option>
          </select>
        </label>
        <button type="button" disabled title="Available in the diff phase">
          <LucideIcon name="git-compare-arrows" :size="13" />
          <span>Diff</span>
        </button>
      </div>

      <div class="workflow-git-changes-window__viewer">
        <div class="workflow-git-changes-window__viewer-meta">
          <span>{{ viewerLabel }}</span>
          <span v-if="snapshotError">{{ snapshotError }}</span>
        </div>
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

.workflow-git-changes-window__snapshot-select {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 240px;
  height: 26px;
  padding: 0 8px;
  border: 1px solid var(--sailor-border-subtle);
  border-radius: 6px;
  background: var(--sailor-bg-elevated);
  color: var(--sailor-text-primary);
  font-size: 11px;
}

.workflow-git-changes-window__snapshot-select select {
  min-width: 0;
  flex: 1;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
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

.workflow-git-changes-window__viewer-meta {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  min-height: 24px;
  padding: 5px 10px;
  border-bottom: 1px solid var(--sailor-border-muted);
  background: var(--sailor-bg-base);
  color: var(--sailor-text-muted);
  font-size: 11px;
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
