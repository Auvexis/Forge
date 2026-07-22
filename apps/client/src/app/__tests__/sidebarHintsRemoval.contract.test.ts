import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it } from 'node:test'

const root = process.cwd()

function read(relativePath: string) {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

describe('sidebar hints removal', () => {
  it('renders sidebar items directly without sidebar hint metadata', () => {
    const app = read('src/app/App.vue')

    assert.equal(existsSync(resolve(root, 'src/shared/components/layout/sidebarHints.ts')), false)
    assert.match(app, /<template v-for="item in section\.items" :key="item\.id">/)
    assert.doesNotMatch(app, /sidebarHints|sidebarHintById|hintFor|hintId/)
    assert.doesNotMatch(app, /AppHint/)
  })
})
