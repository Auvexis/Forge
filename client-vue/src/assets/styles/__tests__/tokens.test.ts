import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const tokensCss = readFileSync(new URL('../tokens.css', import.meta.url), 'utf8')

describe('layout color tokens', () => {
  const tokenNames = [
    '--sailor-sidebar-bg',
    '--sailor-sidebar-border',
    '--sailor-sidebar-divider',
    '--sailor-sidebar-text',
    '--sailor-sidebar-text-muted',
    '--sailor-sidebar-link-text',
    '--sailor-topbar-bg',
    '--sailor-topbar-border',
    '--sailor-topbar-search-bg',
    '--sailor-topbar-search-border',
    '--sailor-topbar-search-text',
    '--sailor-topbar-search-hover-text',
    '--sailor-topbar-search-hover-bg',
    '--sailor-topbar-kbd-bg',
  ]

  it('defines sidebar and topbar color tokens for dark and light themes', () => {
    const lightThemeBlock = tokensCss.slice(tokensCss.indexOf(':root.light'))

    for (const tokenName of tokenNames) {
      assert.match(tokensCss, new RegExp(`${tokenName}:`))
      assert.match(lightThemeBlock, new RegExp(`${tokenName}:`))
    }
  })
})
