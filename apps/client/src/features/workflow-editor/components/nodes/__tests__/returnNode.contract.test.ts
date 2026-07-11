import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '../../../../../..')

function read(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

function sliceBlock(source: string, start: string, next: string): string {
  const startIndex = source.indexOf(start)
  assert.notEqual(startIndex, -1)
  const nextIndex = source.indexOf(next, startIndex)
  assert.notEqual(nextIndex, -1)
  return source.slice(startIndex, nextIndex)
}

test('workflow canvas renders return with the ReturnNode shell', () => {
  const canvas = read('src/features/workflow-editor/components/WorkflowBaseCanvas.vue')
  const nodePath = resolve(root, 'src/features/workflow-editor/components/nodes/ReturnNode.vue')

  assert.equal(existsSync(nodePath), true)
  assert.match(canvas, /import ReturnNode from '\.\/nodes\/ReturnNode\.vue'/)
  assert.match(canvas, /return: ReturnNode/)
  assert.match(canvas, /return: 'Return'/)
  assert.match(canvas, /if \(type === 'return'\) return \{ mode: 'all-steps' \}/)
})

test('return node presentation is terminal and uses return visual tokens', () => {
  const node = read('src/features/workflow-editor/components/nodes/ReturnNode.vue')
  const tokens = read('src/assets/styles/tokens.css')
  const executionTree = read('src/shared/components/execution/executionRunTreeModel.ts')

  assert.match(node, /type \{ ReturnNode \}/)
  assert.match(node, /has-target/)
  assert.doesNotMatch(node, /has-source/)
  assert.match(node, /subtitle="Workflow result"/)
  assert.match(node, /icon="corner-down-left"/)
  assert.match(node, /var\(--fabric-node-return-icon\)/)
  assert.match(tokens, /--fabric-node-return-bg/)
  assert.match(tokens, /--fabric-node-return-icon/)
  assert.match(tokens, /--fabric-node-return-border/)
  assert.match(executionTree, /return: 'corner-down-left'/)
  assert.match(executionTree, /return: 'var\(--fabric-node-return-icon\)'/)
})

test('utility catalog exposes Return as a normal terminal flow node', () => {
  const manifest = read('../server/src/core/utility-nodes/fabric-core/manifest.ts')
  const returnBlock = sliceBlock(manifest, '    return: {', '    "respond-webhook":')

  assert.match(returnBlock, /label: "Return"/)
  assert.match(returnBlock, /icon: "corner-down-left"/)
  assert.match(returnBlock, /category: "Flow"/)
  assert.match(returnBlock, /handles: \[[\s\S]*id: "target"/)
  assert.doesNotMatch(returnBlock, /id: "source"/)
  assert.match(returnBlock, /var\(--fabric-node-return-icon\)/)
})
