import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '../../../../../..')

function read(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

const nodes = [
  ['basic-llm-chain', 'BasicLlmChainNode', 'BasicLlmChainEditor'],
  ['structured-json-parser', 'StructuredJsonParserNode', 'StructuredJsonParserEditor'],
  ['vector-store-retriever', 'VectorStoreRetrieverNode', 'VectorStoreRetrieverEditor'],
  ['question-answer-chain', 'QuestionAnswerChainNode', 'QuestionAnswerChainEditor'],
  ['vector-store-tool', 'VectorStoreToolNode', 'VectorStoreToolEditor'],
] as const

test('workflow types expose all reusable advanced AI nodes', () => {
  const types = read('src/core/types/workflow.types.ts')

  for (const [nodeType, componentName] of nodes) {
    assert.match(types, new RegExp(`\\| '${nodeType}'`))
    assert.match(types, new RegExp(`export interface ${componentName}`))
    assert.match(types, new RegExp(`\\| ${componentName}`))
  }
})

test('workflow canvas registers renderers and backend-valid defaults', () => {
  const canvas = read('src/features/workflow-editor/components/SailorWorkflowCanvas.vue')

  for (const [nodeType, componentName] of nodes) {
    assert.match(canvas, new RegExp(`import ${componentName} from './nodes/${componentName}\\.vue'`))
    assert.match(canvas, new RegExp(`#node-${nodeType}="nodeProps"`))
    assert.match(canvas, new RegExp(`type === '${nodeType}'`))
  }

  assert.match(canvas, /defaultData\.schema = \{ type: 'object' \}/)
  assert.match(canvas, /defaultData\.strict = true/)
  assert.match(canvas, /defaultData\.failurePolicy = 'error'/)
  assert.match(canvas, /defaultData\.topK = 5/)
  assert.match(canvas, /defaultData\.input = 'trigger\.body'/)
  assert.match(canvas, /defaultData\.question = 'trigger\.body\.question'/)
})

test('all five node shells and editors are registered', () => {
  const registry = read('src/features/workflow-editor/components/settings/editors/index.ts')

  for (const [nodeType, componentName, editorName] of nodes) {
    const component = read(`src/features/workflow-editor/components/nodes/${componentName}.vue`)
    assert.match(component, /BaseAdvancedNode/)
    assert.match(component, new RegExp(`getAdvancedNodeHandlers\\('${nodeType}'\\)`))
    assert.match(registry, new RegExp(`import ${editorName}`))
    assert.match(registry, new RegExp(`'${nodeType}': ${editorName}`))
  }

  const parser = read('src/features/workflow-editor/components/nodes/StructuredJsonParserNode.vue')
  assert.match(parser, /rounded="full"/)
  assert.match(parser, /width="100px"/)
  assert.match(parser, /height="100px"/)
})

test('catalog declares generic capability handles for advanced AI nodes', () => {
  const manifest = read('../server/src/core/utility-nodes/sailor-core/manifest.ts')

  assert.match(manifest, /"basic-llm-chain"[\s\S]*id: "model"[\s\S]*capability: "chat-model"[\s\S]*id: "outputParser"[\s\S]*capability: "output-parser"[\s\S]*quickAddAfterConnected: true/)
  assert.match(manifest, /"structured-json-parser"[\s\S]*capabilities: \["output-parser"\][\s\S]*id: "source"[\s\S]*style: "diamond"/)
  assert.match(manifest, /"vector-store-retriever"[\s\S]*capabilities: \["retriever"\][\s\S]*id: "vectorStore"[\s\S]*capability: "vector-store"/)
  assert.match(manifest, /"question-answer-chain"[\s\S]*id: "model"[\s\S]*capability: "chat-model"[\s\S]*id: "retriever"[\s\S]*capability: "retriever"/)
  assert.match(manifest, /"vector-store-tool"[\s\S]*capabilities: \["agent-tool"\][\s\S]*id: "vectorStore"[\s\S]*capability: "vector-store"[\s\S]*id: "model"[\s\S]*capability: "chat-model"/)
})
