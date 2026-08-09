import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const source = readFileSync(
  new URL('../BaseDesktopTopBar.vue', import.meta.url),
  'utf8',
)

describe('BaseDesktopTopBar', () => {
  it('uses desktop window controls through the Fabric Desktop bridge', () => {
    assert.match(source, /BaseWindowControls/)
    assert.match(source, /window\.fabricDesktop\.getWindowState/)
    assert.match(source, /window\.fabricDesktop\.onWindowStateChange/)
    assert.match(source, /window\.fabricDesktop\?\.minimize\(\)/)
    assert.match(source, /window\.fabricDesktop\?\.toggleMaximize\(\)/)
    assert.match(source, /window\.fabricDesktop\?\.close\(\)/)
    assert.match(source, /-webkit-app-region:\s*drag/)
    assert.match(source, /-webkit-app-region:\s*no-drag/)
  })
})
