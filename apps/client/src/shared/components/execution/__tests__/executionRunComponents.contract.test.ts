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
    assert.match(source, /var\(--fabric-duration-slow\)/)
    assert.match(source, /var\(--fabric-ease-decelerate\)/)
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
    assert.match(source, /border-left: 1px solid var\(--fabric-border-strong\)/)
    assert.match(source, /border-top: 1px solid var\(--fabric-border-strong\)/)
    assert.match(source, /\.execution-node-tree \{[^}]*gap: var\(--fabric-space-2\)/)
    assert.match(source, /\.execution-node-tree--nested \{[^}]*margin-left: calc\(var\(--fabric-space-4\) \+ 7px\)/)
    assert.match(source, /\.execution-node-tree__branch::after \{[^}]*top: 0;[^}]*height: 18px/)
    assert.match(source, /\.execution-node-tree__branch--first::after \{[^}]*top: calc\(-1 \* var\(--fabric-space-2\)\);[^}]*height: calc\(18px \+ var\(--fabric-space-2\)\)/)
    assert.match(source, /\.execution-node-tree__branch--has-next::after \{[^}]*bottom: calc\(-1 \* var\(--fabric-space-2\)\)/)
    assert.match(source, /\.execution-node-tree__row \{[^}]*padding: var\(--fabric-space-2\)/)
    assert.match(source, /\.execution-node-tree__row \{[^}]*margin-left: var\(--fabric-space-2\)/)
    assert.match(source, /\.execution-node-tree__row \{[^}]*border: 1px solid var\(--fabric-border-muted\)/)
    assert.match(source, /\.execution-node-tree__row \{[^}]*border-radius: 2px/)
    assert.doesNotMatch(source, /\.execution-node-tree__row \{[^}]*border-radius: var\(--fabric-radius-sm\)/)
    assert.match(source, /v-if="node\.children\.length"/)
    assert.match(source, /execution-node-tree__row--leaf/)
    assert.match(source, /execution-node-tree__row--success/)
    assert.match(source, /execution-node-tree__row--failed/)
    assert.match(source, /execution-node-tree__row--error/)
    assert.match(source, /\.execution-node-tree__row--leaf[^}]*grid-template-columns: 24px minmax\(0,\s*1fr\) auto/)
    assert.match(source, /width: calc\(var\(--fabric-space-3\) \+ var\(--fabric-space-2\)\)/)
    assert.doesNotMatch(source, /visibility: hidden/)
    assert.match(source, /width: max-content/)
    assert.match(source, /min-width: 100%/)
    assert.match(source, /width: 280px/)
    assert.match(source, /v-if="node\.avatar"/)
    assert.match(source, /execution-node-tree__avatar/)
    assert.match(source, /var\(--fabric-duration-base\)/)
    const iconRule = source.match(/\.execution-node-tree__icon\s*{[^}]*}/)?.[0] ?? ''
    assert.doesNotMatch(iconRule, /background:/)
    assert.doesNotMatch(iconRule, /border:/)

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

  it('keeps the run detail focused on the execution tree instead of a final result card', () => {
    const detail = read('ExecutionRunDetail.vue')
    const types = read('executionRunTree.types.ts')

    assert.match(types, /ExecutionRunFinalResult/)
    assert.match(types, /finalResult\?: ExecutionRunFinalResult/)
    assert.match(detail, /ExecutionNodeTree/)
    assert.doesNotMatch(detail, /Final Result/)
    assert.doesNotMatch(detail, /detail\.finalResult/)
    assert.doesNotMatch(detail, /execution-run-detail__result/)
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
    assert.match(source, /:open="hasData\(node\.input\)"/)
    assert.match(source, /:open="hasData\(node\.output\)"/)
    assert.match(source, /node\.kind !== 'error'/)
    assert.match(source, /Input/)
    assert.match(source, /Output/)
    assert.match(source, /Error/)
    assert.match(source, /Retries/)
    assert.match(source, /JSON\.stringify/)
    assert.match(source, /\.execution-node-inspector__section \{[^}]*border: 1px solid var\(--fabric-border-muted\)/)
    assert.match(source, /\.execution-node-inspector__section \{[^}]*border-radius: 2px/)
    assert.match(source, /\.execution-node-inspector__section :deep\(\.base-code-editor\) \{[^}]*border-radius: 0/)
    assert.doesNotMatch(source, /\.execution-node-inspector__section \{[^}]*border-radius: var\(--fabric-radius-sm\)/)
    assert.doesNotMatch(source, /v-html/)
  })
})
