import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

const componentDir = path.resolve('src/features/plugin-creator/components')
const pagePath = path.resolve('src/app/pages/PluginCreatorPage.vue')

describe('PluginCreator execution panels contract', () => {
  it('mounts the bottom execution panel on the plugin creator page', () => {
    const source = fs.readFileSync(pagePath, 'utf8')

    assert.match(source, /PluginCreatorExecutionBottomPanel/)
    assert.match(source, /executionStore\.timeline/)
  })

  it('node output panel shows selected node output and error', () => {
    const source = fs.readFileSync(path.join(componentDir, 'PluginCreatorNodeOutputPanel.vue'), 'utf8')

    assert.match(source, /selectedNodeId/)
    assert.match(source, /nodeStatuses\[props\.selectedNodeId\]/)
    assert.match(source, /JSON\.stringify\(selectedState\?\.output/)
    assert.match(source, /selectedState\?\.error/)
  })

  it('run method panel handles params and credentials', () => {
    const source = fs.readFileSync(path.join(componentDir, 'PluginCreatorRunMethodPanel.vue'), 'utf8')

    assert.match(source, /params/)
    assert.match(source, /credentials/)
    assert.match(source, /test-method/)
  })

  it('clear execution action resets the plugin creator execution store', () => {
    const pageSource = fs.readFileSync(pagePath, 'utf8')
    const panelSource = fs.readFileSync(
      path.join(componentDir, 'PluginCreatorExecutionBottomPanel.vue'),
      'utf8',
    )

    assert.match(pageSource, /executionStore\.clearExecution\(\)/)
    assert.match(panelSource, /clear-execution/)
  })

  it('wires last test trace into the execution store', () => {
    const source = fs.readFileSync(pagePath, 'utf8')

    assert.match(source, /result\?\.trace/)
    assert.match(source, /executionStore\.applyTrace\(result\.trace\)/)
  })
})
