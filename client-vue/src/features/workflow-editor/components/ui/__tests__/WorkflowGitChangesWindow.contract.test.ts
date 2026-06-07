import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const source = readFileSync(
  fileURLToPath(new URL('../WorkflowGitChangesWindow.vue', import.meta.url)),
  'utf8',
)

test('workflow git changes window uses a floating window shell', () => {
  assert.match(source, /BaseFloatingWindow/)
  assert.match(source, /title="Changes"/)
  assert.match(source, /storage-key="workflow-git-changes-window"/)
  assert.match(source, /aria-label="Workflow changes viewer"/)
})

test('workflow git changes window exposes disabled git toolbar actions', () => {
  assert.match(source, /workflow-git-changes-window__toolbar/)
  assert.match(source, />\s*Create Snapshot\s*</)
  assert.match(source, />\s*Snapshots\s*</)
  assert.match(source, />\s*Diff\s*</)
  assert.match(source, /disabled/)
})

test('workflow git changes window renders raw workflow json', () => {
  assert.match(source, /rawWorkflowJson/)
  assert.match(source, /JSON\.stringify\(props\.workflow, null, 2\)/)
  assert.match(source, /<pre class="workflow-git-changes-window__raw"/)
})

test('workflow git changes window loads and displays git snapshots', () => {
  assert.match(source, /workflowsApi\.listGitSnapshots/)
  assert.match(source, /workflowsApi\.getGitSnapshot/)
  assert.match(source, /snapshotOptions/)
  assert.match(source, /selectedSnapshotHash/)
  assert.match(source, /<select/)
  assert.match(source, /snapshot\.shortHash/)
  assert.match(source, /snapshot\.committedAt/)
})

test('workflow git changes window supports live diff mode', () => {
  assert.match(source, /buildWorkflowJsonDiff/)
  assert.match(source, /viewerMode/)
  assert.match(source, /debouncedDiffLines/)
  assert.match(source, /window\.setTimeout/)
  assert.match(source, /workflow-git-changes-window__line--added/)
  assert.match(source, /workflow-git-changes-window__line--removed/)
  assert.match(source, /workflow-git-changes-window__line--modified/)
  assert.match(source, /Unsaved changes/)
})

test('workflow git changes window has polished diff indicators', () => {
  assert.match(source, /diffStats/)
  assert.match(source, /workflow-git-changes-window__stat--added/)
  assert.match(source, /workflow-git-changes-window__stat--removed/)
  assert.match(source, /workflow-git-changes-window__stat--modified/)
  assert.match(source, /var\(--sailor-status-success-bg\)/)
  assert.match(source, /var\(--sailor-status-error-bg\)/)
  assert.match(source, /var\(--sailor-status-running-bg\)/)
  assert.match(source, /workflow-git-changes-window__gutter/)
})

test('workflow git changes window applies a JSON syntax theme without v-html', () => {
  assert.match(source, /tokenizeJsonLine/)
  assert.match(source, /renderRawJsonLines/)
  assert.match(source, /json-token--key/)
  assert.match(source, /json-token--string/)
  assert.match(source, /json-token--number/)
  assert.match(source, /json-token--boolean/)
  assert.match(source, /json-token--null/)
  assert.doesNotMatch(source, /v-html/)
})

test('workflow git changes window confirms and emits restored snapshots', () => {
  assert.match(source, /defineEmits/)
  assert.match(source, /\(e: 'restore', hash: string\): void/)
  assert.match(source, /Restore/)
  assert.match(source, /selectedSnapshotHash/)
  assert.match(source, /emit\('restore', selectedSnapshotHash\.value\)/)
})
