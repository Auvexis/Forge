import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const tokensCss = readFileSync(new URL('../tokens.css', import.meta.url), 'utf8')

describe('layout color tokens', () => {
  const tokenNames = [
    '--nod8-sidebar-bg',
    '--nod8-sidebar-border',
    '--nod8-sidebar-divider',
    '--nod8-sidebar-text',
    '--nod8-sidebar-text-muted',
    '--nod8-sidebar-link-text',
    '--nod8-topbar-bg',
    '--nod8-topbar-border',
    '--nod8-topbar-search-bg',
    '--nod8-topbar-search-border',
    '--nod8-topbar-search-text',
    '--nod8-topbar-search-hover-text',
    '--nod8-topbar-search-hover-bg',
    '--nod8-topbar-kbd-bg',
  ]

  it('defines sidebar and topbar color tokens for dark and light themes', () => {
    const lightThemeBlock = tokensCss.slice(tokensCss.indexOf(':root.light'))

    for (const tokenName of tokenNames) {
      assert.match(tokensCss, new RegExp(`${tokenName}:`))
      assert.match(lightThemeBlock, new RegExp(`${tokenName}:`))
    }
  })
})
