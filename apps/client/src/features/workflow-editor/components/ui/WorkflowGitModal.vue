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
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseDropdownSelect, { type BaseDropdownSelectOption } from '@/shared/components/base/BaseDropdownSelect.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseModal from '@/shared/components/base/BaseModal.vue'
import BaseTextarea from '@/shared/components/base/BaseTextarea.vue'
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
  (e: 'restore', hash: string): void
}>()

const latestSnapshot = ref<WorkflowGitSnapshotFile | null>(null)
const snapshots = ref<WorkflowGitSnapshotSummary[]>([])
const selectedSnapshotHash = ref('')
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
const selectedSnapshotLabel = computed(() => {
  const selected = snapshots.value.find((snapshot) => snapshot.hash === selectedSnapshotHash.value)
  if (!selected) return 'Latest commit'
  return `${selected.shortHash} - ${selected.message}`
})
const versionOptions = computed<BaseDropdownSelectOption[]>(() => {
  if (snapshots.value.length === 0) {
    return [{
      value: '',
      label: isLoadingSnapshots.value ? 'Loading versions...' : 'No commits yet',
      shortLabel: isLoadingSnapshots.value ? 'Loading versions...' : 'No commits yet',
      description: 'Create a commit to restore versions',
      meta: '--',
    }]
  }

  return snapshots.value.map((snapshot) => ({
    value: snapshot.hash,
    label: snapshot.message,
    shortLabel: `${snapshot.shortHash} - ${snapshot.message}`,
    description: formatSnapshotDate(snapshot.committedAt),
    meta: snapshot.shortHash,
  }))
})
const commitMessage = computed(() => {
  const title = summary.value.trim()
  const body = description.value.trim()
  return body ? `${title}\n\n${body}` : title
})
const canCommit = computed(() => commitMessage.value.length > 0 && !props.isCommitting)
const canRestore = computed(() => selectedSnapshotHash.value.length > 0 && !props.isCommitting)
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

watch(selectedSnapshotHash, (hash) => {
  void loadSelectedSnapshot(hash)
})

function resetCommitInputs() {
  summary.value = `Update ${props.workflow.metadata.name}`
  description.value = ''
}

async function loadLatestSnapshot() {
  isLoadingSnapshots.value = true
  snapshotError.value = ''
  try {
    snapshots.value = await workflowsApi.listGitSnapshots(props.workflow.metadata.id)
    const latest = snapshots.value[0]
    selectedSnapshotHash.value = latest?.hash ?? ''
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

async function loadSelectedSnapshot(hash: string) {
  if (!hash) {
    latestSnapshot.value = null
    return
  }

  snapshotError.value = ''
  try {
    latestSnapshot.value = await workflowsApi.getGitSnapshot(props.workflow.metadata.id, hash)
  } catch (error) {
    latestSnapshot.value = null
    snapshotError.value = error instanceof Error ? error.message : 'Failed to load selected commit'
  }
}

function requestCommit() {
  if (!canCommit.value) return
  emit('commit', commitMessage.value)
}

function requestRestore() {
  if (!canRestore.value) return
  emit('restore', selectedSnapshotHash.value)
}

function formatSnapshotDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
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
        <div class="workflow-git-modal__repo-field">
          <LucideIcon name="book-marked" :size="15" />
          <div>
            <span>Current repository</span>
            <strong>{{ workflow.metadata.name }}</strong>
          </div>
        </div>
        <div class="workflow-git-modal__repo-field">
          <LucideIcon name="git-branch" :size="15" />
          <div>
            <span>Current branch</span>
            <strong>{{ branchLabel }}</strong>
          </div>
        </div>
        <div class="workflow-git-modal__repo-field">
          <LucideIcon name="git-commit-horizontal" :size="15" />
          <div>
            <span>Last commit</span>
            <strong>{{ commitHash }}</strong>
          </div>
        </div>
        <div class="workflow-git-modal__version-select">
          <LucideIcon name="history" :size="15" />
          <div>
            <span>Version</span>
            <BaseDropdownSelect
              v-model="selectedSnapshotHash"
              :options="versionOptions"
              :disabled="isLoadingSnapshots || snapshots.length === 0"
              class="workflow-git-modal__version-dropdown"
              trigger-class="workflow-git-modal__version-trigger"
              menu-class="workflow-git-modal__version-menu"
              icon-left=""
              open-icon="chevron-down"
              close-icon="chevron-up"
              direction="down"
            >
              <template #trigger="{ option }">
                <span class="workflow-git-modal__version-trigger-copy">
                  {{ option?.shortLabel ?? 'No commits yet' }}
                </span>
              </template>
              <template #option="{ option, selected }">
                <span class="workflow-git-modal__version-option" :class="{ 'workflow-git-modal__version-option--active': selected }">
                  <span class="workflow-git-modal__version-option-hash">{{ option.meta }}</span>
                  <span class="workflow-git-modal__version-option-copy">
                    <strong>{{ option.label }}</strong>
                    <small>{{ option.description }}</small>
                  </span>
                </span>
              </template>
            </BaseDropdownSelect>
          </div>
        </div>
      </header>

      <div class="workflow-git-modal__body">
        <aside class="workflow-git-modal__sidebar">
          <div class="workflow-git-modal__section-header">
            <span>Changes</span>
            <strong>{{ changedFileCount }}</strong>
          </div>
          <BaseButton
            class="workflow-git-modal__file"
            type="button"
            variant="ghost"
            size="sm"
            :class="{ 'workflow-git-modal__file--active': changedFileCount > 0 }"
          >
            <LucideIcon name="file-json" :size="14" />
            <span>workflow.json</span>
            <small>{{ changedLines.length }}</small>
          </BaseButton>

          <div class="workflow-git-modal__commit-box">
            <div class="workflow-git-modal__field-row">
              <span>Summary</span>
              <BaseInput
                v-model="summary"
                class="workflow-git-modal__summary-input"
                type="text"
              />
            </div>
            <div class="workflow-git-modal__field-row workflow-git-modal__field-row--stacked">
              <span>Description</span>
              <BaseTextarea
                v-model="description"
                class="workflow-git-modal__description-input"
                :rows="4"
              />
            </div>
            <BaseButton
              class="workflow-git-modal__commit-button"
              type="button"
              icon-left="check"
              variant="primary"
              size="md"
              full-width
              :loading="isCommitting"
              :disabled="!canCommit"
              @click="requestCommit"
            >
              Commit to workflow.json
            </BaseButton>
            <BaseButton
              class="workflow-git-modal__restore-button"
              type="button"
              icon-left="rotate-ccw"
              variant="outline"
              size="md"
              full-width
              :disabled="!canRestore"
              @click="requestRestore"
            >
              Restore version
            </BaseButton>
          </div>
        </aside>

        <main class="workflow-git-modal__main">
          <div class="workflow-git-modal__filebar">
            <div>
              <LucideIcon name="file-json" :size="14" />
              <span>workflow.json</span>
              <small>{{ selectedSnapshotLabel }}</small>
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
  overflow: hidden;
  background: var(--fabric-workflow-git-bg);
  color: var(--fabric-workflow-git-text);
}

.workflow-git-modal__topbar {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: minmax(190px, 1fr) minmax(150px, 0.7fr) minmax(130px, 0.6fr) minmax(280px, 1.35fr);
  gap: 1px;
  min-height: 38px;
  padding: 1px;
  border-bottom: 1px solid var(--fabric-workflow-git-topbar-bg);
  background: var(--fabric-workflow-git-topbar-bg);
}

.workflow-git-modal__repo-field,
.workflow-git-modal__version-select {
  min-width: 0;
  height: 36px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  background: var(--fabric-workflow-git-topbar-field-bg);
}

.workflow-git-modal__repo-field span,
.workflow-git-modal__version-select span,
.workflow-git-modal__field-row > span {
  display: block;
  color: var(--fabric-workflow-git-text-muted);
  font-size: 11px;
  line-height: 1;
}

.workflow-git-modal__repo-field strong {
  display: block;
  overflow: hidden;
  color: var(--fabric-workflow-git-text);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workflow-git-modal__version-select div {
  min-width: 0;
  flex: 1;
}

.workflow-git-modal__version-dropdown {
  width: 100%;
}

.workflow-git-modal__version-dropdown :deep(.workflow-git-modal__version-trigger) {
  width: 100%;
  height: 22px;
  min-height: 22px;
  justify-content: space-between;
  border: 1px solid var(--fabric-workflow-git-topbar-trigger-border);
  border-radius: 2px;
  background: var(--fabric-workflow-git-topbar-trigger-bg);
  padding: 0 4px;
  color: var(--fabric-workflow-git-text);
  font-size: 12px;
  font-weight: var(--fabric-font-semibold);
}

.workflow-git-modal__version-dropdown :deep(.workflow-git-modal__version-trigger:hover) {
  border-color: var(--fabric-workflow-git-topbar-trigger-hover-border);
  background: var(--fabric-workflow-git-topbar-trigger-hover-bg);
  color: var(--fabric-workflow-git-text);
}

.workflow-git-modal__version-trigger-copy {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workflow-git-modal__version-dropdown :deep(.workflow-git-modal__version-menu) {
  left: auto;
  right: 0;
  width: 330px;
  max-height: 360px;
  border-color: var(--fabric-workflow-git-menu-border);
  border-radius: 2px;
  background: var(--fabric-workflow-git-menu-bg);
}

.workflow-git-modal__version-option {
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
  align-items: center;
  gap: var(--fabric-space-2);
  width: 100%;
  min-width: 0;
}

.workflow-git-modal__version-option-hash {
  color: var(--fabric-workflow-git-accent);
  font-family: var(--fabric-font-mono);
  font-size: 11px;
}

.workflow-git-modal__version-option-copy {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.workflow-git-modal__version-option-copy strong,
.workflow-git-modal__version-option-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workflow-git-modal__version-option-copy strong {
  color: var(--fabric-workflow-git-text);
  font-size: 12px;
}

.workflow-git-modal__version-option-copy small {
  color: var(--fabric-workflow-git-text-muted);
  font-size: 10px;
  margin-left: 8px;
}

.workflow-git-modal__body {
  min-height: 0;
  flex: 1;
  display: grid;
  grid-template-columns: 268px minmax(0, 1fr);
}

.workflow-git-modal__sidebar {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  border-right: 1px solid var(--fabric-workflow-git-sidebar-border);
  background: var(--fabric-workflow-git-sidebar-bg);
}

.workflow-git-modal__section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 24px;
  padding: 0 8px;
  border-bottom: 1px solid var(--fabric-workflow-git-section-header-border);
  background: var(--fabric-workflow-git-section-header-bg);
  color: var(--fabric-workflow-git-text);
  font-size: 12px;
  font-weight: var(--fabric-font-semibold);
}

.workflow-git-modal__section-header strong {
  min-width: 18px;
  height: 16px;
  display: inline-grid;
  place-items: center;
  border-radius: 2px;
  background: transparent;
  color: var(--fabric-workflow-git-text-muted);
  font-size: 10px;
}

.workflow-git-modal__file {
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr) 28px;
  align-items: center;
  justify-content: stretch;
  gap: 6px;
  width: 100%;
  min-height: 26px;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: 2px;
  background: var(--fabric-workflow-git-file-bg);
  color: var(--fabric-workflow-git-file-text);
  text-align: left;
}

.workflow-git-modal__file :deep(.base-button__label) {
  display: contents;
}

.workflow-git-modal__file--active,
.workflow-git-modal__file:hover {
  border-color: var(--fabric-workflow-git-file-active-border);
  background: var(--fabric-workflow-git-file-active-bg);
  color: var(--fabric-workflow-git-text);
}

.workflow-git-modal__file span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workflow-git-modal__file small {
  color: var(--fabric-workflow-git-text-muted);
  text-align: right;
}

.workflow-git-modal__commit-box {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--fabric-workflow-git-commit-divider);
}

.workflow-git-modal__field-row {
  display: grid;
  grid-template-columns: 74px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  min-height: 26px;
}

.workflow-git-modal__field-row--stacked {
  align-items: start;
}

.workflow-git-modal__field-row--stacked > span {
  padding-top: 8px;
}

.workflow-git-modal__summary-input :deep(.base-input) {
  height: 24px;
  font-family: var(--fabric-font-mono);
  font-size: 11px;
}

.workflow-git-modal__description-input :deep(.base-textarea) {
  min-height: 74px;
  font-family: var(--fabric-font-mono);
  font-size: 11px;
  line-height: 1.35;
}

.workflow-git-modal__commit-button,
.workflow-git-modal__restore-button {
  height: 28px;
  border-radius: 2px;
  font-size: 12px;
}

.workflow-git-modal__commit-button :deep(.base-button__label),
.workflow-git-modal__restore-button :deep(.base-button__label) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workflow-git-modal__restore-button {
  border: 1px solid var(--fabric-workflow-git-restore-border);
  background: var(--fabric-workflow-git-restore-bg);
  color: var(--fabric-workflow-git-text);
}

.workflow-git-modal__restore-button:hover:not(:disabled) {
  border-color: var(--fabric-workflow-git-restore-hover-border);
  background: var(--fabric-workflow-git-restore-hover-bg);
}

.workflow-git-modal__commit-button:disabled,
.workflow-git-modal__restore-button:disabled {
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
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 10px;
  border-bottom: 1px solid var(--fabric-workflow-git-filebar-border);
  background: var(--fabric-workflow-git-filebar-bg);
}

.workflow-git-modal__filebar > div,
.workflow-git-modal__stats {
  display: inline-flex;
  align-items: center;
  gap: var(--fabric-space-2);
}

.workflow-git-modal__filebar small {
  color: var(--fabric-workflow-git-text-muted);
  font-size: 11px;
}

.workflow-git-modal__stat {
  min-width: 38px;
  height: 20px;
  display: inline-grid;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 2px;
  font-family: var(--fabric-font-mono);
  font-size: 11px;
}

.workflow-git-modal__stat--added {
  border-color: var(--fabric-workflow-git-stat-added-border);
  background: var(--fabric-workflow-git-stat-added-bg);
  color: var(--fabric-workflow-git-stat-added-text);
}

.workflow-git-modal__stat--removed {
  border-color: var(--fabric-workflow-git-stat-removed-border);
  background: var(--fabric-workflow-git-stat-removed-bg);
  color: var(--fabric-workflow-git-stat-removed-text);
}

.workflow-git-modal__stat--modified {
  border-color: var(--fabric-workflow-git-stat-modified-border);
  background: var(--fabric-workflow-git-stat-modified-bg);
  color: var(--fabric-workflow-git-stat-modified-text);
}

.workflow-git-modal__diff {
  min-height: 0;
  flex: 1;
  overflow: auto;
  padding: 8px 0;
  background: var(--fabric-workflow-git-diff-bg);
  font-family: var(--fabric-font-mono);
  font-size: 11px;
  line-height: 1.55;
}

.workflow-git-modal__line {
  display: grid;
  grid-template-columns: 48px 48px 24px minmax(480px, 1fr);
  min-height: 20px;
  color: var(--fabric-workflow-git-line-text);
}

.workflow-git-modal__line--added {
  background: var(--fabric-workflow-git-line-added-bg);
  box-shadow: inset 3px 0 0 var(--fabric-workflow-git-line-added-accent);
}

.workflow-git-modal__line--removed {
  background: var(--fabric-workflow-git-line-removed-bg);
  box-shadow: inset 3px 0 0 var(--fabric-workflow-git-line-removed-accent);
}

.workflow-git-modal__line--modified {
  background: var(--fabric-workflow-git-line-modified-bg);
  box-shadow: inset 3px 0 0 var(--fabric-workflow-git-line-modified-accent);
}

.workflow-git-modal__gutter {
  border-right: 1px solid var(--fabric-workflow-git-gutter-border);
  background: var(--fabric-workflow-git-gutter-bg);
}

.workflow-git-modal__line-number {
  padding: 0 8px;
  color: var(--fabric-workflow-git-text-muted);
  text-align: right;
  user-select: none;
}

.workflow-git-modal__line-marker {
  color: var(--fabric-workflow-git-text-muted);
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
  color: var(--fabric-workflow-git-text-muted);
  font-family: var(--fabric-font-sans);
  font-size: 12px;
}

.workflow-git-modal__state--error {
  color: var(--fabric-workflow-git-state-error-text);
}

.json-token--key {
  color: var(--fabric-workflow-git-syntax-key);
}

.json-token--string {
  color: var(--fabric-workflow-git-syntax-string);
}

.json-token--number {
  color: var(--fabric-workflow-git-syntax-number);
}

.json-token--boolean,
.json-token--null {
  color: var(--fabric-workflow-git-syntax-boolean);
}

.json-token--punctuation {
  color: var(--fabric-workflow-git-syntax-punctuation);
}

.json-token--plain {
  color: var(--fabric-workflow-git-syntax-plain);
}
</style>
