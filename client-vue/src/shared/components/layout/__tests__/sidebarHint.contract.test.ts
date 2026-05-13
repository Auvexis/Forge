import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(resolve(currentDir, '../SidebarHint.vue'), 'utf8')

describe('sidebar hint positioning contract', () => {
  it('refreshes its anchor rect while visible when the viewport or sidebar layout changes', () => {
    assert.match(source, /window\.addEventListener\('resize'/)
    assert.match(source, /ResizeObserver/)
    assert.match(source, /updatePosition/)
  })

  it('positions from cached reactive coordinates instead of a stale computed DOM read', () => {
    assert.match(source, /const anchorRect = ref/)
    assert.doesNotMatch(source, /wrapperRef\.value\.getBoundingClientRect\(\)[\s\S]*return \{/)
  })
})
