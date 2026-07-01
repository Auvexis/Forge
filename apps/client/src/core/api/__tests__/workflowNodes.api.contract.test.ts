import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))
const apiDir = resolve(currentDir, '..')
const coreDir = resolve(apiDir, '..')

function read(path: string): string {
  return readFileSync(resolve(coreDir, path), 'utf8')
}

describe('workflow nodes api contract', () => {
  it('exposes the workflow node catalog endpoint, api client, and DTO types', () => {
    const endpoints = read('api/endpoints.ts')
    const api = read('api/workflowNodes.api.ts')
    const types = read('types/workflow-node-catalog.types.ts')

    assert.match(endpoints, /WORKFLOW_NODE_CATALOG: '\/workflow-nodes\/catalog'/)
    assert.match(api, /export const workflowNodesApi/)
    assert.match(api, /getCatalog/)
    assert.match(types, /export interface WorkflowNodeStyle/)
    assert.match(types, /icon: string/)
    assert.match(types, /iconColor: string/)
    assert.match(types, /bgColor: string/)
    assert.match(types, /borderColor: string/)
    assert.match(types, /export interface WorkflowNodeCatalogItem/)
    assert.match(types, /export interface WorkflowNodeHandleDefinition/)
    assert.match(types, /role: WorkflowNodeRole/)
    assert.match(types, /capabilities: string\[\]/)
    assert.match(types, /handles: WorkflowNodeHandleDefinition\[\]/)
    assert.match(types, /presentation: WorkflowNodePresentation/)
    assert.match(types, /export interface WorkflowNodeCatalogResponse/)
  })
})
