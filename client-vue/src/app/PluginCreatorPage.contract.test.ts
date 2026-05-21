import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

const pagePath = path.resolve('src/app/pages/PluginCreatorPage.vue')

describe('PluginCreatorPage contract', () => {
  it('initializes a usable draft workspace when the route opens', () => {
    const source = fs.readFileSync(pagePath, 'utf8')

    assert.match(source, /useRoute/)
    assert.match(source, /onMounted/)
    assert.match(source, /loadInitialBlueprint/)
    assert.match(source, /includeDefaultMethod:\s*true/)
  })

  it('wires header and floating toolbar lifecycle actions to the store', () => {
    const source = fs.readFileSync(pagePath, 'utf8')

    assert.match(source, /@run="runSelectedMethod"/)
    assert.match(source, /@save="saveDraft"/)
    assert.match(source, /@publish="publishActiveBlueprint"/)
    assert.match(source, /@tool-change="setCanvasTool"/)
    assert.match(source, /@add-item="openAddBlocksPanel"/)
    assert.match(source, /@delete-selected="deleteSelectedNodes"/)
    assert.match(source, /@connect-nodes="connectNodes"/)
    assert.match(source, /@open-node-settings="openNodeSettingsModal"/)
    assert.match(source, /@undo="store\.undo"/)
    assert.match(source, /@redo="store\.redo"/)
    assert.match(source, /:is-dirty="store\.isDirty"/)
    assert.match(source, /:is-saving="store\.isSaving"/)
  })

  it('uses the shared app page and app panel instead of a local add sidebar', () => {
    const source = fs.readFileSync(pagePath, 'utf8')

    assert.match(source, /AppPage/)
    assert.match(source, /useAppPanelStore/)
    assert.match(source, /openAddBlocksPanel/)
    assert.match(source, /PluginCreatorAddItemPanel/)
    assert.doesNotMatch(source, /:open="isAddPanelOpen"/)
    assert.doesNotMatch(source, /plugin-creator-page__side/)
  })

  it('moves metadata, testing and versions into a base modal workspace', () => {
    const source = fs.readFileSync(pagePath, 'utf8')

    assert.match(source, /PluginCreatorWorkspaceModal/)
    assert.match(source, /PluginCreatorNodeSettingsModal/)
    assert.match(source, /useEventBus/)
    assert.match(source, /@settings="openWorkspaceModal\('metadata'\)"/)
    assert.match(source, /@versions="openWorkspaceModal\('versions'\)"/)
  })

  it('uses the canvas center when adding new plugin creator blocks', () => {
    const source = fs.readFileSync(pagePath, 'utf8')

    assert.match(source, /centerPosition/)
    assert.match(source, /canvasRef\.value\?\.centerPosition/)
    assert.match(source, /fitCanvasSoon/)
  })
})
