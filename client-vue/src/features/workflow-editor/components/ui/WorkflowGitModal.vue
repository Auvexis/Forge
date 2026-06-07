<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  workflowsApi,
  type WorkflowGitSnapshotFile,
  type WorkflowGitSnapshotStatus,
  type WorkflowGitSnapshotSummary,
} from '@/core/api/workflows.api'
import type { WorkflowItem } from '@/core/types/workflow.types'
import { buildWorkflowJsonDiff, type WorkflowGitDiffLine } from '@/features/workflow-editor/utils/workflowGitDiff'
import BaseModal from '@/shared/components/base/BaseModal.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

const props = defineProps<{
  isOpen: boolean
  workflow: WorkflowItem
  gitStatus: WorkflowGitSnapshotStatus | null
  isCommitting?: boolean
  refreshKey?: number
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'commit', message: string): void
}>()

const latestSnapshot = ref<WorkflowGitSnapshotFile | null>(null)
const isLoadingSnapshots = ref(false)
const snapshotError = ref('')
const summary = ref('')
const description = ref('')

interface JsonToken {
  value: string
  type: 'key' | 'string' | 'number' | 'boolean' | 'null' | 'punctuation' | 'plain'
}

const liveWorkflowJson = computed(() => JSON.stringify(props.workflow, null, 2))
const latestWorkflowJson = computed(() => latestSnapshot.value?.rawWorkflowJson ?? '')
const diffLines = computed<WorkflowGitDiffLine[]>(() =>
  buildWorkflowJsonDiff(latestWorkflowJson.value, liveWorkflowJson.value),
)
const changedLines = computed(() => diffLines.value.filter((line) => line.type !== 'unchanged'))
const changedFileCount = computed(() => (changedLines.value.length > 0 ? 1 : 0))
const commitHash = computed(() => props.gitStatus?.latestCommit?.shortHash ?? 'no commits')
const branchLabel = computed(() => props.gitStatus?.branch ?? 'HEAD')
const commitMessage = computed(() => {
  const title = summary.value.trim()
  const body = description.value.trim()
  return body ? `${title}\n\n${body}` : title
})
const canCommit = computed(() => commitMessage.value.length > 0 && !props.isCommitting)
const diffStats = computed(() => ({
  added: diffLines.value.filter((line) => line.type === 'added').length,
  removed: diffLines.value.filter((line) => line.type === 'removed').length,
  modified: diffLines.value.filter((line) => line.type === 'modified').length,
}))

watch(
  () => [props.isOpen, props.workflow.metadata.id, props.refreshKey],
  () => {
    if (!props.isOpen) return
    resetCommitInputs()
    void loadLatestSnapshot()
  },
  { immediate: true },
)

function resetCommitInputs() {
  summary.value = `Update ${props.workflow.metadata.name}`
  description.value = ''
}

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

function requestCommit() {
  if (!canCommit.value) return
  emit('commit', commitMessage.value)
}

function tokenizeJsonLine(line: string): JsonToken[] {
  const tokens: JsonToken[] = []
  const pattern = /("(?:\\.|[^"\\])*"(?=\s*:))|("(?:\\.|[^"\\])*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false)\b|\bnull\b|([{}[\]:,])/g
  let index = 0
  for (const match of line.matchAll(pattern)) {
    const start = match.index ?? 0
    if (start > index) tokens.push({ value: line.slice(index, start), type: 'plain' })

    const value = match[0]
    if (match[1]) tokens.push({ value, type: 'key' })
    else if (match[2]) tokens.push({ value, type: 'string' })
    else if (match[3]) tokens.push({ value, type: 'number' })
    else if (match[4]) tokens.push({ value, type: 'boolean' })
    else if (value === 'null') tokens.push({ value, type: 'null' })
    else tokens.push({ value, type: 'punctuation' })
    index = start + value.length
  }

  if (index < line.length) tokens.push({ value: line.slice(index), type: 'plain' })
  return tokens.length ? tokens : [{ value: line, type: 'plain' }]
}
</script>

<template>
  <BaseModal :is-open="isOpen" max-width="1180px" height="760px" @close="emit('close')">
    <section class="workflow-git-modal" aria-label="Workflow git">
      <header class="workflow-git-modal__topbar">
        <div class="workflow-git-modal__repo-card">
          <LucideIcon name="book-marked" :size="15" />
          <div>
            <span>Current repository</span>
            <strong>{{ workflow.metadata.name }}</strong>
          </div>
        </div>
        <div class="workflow-git-modal__repo-card">
          <LucideIcon name="git-branch" :size="15" />
          <div>
            <span>Current branch</span>
            <strong>{{ branchLabel }}</strong>
          </div>
        </div>
        <div class="workflow-git-modal__repo-card">
          <LucideIcon name="git-commit-horizontal" :size="15" />
          <div>
            <span>Last commit</span>
            <strong>{{ commitHash }}</strong>
          </div>
        </div>
        <button class="workflow-git-modal__icon-button" type="button" title="Close" @click="emit('close')">
          <LucideIcon name="x" :size="15" />
        </button>
      </header>

      <div class="workflow-git-modal__body">
        <aside class="workflow-git-modal__sidebar">
          <div class="workflow-git-modal__section-header">
            <span>Changes</span>
            <strong>{{ changedFileCount }}</strong>
          </div>
          <button
            class="workflow-git-modal__file"
            type="button"
            :class="{ 'workflow-git-modal__file--active': changedFileCount > 0 }"
          >
            <LucideIcon name="file-json" :size="14" />
            <span>workflow.json</span>
            <small>{{ changedLines.length }}</small>
          </button>

          <div class="workflow-git-modal__commit-box">
            <label>
              <span>Summary</span>
              <input
                v-model="summary"
                class="workflow-git-modal__summary-input"
                type="text"
                placeholder="Commit summary"
              >
            </label>
            <label>
              <span>Description</span>
              <textarea
                v-model="description"
                class="workflow-git-modal__description-input"
                rows="4"
                placeholder="Optional details"
              />
            </label>
            <button
              class="workflow-git-modal__commit-button"
              type="button"
              :disabled="!canCommit"
              @click="requestCommit"
            >
              <LucideIcon name="check" :size="14" />
              <span>Commit to workflow.json</span>
            </button>
          </div>
        </aside>

        <main class="workflow-git-modal__main">
          <div class="workflow-git-modal__filebar">
            <div>
              <LucideIcon name="file-json" :size="14" />
              <span>workflow.json</span>
            </div>
            <div class="workflow-git-modal__stats" aria-label="Diff summary">
              <span class="workflow-git-modal__stat workflow-git-modal__stat--added">+{{ diffStats.added }}</span>
              <span class="workflow-git-modal__stat workflow-git-modal__stat--removed">-{{ diffStats.removed }}</span>
              <span class="workflow-git-modal__stat workflow-git-modal__stat--modified">~{{ diffStats.modified }}</span>
            </div>
          </div>

          <div class="workflow-git-modal__diff" role="table" aria-label="Workflow JSON diff">
            <div v-if="isLoadingSnapshots" class="workflow-git-modal__state">
              Loading latest commit...
            </div>
            <div v-else-if="snapshotError" class="workflow-git-modal__state workflow-git-modal__state--error">
              {{ snapshotError }}
            </div>
            <div v-else-if="changedLines.length === 0" class="workflow-git-modal__state">
              No changes in workflow.json
            </div>
            <div
              v-for="(line, index) in diffLines"
              v-else
              :key="`${index}-${line.type}`"
              class="workflow-git-modal__line"
              :class="`workflow-git-modal__line--${line.type}`"
              role="row"
            >
              <span class="workflow-git-modal__gutter workflow-git-modal__line-number">{{ line.oldLineNumber ?? '' }}</span>
              <span class="workflow-git-modal__gutter workflow-git-modal__line-number">{{ line.newLineNumber ?? '' }}</span>
              <span class="workflow-git-modal__line-marker">
                {{ line.type === 'added' ? '+' : line.type === 'removed' ? '-' : line.type === 'modified' ? '~' : ' ' }}
              </span>
              <code class="workflow-git-modal__line-code">
                <span
                  v-for="(token, tokenIndex) in tokenizeJsonLine(line.content)"
                  :key="tokenIndex"
                  :class="`json-token json-token--${token.type}`"
                >{{ token.value }}</span>
              </code>
            </div>
          </div>
        </main>
      </div>
    </section>
  </BaseModal>
</template>

<style scoped>
.workflow-git-modal {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--sailor-bg-base);
  color: var(--sailor-text-primary);
}

.workflow-git-modal__topbar {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(180px, 1fr) minmax(180px, 1fr) 32px;
  gap: var(--sailor-space-3);
  padding: var(--sailor-space-3);
  border-bottom: 1px solid var(--sailor-border);
  background: var(--sailor-bg-surface);
}

.workflow-git-modal__repo-card {
  min-width: 0;
  height: 46px;
  display: flex;
  align-items: center;
  gap: var(--sailor-space-2);
  padding: 0 var(--sailor-space-3);
  border: 1px solid var(--sailor-border-subtle);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-elevated);
}

.workflow-git-modal__repo-card span,
.workflow-git-modal__commit-box label span {
  display: block;
  color: var(--sailor-text-muted);
  font-size: 11px;
}

.workflow-git-modal__repo-card strong {
  display: block;
  overflow: hidden;
  color: var(--sailor-text-primary);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workflow-git-modal__icon-button {
  width: 32px;
  height: 32px;
  align-self: center;
  display: inline-grid;
  place-items: center;
  border: 1px solid var(--sailor-border-subtle);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-elevated);
  color: var(--sailor-text-secondary);
}

.workflow-git-modal__icon-button:hover {
  border-color: var(--sailor-border-strong);
  background: var(--sailor-button-ghost-hover);
  color: var(--sailor-text-primary);
}

.workflow-git-modal__body {
  min-height: 0;
  flex: 1;
  display: grid;
  grid-template-columns: 250px minmax(0, 1fr);
}

.workflow-git-modal__sidebar {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sailor-space-2);
  padding: var(--sailor-space-3);
  border-right: 1px solid var(--sailor-border);
  background: var(--sailor-bg-surface);
}

.workflow-git-modal__section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 30px;
  padding: 0 var(--sailor-space-2);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-elevated);
  color: var(--sailor-text-primary);
  font-size: 12px;
}

.workflow-git-modal__section-header strong {
  min-width: 20px;
  height: 18px;
  display: inline-grid;
  place-items: center;
  border-radius: 999px;
  background: var(--sailor-bg-base);
  color: var(--sailor-text-muted);
  font-size: 10px;
}

.workflow-git-modal__file {
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr) 28px;
  align-items: center;
  gap: var(--sailor-space-2);
  min-height: 34px;
  padding: 0 var(--sailor-space-2);
  border: 1px solid transparent;
  border-radius: var(--sailor-radius-sm);
  background: transparent;
  color: var(--sailor-text-secondary);
  text-align: left;
}

.workflow-git-modal__file--active,
.workflow-git-modal__file:hover {
  border-color: var(--sailor-border-subtle);
  background: var(--sailor-bg-elevated);
  color: var(--sailor-text-primary);
}

.workflow-git-modal__file span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workflow-git-modal__file small {
  color: var(--sailor-text-muted);
  text-align: right;
}

.workflow-git-modal__commit-box {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: var(--sailor-space-2);
}

.workflow-git-modal__summary-input,
.workflow-git-modal__description-input {
  width: 100%;
  margin-top: 5px;
  border: 1px solid var(--sailor-border-subtle);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-elevated);
  color: var(--sailor-text-primary);
  font: inherit;
  font-size: 12px;
}

.workflow-git-modal__summary-input {
  height: 34px;
  padding: 0 var(--sailor-space-2);
}

.workflow-git-modal__description-input {
  min-height: 74px;
  resize: vertical;
  padding: var(--sailor-space-2);
}

.workflow-git-modal__summary-input:focus,
.workflow-git-modal__description-input:focus {
  outline: 0;
  border-color: var(--sailor-focus-ring);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--sailor-focus-ring) 28%, transparent);
}

.workflow-git-modal__commit-button {
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--sailor-space-2);
  border: 1px solid color-mix(in srgb, var(--sailor-blue-400) 62%, transparent);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-blue-500);
  color: white;
  font-size: 12px;
  font-weight: var(--sailor-font-semibold);
}

.workflow-git-modal__commit-button:hover:not(:disabled) {
  background: var(--sailor-blue-400);
}

.workflow-git-modal__commit-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.workflow-git-modal__main {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.workflow-git-modal__filebar {
  flex: 0 0 auto;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sailor-space-3);
  padding: 0 var(--sailor-space-3);
  border-bottom: 1px solid var(--sailor-border);
  background: var(--sailor-bg-surface);
}

.workflow-git-modal__filebar > div,
.workflow-git-modal__stats {
  display: inline-flex;
  align-items: center;
  gap: var(--sailor-space-2);
}

.workflow-git-modal__stat {
  min-width: 42px;
  height: 22px;
  display: inline-grid;
  place-items: center;
  border: 1px solid transparent;
  border-radius: var(--sailor-radius-sm);
  font-family: var(--sailor-font-mono);
  font-size: 11px;
  font-weight: var(--sailor-font-semibold);
}

.workflow-git-modal__stat--added {
  border-color: var(--sailor-status-success-border);
  background: var(--sailor-status-success-bg);
  color: var(--sailor-status-success-text);
}

.workflow-git-modal__stat--removed {
  border-color: var(--sailor-status-error-border);
  background: var(--sailor-status-error-bg);
  color: var(--sailor-status-error-text);
}

.workflow-git-modal__stat--modified {
  border-color: var(--sailor-status-running-border);
  background: var(--sailor-status-running-bg);
  color: var(--sailor-status-running-text);
}

.workflow-git-modal__diff {
  min-height: 0;
  flex: 1;
  overflow: auto;
  padding: 8px 0;
  background: var(--sailor-bg-base);
  font-family: var(--sailor-font-mono);
  font-size: 11px;
  line-height: 1.55;
}

.workflow-git-modal__line {
  display: grid;
  grid-template-columns: 48px 48px 24px minmax(480px, 1fr);
  min-height: 20px;
  color: var(--sailor-text-primary);
}

.workflow-git-modal__line--added {
  background: color-mix(in srgb, var(--sailor-green-400) 16%, transparent);
  box-shadow: inset 3px 0 0 var(--sailor-green-400);
}

.workflow-git-modal__line--removed {
  background: color-mix(in srgb, var(--sailor-red-400) 16%, transparent);
  box-shadow: inset 3px 0 0 var(--sailor-red-400);
}

.workflow-git-modal__line--modified {
  background: color-mix(in srgb, var(--sailor-amber-400) 16%, transparent);
  box-shadow: inset 3px 0 0 var(--sailor-amber-400);
}

.workflow-git-modal__gutter {
  border-right: 1px solid var(--sailor-border-muted);
  background: color-mix(in srgb, var(--sailor-bg-surface) 72%, transparent);
}

.workflow-git-modal__line-number {
  padding: 0 8px;
  color: var(--sailor-text-muted);
  text-align: right;
  user-select: none;
}

.workflow-git-modal__line-marker {
  color: var(--sailor-text-muted);
  text-align: center;
  user-select: none;
}

.workflow-git-modal__line-code {
  padding: 0 12px 0 0;
  white-space: pre;
}

.workflow-git-modal__state {
  height: 100%;
  min-height: 180px;
  display: grid;
  place-items: center;
  color: var(--sailor-text-muted);
  font-family: var(--sailor-font-sans);
  font-size: 12px;
}

.workflow-git-modal__state--error {
  color: var(--sailor-status-error-text);
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
