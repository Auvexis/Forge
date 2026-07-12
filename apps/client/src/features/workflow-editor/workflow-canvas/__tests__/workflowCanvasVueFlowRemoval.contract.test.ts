import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = fileURLToPath(new URL('../../../../..', import.meta.url))
const workflowEditorRoot = join(root, 'src', 'features', 'workflow-editor')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return listFiles(path)
    return /\.(ts|vue)$/.test(path) ? [path] : []
  })
}

describe('workflow canvas Vue Flow removal contract', () => {
  it('removes Vue Flow packages from the client package manifest', () => {
    const pkg = read('package.json')

    assert.doesNotMatch(pkg, /@vue-flow\/core/)
    assert.doesNotMatch(pkg, /@vue-flow\/background/)
  })

  it('removes Vue Flow imports from workflow editor source files', () => {
    const offenders = listFiles(workflowEditorRoot)
      .filter((file) => !file.includes(`${join('__tests__')}`))
      .filter((file) => /@vue-flow|VueFlow|useVueFlow/.test(read(relative(root, file))))
      .map((file) => relative(workflowEditorRoot, file))

    assert.deepEqual(offenders, [])
  })

  it('uses WorkflowBaseCanvas directly without the migration feature flag', () => {
    const canvas = read('src/features/workflow-editor/components/FabricWorkflowCanvas.vue')

    assert.match(canvas, /<WorkflowBaseCanvas/)
    assert.doesNotMatch(canvas, /shouldUseWorkflowBaseCanvas/)
    assert.doesNotMatch(canvas, /v-else/)
    assert.doesNotMatch(canvas, /<VueFlow/)
  })

  it('enables passive rulers in the workflow BaseCanvas', () => {
    const canvas = read('src/features/workflow-editor/components/WorkflowBaseCanvas.vue')

    assert.match(canvas, /<BaseCanvas[\s\S]*rulers/)
    assert.match(canvas, /rulers-bg="var\(--fabric-workbench-status-bg\)"/)
    assert.match(canvas, /rulers-text="var\(--fabric-text-muted\)"/)
    assert.match(canvas, /rulers-lines="var\(--fabric-workbench-border\)"/)
  })
})
