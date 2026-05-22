import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

const nodeDir = path.resolve('src/features/plugin-creator/components/nodes')

describe('Plugin Creator control nodes', () => {
  it('IfNode uses workflow-style branch handles and quick add buttons', () => {
    const source = fs.readFileSync(path.join(nodeDir, 'IfNode.vue'), 'utf8')

    assert.match(source, /BaseHandle/)
    assert.match(source, /BaseBadge/)
    assert.match(source, /QuickAddButton/)
    assert.match(source, /handle-id="then"/)
    assert.match(source, /handle-id="else"/)
    assert.match(source, /True/)
    assert.match(source, /False/)
  })

  it('SwitchNode uses workflow-style dynamic handles and quick add buttons', () => {
    const source = fs.readFileSync(path.join(nodeDir, 'SwitchNode.vue'), 'utf8')

    assert.match(source, /BaseHandle/)
    assert.match(source, /BaseBadge/)
    assert.match(source, /QuickAddButton/)
    assert.match(source, /nodeHeight/)
    assert.match(source, /handlePositions/)
    assert.match(source, /default/)
  })

  it('TryCatchNode uses workflow-style dynamic catch handles and quick add buttons', () => {
    const source = fs.readFileSync(path.join(nodeDir, 'TryCatchNode.vue'), 'utf8')

    assert.match(source, /BaseHandle/)
    assert.match(source, /BaseBadge/)
    assert.match(source, /QuickAddButton/)
    assert.match(source, /catchCases/)
    assert.match(source, /nodeHeight/)
    assert.match(source, /handlePositions/)
    assert.match(source, /try/)
  })
})
