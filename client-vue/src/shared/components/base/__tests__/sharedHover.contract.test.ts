import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '../../../../..')

function read(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

test('shared dropdown and select items keep native hover and active backgrounds', () => {
  const baseSelect = read('src/shared/components/base/BaseSelect.vue')
  const dropdownSelect = read('src/shared/components/base/BaseDropdownSelect.vue')
  const dropdownItem = read('src/shared/components/overlay/Dropdown/AppDropdownItem.vue')

  assert.doesNotMatch(baseSelect, /style="position: relative; z-index: 1; background: transparent;"/)
  assert.match(baseSelect, /\.base-select-option:hover[\s\S]*background:\s*var\(--sailor-button-ghost-hover\)/)
  assert.match(baseSelect, /\.base-select-option--selected[\s\S]*background:\s*var\(--sailor-button-ghost-active\)/)

  assert.match(dropdownSelect, /\.base-dropdown-select__option:hover[\s\S]*background:\s*var\(--sailor-button-ghost-hover\)/)
  assert.match(dropdownSelect, /\.base-dropdown-select__option--active[\s\S]*background:\s*var\(--sailor-button-ghost-active\)/)

  assert.match(dropdownItem, /\.app-dropdown-item:hover:not\(:disabled\)[\s\S]*background:\s*var\(--sailor-button-ghost-hover\)/)
  assert.match(dropdownItem, /\.app-dropdown-item--danger:hover:not\(:disabled\)[\s\S]*background:\s*var\(--sailor-status-error-bg\)/)
})

test('shared layout menus keep hover and active feedback after animated menu removal', () => {
  const settings = read('src/shared/components/layout/AppGlobalSettings.vue')
  const monitor = read('src/shared/components/layout/AppGlobalAutomationMonitor.vue')

  assert.doesNotMatch(settings, /background:\s*transparent;\s*justify-content: flex-start;\s*width: 100%;/)
  assert.match(monitor, /\.gam-workflow:hover[\s\S]*background:\s*var\(--sailor-button-ghost-hover\)/)
  assert.match(monitor, /\.gam-workflow--active[\s\S]*background:\s*var\(--sailor-button-ghost-active\)/)
  assert.match(monitor, /\.gam-tab:hover[\s\S]*background:\s*var\(--sailor-button-ghost-hover\)/)
  assert.match(monitor, /\.gam-tab--active[\s\S]*background:\s*var\(--sailor-button-ghost-active\)/)
  assert.match(monitor, /\.gam-event-row:hover[\s\S]*background:\s*var\(--sailor-button-ghost-hover\)/)
})
