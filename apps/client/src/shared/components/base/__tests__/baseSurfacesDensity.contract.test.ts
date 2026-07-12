import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const baseModalSource = readFileSync(
  fileURLToPath(new URL('../BaseModal.vue', import.meta.url)),
  'utf8',
)
const baseMiniMenuSource = readFileSync(
  fileURLToPath(new URL('../BaseMiniMenu.vue', import.meta.url)),
  'utf8',
)

describe('base surface density', () => {
  it('keeps BaseModal flat and tool-like instead of card-heavy', () => {
    assert.match(baseModalSource, /\.base-modal-container\s*\{[\s\S]*border: 1px solid var\(--fabric-border\);/)
    assert.match(baseModalSource, /\.base-modal-container\s*\{[\s\S]*box-shadow: none;/)
    assert.match(baseModalSource, /\.base-modal-container\s*\{[\s\S]*border-radius: var\(--fabric-radius-md\);/)
  })

  it('keeps BaseMiniMenu compact for command-style overlays', () => {
    assert.match(baseMiniMenuSource, /\.bmm-header\s*\{[\s\S]*min-height: 36px;/)
    assert.match(baseMiniMenuSource, /\.bmm-body\s*\{[\s\S]*padding: var\(--fabric-space-3\);/)
    assert.match(baseMiniMenuSource, /\.bmm-footer\s*\{[\s\S]*padding: var\(--fabric-space-2\) var\(--fabric-space-3\);/)
    assert.match(baseMiniMenuSource, /\.bmm-dialog\s*\{[\s\S]*box-shadow: none;/)
  })
})
