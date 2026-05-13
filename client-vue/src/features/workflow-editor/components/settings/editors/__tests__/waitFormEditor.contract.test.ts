import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const currentDir = dirname(fileURLToPath(import.meta.url))
const editorSource = readFileSync(resolve(currentDir, '../WaitFormEditor.vue'), 'utf8')

describe('wait form editor contract', () => {
  it('shows description and the form URL section users expect from form trigger', () => {
    assert.match(editorSource, /EditorField label="Description"/)
    assert.match(editorSource, /Form URLs/)
    assert.match(editorSource, /formTestUrl/)
    assert.match(editorSource, /formProdUrl/)
  })

  it('uses variable-aware inputs for public slug and expiration', () => {
    assert.match(editorSource, /BaseVariableInput/)
    assert.match(
      editorSource,
      /EditorField label="Public URL Slug"[\s\S]*?<BaseVariableInput[\s\S]*?publicSlug/,
    )
    assert.match(
      editorSource,
      /EditorField label="Expiration \(seconds\)"[\s\S]*?<BaseVariableInput[\s\S]*?expiresInSeconds/,
    )
  })
})
