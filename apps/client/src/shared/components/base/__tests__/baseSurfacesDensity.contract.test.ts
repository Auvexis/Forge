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
const baseInputSource = readFileSync(
  fileURLToPath(new URL('../BaseInput.vue', import.meta.url)),
  'utf8',
)
const baseButtonSource = readFileSync(
  fileURLToPath(new URL('../BaseButton.vue', import.meta.url)),
  'utf8',
)
const baseSelectSource = readFileSync(
  fileURLToPath(new URL('../BaseSelect.vue', import.meta.url)),
  'utf8',
)
const baseSegmentedSelectSource = readFileSync(
  fileURLToPath(new URL('../BaseSegmentedSelect.vue', import.meta.url)),
  'utf8',
)

describe('base surface density', () => {
  it('keeps BaseModal flat and tool-like instead of card-heavy', () => {
    assert.match(baseModalSource, /<Transition name="base-modal-window">/)
    assert.match(baseModalSource, /\.base-modal-backdrop\s*\{[\s\S]*background: var\(--fabric-base-modal-backdrop\);/)
    assert.match(baseModalSource, /\.base-modal-container\s*\{[\s\S]*background: var\(--fabric-base-modal-bg\);/)
    assert.match(baseModalSource, /\.base-modal-container\s*\{[\s\S]*border: 1px solid var\(--fabric-base-modal-border\);/)
    assert.match(baseModalSource, /\.base-modal-container\s*\{[\s\S]*box-shadow: none;/)
    assert.match(baseModalSource, /\.base-modal-container\s*\{[\s\S]*border-radius: 2px;/)
    assert.match(baseModalSource, /\.base-modal-window-enter-from \.base-modal-container\s*\{[\s\S]*translateY\(6px\) scale\(0\.992\)/)
    assert.doesNotMatch(baseModalSource, /translateY\(100vh\)/)
  })

  it('keeps BaseMiniMenu compact for command-style overlays', () => {
    assert.match(baseMiniMenuSource, /\.bmm-header\s*\{[\s\S]*min-height: 36px;/)
    assert.match(baseMiniMenuSource, /\.bmm-body\s*\{[\s\S]*padding: var\(--fabric-space-3\);/)
    assert.match(baseMiniMenuSource, /\.bmm-footer\s*\{[\s\S]*padding: var\(--fabric-space-2\) var\(--fabric-space-3\);/)
    assert.match(baseMiniMenuSource, /\.bmm-dialog\s*\{[\s\S]*box-shadow: none;/)
  })

  it('keeps shared form controls compact for professional panels', () => {
    assert.match(baseInputSource, /\.base-input\s*\{[\s\S]*height: 26px;/)
    assert.match(baseInputSource, /\.base-input-container\s*\{[\s\S]*border-radius: 2px;/)
    assert.match(baseButtonSource, /\.base-button--md\s*\{[\s\S]*height: 28px;/)
    assert.match(baseButtonSource, /\.base-button--icon\s*\{[\s\S]*width: 28px;[\s\S]*height: 28px;/)
    assert.match(baseSelectSource, /\.base-select-container\s*\{[\s\S]*min-height: 26px;/)
    assert.match(baseSelectSource, /\.base-select-dropdown\s*\{[\s\S]*box-shadow: none;/)
    assert.match(baseSegmentedSelectSource, /\.base-segmented-select__option\s*\{[\s\S]*height: 22px;/)
  })
})
