import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '../../../../../..')

function read(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

test('workflow canvas renders call-workflow with the CallWorkflowNode shell only', () => {
  const canvas = read('src/features/workflow-editor/components/WorkflowBaseCanvas.vue')

  assert.match(canvas, /import CallWorkflowNode from '\.\/nodes\/CallWorkflowNode\.vue'/)
  assert.match(canvas, /'call-workflow': CallWorkflowNode/)
  assert.doesNotMatch(canvas, /SubWorkflowNode/)
})

test('call workflow node presentation uses call workflow naming and handles', () => {
  const componentPath = resolve(
    root,
    'src/features/workflow-editor/components/nodes/CallWorkflowNode.vue',
  )
  assert.equal(existsSync(componentPath), true)

  const component = read('src/features/workflow-editor/components/nodes/CallWorkflowNode.vue')
  assert.match(component, /type \{ CallWorkflowNode \}/)
  assert.match(component, /has-target/)
  assert.match(component, /has-source/)
  assert.match(component, /nodeDescription/)
  assert.match(component, /targetWorkflowName/)
  assert.match(component, /targetTrigger\?\.name/)
  assert.match(component, /\$\{workflowName\} \| \$\{triggerName\}/)
  assert.match(component, /:subtitle="nodeDescription"/)
  assert.match(component, /icon="workflow"/)
  assert.doesNotMatch(component, /sub-workflow/i)
})

test('call workflow editor stores selected workflow name for canvas presentation', () => {
  const editor = read('src/features/workflow-editor/components/settings/editors/CallWorkflowEditor.vue')
  const types = read('src/core/types/workflow.types.ts')

  assert.match(types, /targetWorkflowName\?: string/)
  assert.match(editor, /targetWorkflowName: workflow\?\.name/)
})

test('settings registry registers CallWorkflowEditor and removes SubWorkflowEditor', () => {
  const registry = read('src/features/workflow-editor/components/settings/editors/index.ts')

  assert.match(registry, /import CallWorkflowEditor from '\.\/CallWorkflowEditor\.vue'/)
  assert.match(registry, /'call-workflow': CallWorkflowEditor/)
  assert.doesNotMatch(registry, /SubWorkflowEditor/)
  assert.equal(
    existsSync(resolve(root, 'src/features/workflow-editor/components/settings/editors/SubWorkflowEditor.vue')),
    false,
  )
})

test('call workflow editor names the callable target instead of sub-workflow copy', () => {
  const editorPath = resolve(
    root,
    'src/features/workflow-editor/components/settings/editors/CallWorkflowEditor.vue',
  )
  assert.equal(existsSync(editorPath), true)

  const editor = read('src/features/workflow-editor/components/settings/editors/CallWorkflowEditor.vue')
  assert.match(editor, /Published Workflow/)
  assert.match(editor, /Callable Trigger/)
  assert.match(editor, /Tool Name/)
  assert.doesNotMatch(editor, /sub-workflow/i)
})

test('utility catalog exposes Call Workflow without Sub-Workflow catalog copy', () => {
  const manifest = read('../server/src/core/utility-nodes/fabric-core/manifest.ts')

  assert.match(manifest, /"call-workflow"[\s\S]*label: "Call Workflow"/)
  assert.match(manifest, /"call-workflow"[\s\S]*icon: "workflow"/)
  assert.match(manifest, /"call-workflow"[\s\S]*handles: \[[\s\S]*id: "target"[\s\S]*id: "source"/)
  assert.doesNotMatch(manifest, /Sub-Workflow/)
})

test('call workflow presentation uses call-workflow visual tokens', () => {
  const manifest = read('../server/src/core/utility-nodes/fabric-core/manifest.ts')
  const node = read('src/features/workflow-editor/components/nodes/CallWorkflowNode.vue')
  const tokens = read('src/assets/styles/tokens.css')
  const executionTree = read('src/shared/components/execution/executionRunTreeModel.ts')

  for (const source of [manifest, node, tokens, executionTree]) {
    assert.doesNotMatch(source, /fabric-node-subworkflow/)
  }
  assert.match(manifest, /var\(--fabric-node-call-workflow-icon\)/)
  assert.match(node, /var\(--fabric-node-call-workflow-icon\)/)
  assert.match(tokens, /--fabric-node-call-workflow-icon/)
  assert.match(executionTree, /'call-workflow': 'workflow'/)
})
