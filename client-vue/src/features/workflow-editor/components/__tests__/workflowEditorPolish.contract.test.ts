import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

function read(relative: string) {
  return readFileSync(fileURLToPath(new URL(`../${relative}`, import.meta.url)), 'utf8')
}

describe('workflow editor polish contracts', () => {
  it('plugin triggers render with the selected integration icon and On Message event label', () => {
    const source = read('nodes/TriggerNode.vue')

    assert.match(source, /selectedPlugin/)
    assert.match(source, /resolvePluginIcon/)
    assert.match(source, /pluginTriggerEventLabel/)
    assert.match(source, /On Message/)
    assert.match(source, /var\(--sailor-node-plugin-bg\)/)
    assert.match(source, /var\(--sailor-node-plugin-border\)/)
  })

  it('edge labels are edited by double click inline and the toolbar has no label button', () => {
    const source = read('BaseEdge.vue')

    assert.match(source, /@dblclick\.stop="startEditLabel"/)
    assert.match(source, /sailor-edge-label-shell/)
    assert.match(source, /edgeItemCountLabel/)
    assert.doesNotMatch(source, /title="Edit label"/)
    assert.doesNotMatch(source, /name="tag"/)
  })

  it('node toolbar exposes a disable toggle and disabled nodes render dimmed', () => {
    const toolbar = read('nodes/NodeToolbar.vue')
    const baseNode = read('BaseNode.vue')
    const triggerNode = read('nodes/TriggerNode.vue')

    assert.match(toolbar, /toggleDisabled/)
    assert.match(toolbar, /isNodeDisabled/)
    assert.match(toolbar, /title="Disable node"/)
    assert.match(baseNode, /is-disabled/)
    assert.match(baseNode, /opacity: 0\.45/)
    assert.match(triggerNode, /is-disabled/)
  })
})
