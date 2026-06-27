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
    assert.match(source, /border-left: 1px solid var\(--sailor-border-strong\)/)
    assert.match(source, /border-top: 1px solid var\(--sailor-border-strong\)/)
    assert.match(source, /\.execution-node-tree \{[^}]*gap: var\(--sailor-space-2\)/)
    assert.match(source, /\.execution-node-tree__branch::after \{[^}]*height: calc\(36px \+ var\(--sailor-space-2\)\)/)
    assert.match(source, /\.execution-node-tree__branch--has-next::after \{[^}]*bottom: calc\(-1 \* var\(--sailor-space-2\)\)/)
    assert.match(source, /\.execution-node-tree__row \{[^}]*padding: var\(--sailor-space-2\)/)
    assert.match(source, /\.execution-node-tree__row \{[^}]*margin-left: var\(--sailor-space-2\)/)
    assert.match(source, /var\(--sailor-duration-base\)/)
    assert.doesNotMatch(source, /execution-node-tree__icon[\s\S]*background:/)
    assert.doesNotMatch(source, /execution-node-tree__icon[\s\S]*border:/)
  })

  it('shows the selected real icon and guarded text payload details', () => {
    const source = read('ExecutionNodeInspector.vue')

    assert.match(source, /LucideIcon/)
    assert.match(source, /node\.icon/)
    assert.match(source, /Input/)
    assert.match(source, /Output/)
    assert.match(source, /Retries/)
    assert.match(source, /JSON\.stringify/)
    assert.doesNotMatch(source, /v-html/)
  })
})
