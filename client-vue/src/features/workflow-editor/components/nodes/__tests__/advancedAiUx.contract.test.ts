import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const read = (relativePath: string) => fs.readFileSync(path.join(currentDir, relativePath), 'utf8')

test('advanced handles preserve bottom targets, top diamond sources, and persistent Quick Add', () => {
  const manifest = read('../../../../../../../server/src/core/utility-nodes/sailor-core/manifest.ts')
  assert.match(manifest, /"basic-llm-chain"[\s\S]*id: "model"[\s\S]*position: "bottom"[\s\S]*style: "diamond"/)
  assert.match(manifest, /id: "outputParser"[\s\S]*quickAddAfterConnected: true/)
  assert.match(manifest, /"structured-json-parser"[\s\S]*id: "source"[\s\S]*position: "top"[\s\S]*style: "diamond"/)
  assert.match(manifest, /"vector-store"[\s\S]*id: "document"[\s\S]*quickAddAfterConnected: true/)
  assert.match(manifest, /"ai-agent"[\s\S]*id: "tool"[\s\S]*quickAddAfterConnected: true/)
})

test('configuration nodes stay out of the global picker', () => {
  const picker = read('../../settings/addNodePickerModel.ts')
  const panel = read('../../settings/AddNodePanel.vue')
  assert.match(picker, /preset\.role !== 'configuration'/)
  assert.match(panel, /filterDefaultPickerPresets\(catalogPresets\)/)
})

test('configuration edge styling is catalog-driven without hardcoded handle ids', () => {
  const edge = read('../../BaseEdge.vue')
  const registry = read('../../../catalog/nodeDefinitionRegistry.ts')
  assert.doesNotMatch(edge, /CONFIGURATION_TARGET_HANDLES/)
  assert.match(edge, /getNodeDefinition/)
  assert.match(edge, /useWorkflowStore/)
  assert.match(edge, /activeWorkflow\?\.edges\.find/)
  assert.match(edge, /targetHandle/)
  assert.match(edge, /accepts/)
  assert.match(registry, /shallowRef/)
  assert.match(registry, /definitions\.value/)
})

test('advanced layout and canvas support nested auto-organized dependencies', () => {
  const canvas = read('../../SailorWorkflowCanvas.vue')
  const layout = read('../../../layout/advancedNodeLayout.ts')
  assert.match(canvas, /getAdvancedChildPosition/)
  assert.match(canvas, /arrangeAdvancedConfigNodes/)
  assert.match(canvas, /workflowNodesApi\.getCatalog/)
  assert.match(canvas, /replaceNodeDefinitions/)
  assert.match(layout, /parent/)
  assert.match(layout, /handlerIndex/)
  assert.match(layout, /siblingIndex/)
})
