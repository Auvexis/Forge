import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const expressionInputSource = readFileSync(
  fileURLToPath(new URL('../expressions/ExpressionInput.vue', import.meta.url)),
  'utf8',
)

const expressionTextareaSource = readFileSync(
  fileURLToPath(new URL('../expressions/ExpressionTextarea.vue', import.meta.url)),
  'utf8',
)

const triggerEditorSource = readFileSync(
  fileURLToPath(new URL('../editors/TriggerEditor.vue', import.meta.url)),
  'utf8',
)

const pickerPositionSource = readFileSync(
  fileURLToPath(new URL('../expressions/useVariablePickerPosition.ts', import.meta.url)),
  'utf8',
)

describe('variable picker positioning', () => {
  it('uses BaseSelect-style viewport-aware fixed positioning', () => {
    assert.match(pickerPositionSource, /spaceBelow/)
    assert.match(pickerPositionSource, /spaceAbove/)
    assert.match(pickerPositionSource, /openUp/)
    assert.match(pickerPositionSource, /position: 'fixed'/)
    assert.match(pickerPositionSource, /desiredLeft/)
    assert.match(pickerPositionSource, /rect\.right - pickerWidth/)
    assert.match(pickerPositionSource, /window\.innerHeight/)
  })

  it('teleports variable pickers and binds computed position styles', () => {
    for (const source of [expressionInputSource, expressionTextareaSource, triggerEditorSource]) {
      assert.match(source, /useVariablePickerPosition/)
      assert.match(source, /<Teleport to="body">/)
      assert.match(source, /:style="pickerStyle"/)
    }
  })

  it('closes teleported pickers from captured outside pointer events', () => {
    for (const source of [expressionInputSource, expressionTextareaSource, triggerEditorSource]) {
      assert.match(source, /document\.addEventListener\('pointerdown', [^,\n]+, true\)/)
      assert.match(source, /document\.removeEventListener\('pointerdown', [^,\n]+, true\)/)
    }
  })
})
