import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it } from 'node:test'

const root = process.cwd()

function read(relativePath: string) {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

describe('app route frame contract', () => {
  it('wraps routed pages in a stable flex frame keyed by route section', () => {
    const source = read('src/app/App.vue')

    assert.match(source, /<router-view v-slot="\{ Component \}">/)
    assert.match(source, /<transition name="fade" mode="out-in">/)
    assert.match(source, /<div :key="routeSectionKey" class="app-route-frame">/)
    assert.match(source, /<component :is="Component" \/>/)
    assert.match(source, /const routeSectionKey = computed\(\(\) => route\.path\.split\('\/'\)\.filter\(Boolean\)\[0\] \?\? 'home'\)/)
    assert.doesNotMatch(source, /:key="route\.fullPath"/)
    assert.match(source, /\.app-route-frame\s*\{[\s\S]*display: flex;/)
    assert.match(source, /\.app-route-frame\s*\{[\s\S]*flex: 1;/)
    assert.match(source, /\.app-route-frame\s*\{[\s\S]*min-height: 0;/)
  })
})
