import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

function read(relativePath: string) {
  return fs.readFileSync(path.resolve(relativePath), 'utf8')
}

describe('block library contract', () => {
  it('block library exposes MVP blocks only', () => {
    const source = read('src/features/web-pages/components/BlockLibrary.vue')
    for (const tag of ['header', 'section', 'div', 'footer', 'form', 'button', 'input', 'text', 'image', 'link']) {
      assert.match(source, new RegExp(`'${tag}'`))
    }
    assert.doesNotMatch(source, /absolute|x:|y:/)
  })

  it('blocks support direct drag-and-drop placement', () => {
    const source = read('src/features/web-pages/components/BlockRenderer.vue')

    assert.match(source, /:draggable="!readonly && activeTool === 'cursor'"/)
    assert.match(source, /@dragstart/)
    assert.match(source, /@drop/)
    assert.match(source, /before/)
    assert.match(source, /inside/)
    assert.match(source, /after/)
  })

  it('drop inside is only available for container blocks', () => {
    const source = read('src/features/web-pages/components/BlockRenderer.vue')

    assert.match(source, /isContainer/)
    assert.match(source, /inside/)
  })
})
