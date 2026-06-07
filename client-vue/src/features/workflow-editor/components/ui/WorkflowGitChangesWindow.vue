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

const emit = defineEmits<{
  (e: 'restore', hash: string): void
}>()

const snapshots = ref<WorkflowGitSnapshotSummary[]>([])
const selectedSnapshotHash = ref('')
const selectedSnapshot = ref<WorkflowGitSnapshotFile | null>(null)
const isLoadingSnapshots = ref(false)
const snapshotError = ref('')
const viewerMode = ref<'raw' | 'diff'>('raw')
const debouncedDiffLines = ref<WorkflowGitDiffLine[]>([])
let diffTimer: number | null = null

interface JsonToken {
  value: string
  type: 'key' | 'string' | 'number' | 'boolean' | 'null' | 'punctuation' | 'plain'
}

const snapshotOptions = computed(() => snapshots.value)
const hasSnapshotOptions = computed(() => snapshotOptions.value.length > 0)
const liveWorkflowJson = computed(() => JSON.stringify(props.workflow, null, 2))
const rawWorkflowJson = computed(() =>
  selectedSnapshot.value?.rawWorkflowJson ?? liveWorkflowJson.value,
)
const renderRawJsonLines = computed(() => rawWorkflowJson.value.split('\n').map(tokenizeJsonLine))
const baseDiffJson = computed(() => selectedSnapshot.value?.rawWorkflowJson ?? liveWorkflowJson.value)
const viewerLabel = computed(() =>
  selectedSnapshot.value ? `snapshot ${selectedSnapshot.value.hash}` : 'live workflow',
)
const hasUnsavedChanges = computed(() => baseDiffJson.value !== liveWorkflowJson.value)
const diffStats = computed(() => ({
  added: debouncedDiffLines.value.filter((line) => line.type === 'added').length,
  removed: debouncedDiffLines.value.filter((line) => line.type === 'removed').length,
  modified: debouncedDiffLines.value.filter((line) => line.type === 'modified').length,
}))

onMounted(loadSnapshots)
onBeforeUnmount(() => {
  if (diffTimer) window.clearTimeout(diffTimer)
})

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

watch(
  [baseDiffJson, liveWorkflowJson],
  () => scheduleDiffUpdate(),
  { immediate: true },
)

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

function scheduleDiffUpdate() {
  if (diffTimer) window.clearTimeout(diffTimer)
  diffTimer = window.setTimeout(() => {
    debouncedDiffLines.value = buildWorkflowJsonDiff(baseDiffJson.value, liveWorkflowJson.value)
    diffTimer = null
  }, 120)
}

function requestRestore() {
  if (!selectedSnapshotHash.value) return
  emit('restore', selectedSnapshotHash.value)
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
    :default-width="720"
    :default-height="520"
    :min-width="460"
    :min-height="280"
  >
    <div class="workflow-git-changes-window">
      <div class="workflow-git-changes-window__toolbar" role="toolbar" aria-label="Workflow git changes actions">
        <button class="workflow-git-changes-window__toolbar-button" type="button" disabled title="Available in the snapshots phase">
          <LucideIcon name="git-commit-horizontal" :size="13" />
          <span>Create Snapshot</span>
        </button>
        <button
          class="workflow-git-changes-window__toolbar-button"
          type="button"
          :disabled="!selectedSnapshotHash"
          title="Restore selected snapshot"
          @click="requestRestore"
        >
          <LucideIcon name="rotate-ccw" :size="13" />
          <span>Restore</span>
        </button>
        <div class="workflow-git-changes-window__mode" role="group" aria-label="Viewer mode">
          <button
            class="workflow-git-changes-window__toolbar-button"
            type="button"
            :class="{ 'workflow-git-changes-window__mode-button--active': viewerMode === 'raw' }"
            @click="viewerMode = 'raw'"
          >
            Raw
          </button>
          <button
            class="workflow-git-changes-window__toolbar-button"
            type="button"
            :class="{ 'workflow-git-changes-window__mode-button--active': viewerMode === 'diff' }"
            @click="viewerMode = 'diff'"
          >
            Diff
          </button>
        </div>
        <label class="workflow-git-changes-window__snapshot-select">
          <LucideIcon name="history" :size="13" />
          <span>Snapshots</span>
          <select v-model="selectedSnapshotHash" :disabled="isLoadingSnapshots">
            <option value="">{{ isLoadingSnapshots ? 'Loading snapshots...' : 'Live workflow' }}</option>
            <option
              v-for="snapshot in snapshotOptions"
              :key="snapshot.hash"
              :value="snapshot.hash"
            >
              {{ snapshot.shortHash }} · {{ formatSnapshotDate(snapshot.committedAt) }} · {{ snapshot.message }}
            </option>
          </select>
        </label>
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
        :class="{ 'workflow-git-changes-window__viewer--empty': !hasSnapshotOptions && !isLoadingSnapshots && viewerMode === 'diff' }"
      >
        <div class="workflow-git-changes-window__viewer-meta">
          <span class="workflow-git-changes-window__viewer-label">{{ viewerLabel }}</span>
          <span v-if="isLoadingSnapshots">Loading snapshots...</span>
          <span v-else-if="!hasSnapshotOptions">No snapshots yet</span>
          <span v-if="hasUnsavedChanges" class="workflow-git-changes-window__dirty">Unsaved changes</span>
          <span v-if="snapshotError" class="workflow-git-changes-window__error">{{ snapshotError }}</span>
        </div>
        <div v-if="!hasSnapshotOptions && !isLoadingSnapshots && viewerMode === 'diff'" class="workflow-git-changes-window__empty">
          <LucideIcon name="history" :size="18" />
          <span>No snapshots yet</span>
        </div>
        <pre class="workflow-git-changes-window__raw" v-if="viewerMode === 'raw'"><code>
          <span
            v-for="(tokens, lineIndex) in renderRawJsonLines"
            :key="lineIndex"
            class="workflow-git-changes-window__raw-line"
          ><span
            v-for="(token, tokenIndex) in tokens"
            :key="tokenIndex"
            :class="`json-token json-token--${token.type}`"
          >{{ token.value }}</span></span>
        </code></pre>
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

.workflow-git-changes-window__toolbar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  border-bottom: 1px solid var(--sailor-border);
  padding: 0 2px 8px;
}

.workflow-git-changes-window__toolbar-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 8px;
  border: 1px solid var(--sailor-border-subtle);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-elevated);
  color: var(--sailor-text-primary);
  font-size: 11px;
  transition:
    background var(--sailor-duration-fast) var(--sailor-ease-standard),
    border-color var(--sailor-duration-fast) var(--sailor-ease-standard),
    color var(--sailor-duration-fast) var(--sailor-ease-standard);
}

.workflow-git-changes-window__toolbar-button:not(:disabled):hover {
  border-color: var(--sailor-border-strong);
  background: var(--sailor-button-ghost-hover);
}

.workflow-git-changes-window__mode {
  display: inline-flex;
  align-items: center;
  height: 26px;
  overflow: hidden;
  border: 1px solid var(--sailor-border-subtle);
  border-radius: 6px;
}

.workflow-git-changes-window__mode button {
  height: 100%;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.workflow-git-changes-window__mode-button--active {
  background: var(--sailor-bg-surface) !important;
  color: var(--sailor-text-primary);
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

.workflow-git-changes-window__stats {
  margin-left: auto;
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

.workflow-git-changes-window__toolbar button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
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

.workflow-git-changes-window__viewer-label {
  color: var(--sailor-text-secondary);
}

.workflow-git-changes-window__dirty {
  color: var(--sailor-status-running-text);
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

.workflow-git-changes-window__raw {
  min-width: max-content;
  margin: 0;
  padding: 8px 0;
  color: var(--sailor-text-primary);
  font-family: var(--sailor-font-mono);
  font-size: 11px;
  line-height: 1.55;
  white-space: pre;
}

.workflow-git-changes-window__raw-line {
  display: block;
  min-height: 20px;
  padding: 0 14px;
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
