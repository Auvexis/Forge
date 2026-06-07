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
