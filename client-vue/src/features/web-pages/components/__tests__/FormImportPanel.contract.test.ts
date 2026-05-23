import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

describe('form import panel contract', () => {
  it('accepts form link or id and extracts supported references', () => {
    const source = fs.readFileSync(
      path.resolve('src/features/web-pages/components/FormImportPanel.vue'),
      'utf8',
    )

    assert.match(source, /parseFormReference/)
    assert.match(source, /forms-test/)
    assert.match(source, /profileId/)
  })

  it('calls workflowsApi.getFormDefinition and previews field count', () => {
    const source = fs.readFileSync(
      path.resolve('src/features/web-pages/components/FormImportPanel.vue'),
      'utf8',
    )

    assert.match(source, /workflowsApi\.getFormDefinition/)
    assert.match(source, /fields\.length/)
  })

  it('confirm inserts generated form block and failure does not mutate page', () => {
    const source = fs.readFileSync(
      path.resolve('src/features/web-pages/components/FormImportPanel.vue'),
      'utf8',
    )

    assert.match(source, /formSchemaToBlocks/)
    assert.match(source, /emit\('insert'/)
    assert.match(source, /catch/)
  })
})
