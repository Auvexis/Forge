import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const read = (relativePath: string) => fs.readFileSync(path.join(currentDir, relativePath), 'utf8')

test('advanced handles preserve bottom targets, top diamond sources, and persistent Quick Add', () => {
  const manifest = read('../../../../../../../server/src/core/utility-nodes/fabric-core/manifest.ts')
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
  const edge = read('../../WorkflowEdge.vue')
  const edgeLayer = read('../../WorkflowEdgeLayer.vue')
  const registry = read('../../../catalog/nodeDefinitionRegistry.ts')
  assert.doesNotMatch(edge, /CONFIGURATION_TARGET_HANDLES/)
  assert.match(edgeLayer, /getNodeDefinition/)
  assert.match(edgeLayer, /useWorkflowStore/)
  assert.match(edgeLayer, /workflowStore\.activeWorkflow\?\.nodes/)
  assert.match(edgeLayer, /targetHandle/)
  assert.match(edgeLayer, /accepts/)
  assert.match(registry, /shallowRef/)
  assert.match(registry, /definitions\.value/)
})

test('advanced layout and canvas support nested auto-organized dependencies', () => {
  const canvas = read('../../WorkflowBaseCanvas.vue')
  const host = read('../../FabricWorkflowCanvas.vue')
  const layout = read('../../../layout/advancedNodeLayout.ts')
  assert.match(canvas, /getAdvancedChildPosition/)
  assert.match(canvas, /arrangeAdvancedConfigNodes/)
  assert.match(host, /workflowNodesApi\.getCatalog/)
  assert.match(canvas, /getAdvancedNodeHandlersForCanvas/)
  assert.match(layout, /parent/)
  assert.match(layout, /handlerIndex/)
  assert.match(layout, /siblingIndex/)
})
