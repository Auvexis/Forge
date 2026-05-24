import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

function read(relativePath: string) {
  return fs.readFileSync(path.resolve(relativePath), 'utf8')
}

describe('page floating add toolbar contract', () => {
  it('renders draggable element tools without click add behavior', () => {
    const source = read('src/features/web-pages/components/PageFloatingAddToolbar.vue')

    assert.match(source, /draggable="true"/)
    assert.match(source, /onDragStart/)
    assert.match(source, /application\/x-sailor-page-block/)
    assert.doesNotMatch(source, /@click="\$emit\('add'/)
  })

  it('is mounted in the editor and old inspector library is removed', () => {
    const editor = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(editor, /PageFloatingAddToolbar/)
    assert.doesNotMatch(editor, /<BlockLibrary/)
  })
})
