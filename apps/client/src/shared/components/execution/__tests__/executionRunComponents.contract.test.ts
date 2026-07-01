import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

function read(name: string) {
  return readFileSync(fileURLToPath(new URL(`../${name}`, import.meta.url)), 'utf8')
}

describe('shared execution run components', () => {
  it('navigates from runs to a right-sliding run detail', () => {
    const source = read('ExecutionRunExplorer.vue')

    assert.match(source, /ExecutionRunsView/)
    assert.match(source, /ExecutionRunDetail/)
    assert.match(source, /buildExecutionRunDetail/)
    assert.match(source, /name="execution-run-slide"/)
    assert.match(source, /translateX\(100%\)/)
    assert.match(source, /var\(--sailor-duration-slow\)/)
    assert.match(source, /var\(--sailor-ease-decelerate\)/)
  })

  it('renders runs and UI actions with BaseButton and LucideIcon', () => {
    const source = read('ExecutionRunsView.vue')

    assert.match(source, /BaseButton/)
    assert.match(source, /LucideIcon/)
    assert.match(source, /v-for="run in sortedRuns"/)
    assert.match(source, /emit\('select', run\.id\)/)
  })

  it('renders a collapsible tree with complete branch connectors and clean node icons', () => {
    const source = read('ExecutionNodeTree.vue')

    assert.match(source, /<ExecutionNodeTree/)
    assert.match(source, /LucideIcon/)
    assert.match(source, /BaseButton/)
    assert.match(source, /execution-node-tree__branch--has-next/)
    assert.match(source, /execution-node-tree__branch--first/)
    assert.match(source, /border-left: 1px solid var\(--sailor-border-strong\)/)
    assert.match(source, /border-top: 1px solid var\(--sailor-border-strong\)/)
    assert.match(source, /\.execution-node-tree \{[^}]*gap: var\(--sailor-space-2\)/)
    assert.match(source, /\.execution-node-tree--nested \{[^}]*margin-left: calc\(var\(--sailor-space-4\) \+ 7px\)/)
    assert.match(source, /\.execution-node-tree__branch::after \{[^}]*top: 0;[^}]*height: 18px/)
    assert.match(source, /\.execution-node-tree__branch--first::after \{[^}]*top: calc\(-1 \* var\(--sailor-space-2\)\);[^}]*height: calc\(18px \+ var\(--sailor-space-2\)\)/)
    assert.match(source, /\.execution-node-tree__branch--has-next::after \{[^}]*bottom: calc\(-1 \* var\(--sailor-space-2\)\)/)
    assert.match(source, /\.execution-node-tree__row \{[^}]*padding: var\(--sailor-space-2\)/)
    assert.match(source, /\.execution-node-tree__row \{[^}]*margin-left: var\(--sailor-space-2\)/)
    assert.match(source, /v-if="node\.children\.length"/)
    assert.match(source, /execution-node-tree__row--leaf/)
    assert.match(source, /\.execution-node-tree__row--leaf[^}]*grid-template-columns: 24px minmax\(0,\s*1fr\) auto/)
    assert.match(source, /width: calc\(var\(--sailor-space-3\) \+ var\(--sailor-space-2\)\)/)
    assert.doesNotMatch(source, /visibility: hidden/)
    assert.match(source, /width: max-content/)
    assert.match(source, /min-width: 100%/)
    assert.match(source, /width: 280px/)
    assert.match(source, /v-if="node\.avatar"/)
    assert.match(source, /execution-node-tree__avatar/)
    assert.match(source, /var\(--sailor-duration-base\)/)
    assert.doesNotMatch(source, /execution-node-tree__icon[\s\S]*background:/)
    assert.doesNotMatch(source, /execution-node-tree__icon[\s\S]*border:/)

    const detail = read('ExecutionRunDetail.vue')
    assert.match(detail, /overflow: auto/)
  })

  it('loads real catalog and plugin presentation for execution nodes', () => {
    const source = read('ExecutionRunExplorer.vue')

    assert.match(source, /workflowNodesApi\.getCatalog/)
    assert.match(source, /pluginsApi\.getAll/)
    assert.match(source, /resolvePluginIcon/)
    assert.match(source, /nodePresentations/)
  })

  it('shows final workflow result above the step tree while keeping the tree visible', () => {
    const detail = read('ExecutionRunDetail.vue')
    const types = read('executionRunTree.types.ts')

    assert.match(types, /ExecutionRunFinalResult/)
    assert.match(types, /finalResult\?: ExecutionRunFinalResult/)
    assert.match(detail, /Final Result/)
    assert.match(detail, /detail\.finalResult/)
    assert.match(detail, /detail\.finalResult\.label/)
    assert.match(detail, /detail\.finalResult\.value/)
    assert.match(detail, /BaseCodeEditor/)
    assert.match(detail, /ExecutionNodeTree/)
    assert.match(detail, /execution-run-detail__result/)
  })

  it('shows the selected real icon and guarded text payload details', () => {
    const source = read('ExecutionNodeInspector.vue')

    assert.match(source, /LucideIcon/)
    assert.match(source, /node\.icon/)
    assert.match(source, /node\.avatar/)
    assert.match(source, /BaseCodeEditor/)
    assert.match(source, /language="json"/)
    assert.match(source, /readonly/)
    assert.match(source, /:model-value="formatJson\(node\.input\)"/)
    assert.match(source, /:model-value="formatJson\(node\.output\)"/)
    assert.match(source, /Input/)
    assert.match(source, /Output/)
    assert.match(source, /Retries/)
    assert.match(source, /JSON\.stringify/)
    assert.doesNotMatch(source, /v-html/)
  })
})
