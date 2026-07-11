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
  ]

  it('defines sidebar and topbar color tokens for dark and light themes', () => {
    const lightThemeBlock = tokensCss.slice(tokensCss.indexOf(':root.light'))

    for (const tokenName of tokenNames) {
      assert.match(tokensCss, new RegExp(`${tokenName}:`))
      assert.match(lightThemeBlock, new RegExp(`${tokenName}:`))
    }
  })
})
