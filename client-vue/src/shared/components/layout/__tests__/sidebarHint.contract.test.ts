import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))
const layoutDir = resolve(currentDir, '..')
const appSource = readFileSync(resolve(currentDir, '../../../../app/App.vue'), 'utf8')
const appHintSource = readFileSync(resolve(currentDir, '../../hints/AppHint.vue'), 'utf8')
const sidebarHintsSource = readFileSync(resolve(layoutDir, 'sidebarHints.ts'), 'utf8')

describe('sidebar hint migration contract', () => {
  it('removes the sidebar-only hint component and uses generic AppHint', () => {
    assert.equal(existsSync(resolve(layoutDir, 'SidebarHint.vue')), false)
    assert.doesNotMatch(appSource, /SidebarHint/)
    assert.match(appSource, /AppHint/)
  })

  it('keeps hover positioning behavior in the generic hint component', () => {
    assert.match(appHintSource, /window\.addEventListener\('resize'/)
    assert.match(appHintSource, /ResizeObserver/)
    assert.match(appHintSource, /updatePosition/)
  })

  it('stores sidebar hint copy outside navigation metadata', () => {
    assert.match(sidebarHintsSource, /sidebarHintById/)
    assert.match(sidebarHintsSource, /workflows/)
    assert.match(sidebarHintsSource, /docs/)
  })
})
