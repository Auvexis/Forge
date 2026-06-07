<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  workflowsApi,
  type WorkflowGitSnapshotFile,
  type WorkflowGitSnapshotSummary,
} from '@/core/api/workflows.api'
import type { WorkflowItem } from '@/core/types/workflow.types'
import { buildWorkflowJsonDiff, type WorkflowGitDiffLine } from '@/features/workflow-editor/utils/workflowGitDiff'
import BaseFloatingWindow from '@/shared/components/base/BaseFloatingWindow.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

const props = defineProps<{
  workflow: WorkflowItem
}>()

const latestSnapshot = ref<WorkflowGitSnapshotFile | null>(null)
const isLoadingSnapshots = ref(false)
const snapshotError = ref('')
const debouncedDiffLines = ref<WorkflowGitDiffLine[]>([])
let diffTimer: number | null = null

interface JsonToken {
  value: string
  type: 'key' | 'string' | 'number' | 'boolean' | 'null' | 'punctuation' | 'plain'
}

const liveWorkflowJson = computed(() => JSON.stringify(props.workflow, null, 2))
const latestWorkflowJson = computed(() => latestSnapshot.value?.rawWorkflowJson ?? '')
const hasLatestCommit = computed(() => latestSnapshot.value !== null)
const hasUnsavedChanges = computed(() => latestWorkflowJson.value !== liveWorkflowJson.value)
const latestCommitLabel = computed(() => {
  if (!latestSnapshot.value) return 'No commits yet'
  return `Live vs ${latestSnapshot.value.hash.slice(0, 7)}`
})
const diffStats = computed(() => ({
  added: debouncedDiffLines.value.filter((line) => line.type === 'added').length,
  removed: debouncedDiffLines.value.filter((line) => line.type === 'removed').length,
  modified: debouncedDiffLines.value.filter((line) => line.type === 'modified').length,
}))

onMounted(loadLatestSnapshot)
onBeforeUnmount(() => {
  if (diffTimer) window.clearTimeout(diffTimer)
})

watch(
  () => props.workflow.metadata.id,
  () => {
    latestSnapshot.value = null
    void loadLatestSnapshot()
  },
)

watch(
  [latestWorkflowJson, liveWorkflowJson],
  () => scheduleDiffUpdate(),
  { immediate: true },
)

async function loadLatestSnapshot() {
  isLoadingSnapshots.value = true
  snapshotError.value = ''
  try {
    const snapshots: WorkflowGitSnapshotSummary[] = await workflowsApi.listGitSnapshots(props.workflow.metadata.id)
    const latest = snapshots[0]
    latestSnapshot.value = latest
      ? await workflowsApi.getGitSnapshot(props.workflow.metadata.id, latest.hash)
      : null
  } catch (error) {
    latestSnapshot.value = null
    snapshotError.value = error instanceof Error ? error.message : 'Failed to load latest commit'
  } finally {
    isLoadingSnapshots.value = false
  }
}

function scheduleDiffUpdate() {
  if (diffTimer) window.clearTimeout(diffTimer)
  diffTimer = window.setTimeout(() => {
    debouncedDiffLines.value = buildWorkflowJsonDiff(latestWorkflowJson.value, liveWorkflowJson.value)
    diffTimer = null
  }, 120)
}

function tokenizeJsonLine(line: string): JsonToken[] {
  const tokens: JsonToken[] = []
  const pattern = /("(?:\\.|[^"\\])*"(?=\s*:))|("(?:\\.|[^"\\])*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false)\b|\bnull\b|([{}[\]:,])/g
  let index = 0
  for (const match of line.matchAll(pattern)) {
    const start = match.index ?? 0
    if (start > index) {
      tokens.push({ value: line.slice(index, start), type: 'plain' })
    }

    const value = match[0]
    if (match[1]) tokens.push({ value, type: 'key' })
    else if (match[2]) tokens.push({ value, type: 'string' })
    else if (match[3]) tokens.push({ value, type: 'number' })
    else if (match[4]) tokens.push({ value, type: 'boolean' })
    else if (value === 'null') tokens.push({ value, type: 'null' })
    else tokens.push({ value, type: 'punctuation' })
    index = start + value.length
  }

  if (index < line.length) {
    tokens.push({ value: line.slice(index), type: 'plain' })
  }

  return tokens.length ? tokens : [{ value: line, type: 'plain' }]
}
</script>

<template>
  <BaseFloatingWindow
    title="Changes"
    subtitle="workflow.json"
    aria-label="Workflow changes viewer"
    storage-key="workflow-git-changes-window"
    :default-width="760"
    :default-height="560"
    :min-width="460"
    :min-height="280"
  >
    <div class="workflow-git-changes-window">
      <div class="workflow-git-changes-window__summary">
        <div class="workflow-git-changes-window__summary-main">
          <LucideIcon name="git-compare-arrows" :size="14" />
          <span>{{ latestCommitLabel }}</span>
          <span v-if="hasUnsavedChanges" class="workflow-git-changes-window__dirty">Live changes</span>
        </div>
        <div class="workflow-git-changes-window__stats" aria-label="Diff summary">
          <span class="workflow-git-changes-window__stat workflow-git-changes-window__stat--added">
            +{{ diffStats.added }}
          </span>
          <span class="workflow-git-changes-window__stat workflow-git-changes-window__stat--removed">
            -{{ diffStats.removed }}
          </span>
          <span class="workflow-git-changes-window__stat workflow-git-changes-window__stat--modified">
            ~{{ diffStats.modified }}
          </span>
        </div>
      </div>

      <div
        class="workflow-git-changes-window__viewer"
        :class="{ 'workflow-git-changes-window__viewer--empty': !hasLatestCommit && !isLoadingSnapshots }"
      >
        <div class="workflow-git-changes-window__viewer-meta">
          <span>{{ latestCommitLabel }}</span>
          <span v-if="isLoadingSnapshots">Loading latest commit...</span>
          <span v-else-if="!hasLatestCommit">No commits yet</span>
          <span v-if="snapshotError" class="workflow-git-changes-window__error">{{ snapshotError }}</span>
        </div>

        <div v-if="!hasLatestCommit && !isLoadingSnapshots" class="workflow-git-changes-window__empty">
          <LucideIcon name="history" :size="18" />
          <span>No commits yet</span>
        </div>

        <div v-else class="workflow-git-changes-window__diff" role="table" aria-label="Workflow JSON diff">
          <div
            v-for="(line, index) in debouncedDiffLines"
            :key="`${index}-${line.type}`"
            class="workflow-git-changes-window__line"
            :class="`workflow-git-changes-window__line--${line.type}`"
            role="row"
          >
            <span class="workflow-git-changes-window__gutter workflow-git-changes-window__line-number">{{ line.oldLineNumber ?? '' }}</span>
            <span class="workflow-git-changes-window__gutter workflow-git-changes-window__line-number">{{ line.newLineNumber ?? '' }}</span>
            <span class="workflow-git-changes-window__line-marker">
              {{ line.type === 'added' ? '+' : line.type === 'removed' ? '-' : line.type === 'modified' ? '~' : ' ' }}
            </span>
            <code class="workflow-git-changes-window__line-code">
              <span
                v-for="(token, tokenIndex) in tokenizeJsonLine(line.content)"
                :key="tokenIndex"
                :class="`json-token json-token--${token.type}`"
              >{{ token.value }}</span>
            </code>
          </div>
        </div>
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
  gap: var(--sailor-space-2);
}

.workflow-git-changes-window__summary {
  flex: 0 0 auto;
  min-height: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sailor-space-3);
  padding: 0 2px 8px;
  border-bottom: 1px solid var(--sailor-border);
}

.workflow-git-changes-window__summary-main {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--sailor-text-secondary);
  font-size: 12px;
}

.workflow-git-changes-window__stats {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.workflow-git-changes-window__stat {
  min-width: 38px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: var(--sailor-radius-sm);
  font-family: var(--sailor-font-mono);
  font-size: 11px;
  font-weight: var(--sailor-font-semibold);
}

.workflow-git-changes-window__stat--added {
  border-color: var(--sailor-status-success-border);
  background: var(--sailor-status-success-bg);
  color: var(--sailor-status-success-text);
}

.workflow-git-changes-window__stat--removed {
  border-color: var(--sailor-status-error-border);
  background: var(--sailor-status-error-bg);
  color: var(--sailor-status-error-text);
}

.workflow-git-changes-window__stat--modified {
  border-color: var(--sailor-status-running-border);
  background: var(--sailor-status-running-bg);
  color: var(--sailor-status-running-text);
}

.workflow-git-changes-window__viewer {
  min-height: 0;
  flex: 1;
  overflow: auto;
  border: 1px solid var(--sailor-border);
  border-radius: 6px;
  background: var(--sailor-bg-base);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.025);
}

.workflow-git-changes-window__viewer--empty {
  display: flex;
  flex-direction: column;
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

.workflow-git-changes-window__dirty {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 7px;
  border: 1px solid var(--sailor-status-running-border);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-status-running-bg);
  color: var(--sailor-status-running-text);
  font-size: 11px;
}

.workflow-git-changes-window__error {
  color: var(--sailor-status-error-text);
}

.workflow-git-changes-window__empty {
  flex: 1;
  min-height: 160px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: var(--sailor-space-2);
  color: var(--sailor-text-muted);
  font-size: 12px;
}

.workflow-git-changes-window__diff {
  min-width: max-content;
  padding: 8px 0;
  font-family: var(--sailor-font-mono);
  font-size: 11px;
  line-height: 1.55;
}

.workflow-git-changes-window__line {
  display: grid;
  grid-template-columns: 48px 48px 24px minmax(360px, 1fr);
  min-height: 20px;
  color: var(--sailor-text-primary);
}

.workflow-git-changes-window__line--added {
  background: color-mix(in srgb, var(--sailor-green-400) 16%, transparent);
  box-shadow: inset 3px 0 0 var(--sailor-green-400);
}

.workflow-git-changes-window__line--removed {
  background: color-mix(in srgb, var(--sailor-red-400) 16%, transparent);
  box-shadow: inset 3px 0 0 var(--sailor-red-400);
}

.workflow-git-changes-window__line--modified {
  background: color-mix(in srgb, var(--sailor-amber-400) 16%, transparent);
  box-shadow: inset 3px 0 0 var(--sailor-amber-400);
}

.workflow-git-changes-window__gutter {
  border-right: 1px solid var(--sailor-border-muted);
  background: color-mix(in srgb, var(--sailor-bg-surface) 72%, transparent);
}

.workflow-git-changes-window__line-number {
  padding: 0 8px;
  color: var(--sailor-text-muted);
  text-align: right;
  user-select: none;
}

.workflow-git-changes-window__line-marker {
  color: var(--sailor-text-muted);
  text-align: center;
  user-select: none;
}

.workflow-git-changes-window__line-code {
  padding: 0 12px 0 0;
  white-space: pre;
}

.json-token--key {
  color: var(--sailor-blue-400);
}

.json-token--string {
  color: var(--sailor-green-400);
}

.json-token--number {
  color: var(--sailor-amber-400);
}

.json-token--boolean,
.json-token--null {
  color: var(--sailor-color-4);
}

.json-token--punctuation {
  color: var(--sailor-text-secondary);
}

.json-token--plain {
  color: var(--sailor-text-muted);
}
</style>
