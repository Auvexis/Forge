import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const paletteCss = readFileSync(fileURLToPath(new URL('../command-palette.css', import.meta.url)), 'utf8')
const baseModal = readFileSync(
  fileURLToPath(new URL('../../../shared/components/base/BaseModal.vue', import.meta.url)),
  'utf8',
)
const baseMiniMenu = readFileSync(
  fileURLToPath(new URL('../../../shared/components/base/BaseMiniMenu.vue', import.meta.url)),
  'utf8',
)
const baseSelect = readFileSync(
  fileURLToPath(new URL('../../../shared/components/base/BaseSelect.vue', import.meta.url)),
  'utf8',
)

test('command palette owns the highest overlay z-index', () => {
  assert.match(paletteCss, /z-index:\s*2147483647/)
  assert.match(baseModal, /z-index:\s*2147483000/)
  assert.match(baseMiniMenu, /z-index:\s*2147483400/)
  assert.match(baseSelect, /zIndex:\s*'2147483400'/)
})
