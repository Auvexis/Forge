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

test('workflow git changes window is a preview helper without git actions', () => {
  assert.doesNotMatch(source, /workflow-git-changes-window__toolbar/)
  assert.doesNotMatch(source, />\s*Create Snapshot\s*</)
  assert.doesNotMatch(source, />\s*Snapshots\s*</)
  assert.doesNotMatch(source, />\s*Restore\s*</)
  assert.doesNotMatch(source, /<select/)
  assert.doesNotMatch(source, /viewerMode/)
})

test('workflow git changes window compares live workflow json with latest commit', () => {
  assert.match(source, /latestSnapshot/)
  assert.match(source, /latestCommitLabel/)
  assert.match(source, /JSON\.stringify\(props\.workflow, null, 2\)/)
  assert.match(source, /workflowsApi\.listGitSnapshots/)
  assert.match(source, /workflowsApi\.getGitSnapshot/)
  assert.doesNotMatch(source, /<pre class="workflow-git-changes-window__raw"/)
})

test('workflow git changes window supports live diff mode', () => {
  assert.match(source, /buildWorkflowJsonDiff/)
  assert.match(source, /debouncedDiffLines/)
  assert.match(source, /window\.setTimeout/)
  assert.match(source, /workflow-git-changes-window__line--added/)
  assert.match(source, /workflow-git-changes-window__line--removed/)
  assert.match(source, /workflow-git-changes-window__line--modified/)
  assert.match(source, /Live changes/)
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
  assert.match(source, /json-token--key/)
  assert.match(source, /json-token--string/)
  assert.match(source, /json-token--number/)
  assert.match(source, /json-token--boolean/)
  assert.match(source, /json-token--null/)
  assert.doesNotMatch(source, /v-html/)
})

test('workflow git changes window has loading empty and error states', () => {
  assert.match(source, /workflow-git-changes-window__empty/)
  assert.match(source, /isLoadingSnapshots/)
  assert.match(source, /No commits yet/)
  assert.match(source, /snapshotError/)
  assert.match(source, /workflow-git-changes-window__viewer--empty/)
  assert.doesNotMatch(source, /defineEmits/)
})
