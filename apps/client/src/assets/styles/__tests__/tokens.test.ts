import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const tokensCss = readFileSync(new URL('../tokens.css', import.meta.url), 'utf8')

describe('layout color tokens', () => {
  const tokenNames = [
    '--fabric-sidebar-bg',
    '--fabric-sidebar-border',
    '--fabric-sidebar-divider',
    '--fabric-sidebar-text',
    '--fabric-sidebar-text-muted',
    '--fabric-sidebar-link-text',
    '--fabric-topbar-bg',
    '--fabric-topbar-border',
    '--fabric-topbar-search-bg',
    '--fabric-topbar-search-border',
    '--fabric-topbar-search-text',
    '--fabric-topbar-search-hover-text',
    '--fabric-topbar-search-hover-bg',
    '--fabric-topbar-kbd-bg',
    '--fabric-topbar-notification-badge-text',
  ]

  it('defines sidebar and topbar color tokens for dark and light themes', () => {
    const lightThemeBlock = tokensCss.slice(tokensCss.indexOf(':root.light'))

    for (const tokenName of tokenNames) {
      assert.match(tokensCss, new RegExp(`${tokenName}:`))
      assert.match(lightThemeBlock, new RegExp(`${tokenName}:`))
    }
  })
})

describe('component semantic color tokens', () => {
  const tokenNames = [
    '--fabric-base-button-primary-bg',
    '--fabric-base-button-ghost-hover-bg',
    '--fabric-base-input-bg',
    '--fabric-base-select-menu-bg',
    '--fabric-base-modal-bg',
    '--fabric-base-topbar-button-hover-bg',
    '--fabric-app-popover-bg',
    '--fabric-app-dropdown-item-hover-bg',
    '--fabric-notification-panel-bg',
    '--fabric-notification-trigger-badge-text',
    '--fabric-data-table-bg',
    '--fabric-code-block-bg',
    '--fabric-app-shell-bg',
    '--fabric-app-panel-bg',
    '--fabric-base-canvas-bg',
    '--fabric-base-canvas-ruler-z',
    '--fabric-base-canvas-selection-bg',
    '--fabric-base-canvas-alignment-guide-bg',
    '--fabric-workflow-node-bg',
    '--fabric-workflow-node-border',
    '--fabric-workflow-handle-bg',
    '--fabric-workflow-edge-stroke',
    '--fabric-workflow-edge-toolbar-bg',
    '--fabric-workflow-edge-label-bg',
    '--fabric-base-input-radius',
    '--fabric-base-select-radius',
    '--fabric-base-modal-radius',
    '--fabric-base-code-editor-radius',
    '--fabric-base-code-editor-bg',
    '--fabric-base-code-editor-text',
    '--fabric-base-code-editor-header-bg',
    '--fabric-base-code-editor-line-number-text',
    '--fabric-base-topbar-button-radius',
    '--fabric-app-confirm-panel-radius',
    '--fabric-app-dropdown-menu-radius',
    '--fabric-app-dropdown-item-radius',
    '--fabric-execution-node-tree-row-radius',
  ]

  it('defines component-specific aliases as CSS fallbacks for JSON themes', () => {
    for (const tokenName of tokenNames) {
      assert.match(tokensCss, new RegExp(`${tokenName}:`))
    }
  })
})
