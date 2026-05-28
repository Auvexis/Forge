import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

const pagePath = path.resolve('src/app/pages/PluginCreatorPage.vue')

describe('PluginCreatorPage contract', () => {
  it('initializes a usable local draft workspace when the route opens empty', () => {
    const source = fs.readFileSync(pagePath, 'utf8')

    assert.match(source, /useRoute/)
    assert.match(source, /onMounted/)
    assert.match(source, /loadInitialBlueprint/)
    assert.match(source, /store\.createLocalDraft\(\)/)
    const loadInitialBody = functionBody(source, 'loadInitialBlueprint')
    assert.doesNotMatch(loadInitialBody, /store\.createBlueprint\(/)
  })

  it('wires header and floating toolbar lifecycle actions to the store', () => {
    const source = fs.readFileSync(pagePath, 'utf8')

    assert.match(source, /@run="runSelectedMethod"/)
    assert.match(source, /@save="saveDraft"/)
    assert.match(source, /@publish="publishActiveBlueprint"/)
    assert.match(source, /@tool-change="setCanvasTool"/)
    assert.match(source, /@add-item="openAddBlocksPanel"/)
    assert.match(source, /@add-first-node="openAddBlocksPanel"/)
    assert.match(source, /@delete-selected="deleteSelectedNodes"/)
    assert.match(source, /@connect-nodes="connectNodes"/)
    assert.match(source, /@open-node-settings="openNodeSettingsModal"/)
    assert.match(source, /@undo="store\.undo"/)
    assert.match(source, /@redo="store\.redo"/)
    assert.match(source, /:is-dirty="store\.isDirty"/)
    assert.match(source, /:is-saving="store\.isSaving"/)
  })

  it('wires plugin menu workflows for switching, creation, export and draft discard', () => {
    const source = fs.readFileSync(pagePath, 'utf8')

    assert.match(source, /:active-blueprint="store\.activeBlueprint"/)
    assert.match(source, /:blueprints="store\.blueprints"/)
    assert.match(source, /:versions="store\.versions"/)
    assert.match(source, /@new-plugin="createNewPlugin"/)
    assert.match(source, /@open-plugin="openPluginBlueprint"/)
    assert.match(source, /@rollback="rollbackToReleaseSnapshot"/)
    assert.match(source, /@export-zip="exportActivePluginZip"/)
    assert.match(source, /@discard-draft="discardDraft"/)
    assert.match(source, /store\.exportZip/)
    assert.match(source, /URL\.createObjectURL/)
    assert.match(source, /router\.replace/)
  })

  it('uses a BaseModal creation flow instead of prompt for new plugins', () => {
    const source = fs.readFileSync(pagePath, 'utf8')
    const modal = fs.readFileSync(
      path.resolve('src/features/plugin-creator/components/PluginCreatorCreatePluginModal.vue'),
      'utf8',
    )

    assert.match(source, /PluginCreatorCreatePluginModal/)
    assert.match(source, /isCreatePluginModalOpen/)
    assert.match(source, /isCreatePluginFirstSave/)
    assert.match(source, /store\.isNewBlueprint/)
    assert.match(source, /store\.saveNewBlueprint/)
    assert.doesNotMatch(source, /window\.prompt/)
    assert.doesNotMatch(modal, /includeDefaultMethod:\s*true/)
    assert.match(modal, /includeDefaultMethod:\s*false/)
    assert.match(modal, /BaseModal/)
    for (const field of ['icon', 'iconDark', 'iconLight', 'handle', 'name', 'description']) {
      assert.match(modal, new RegExp(field))
    }
    assert.match(modal, /plugin-creator-icon-preview/)
    assert.match(modal, /type="url"/)
  })

  it('uses AppConfirmPanel via useConfirm instead of native plugin creator alerts', () => {
    const source = fs.readFileSync(pagePath, 'utf8')

    assert.match(source, /useConfirm/)
    assert.match(source, /const \{ confirm \} = useConfirm\(\)/)
    assert.match(source, /async function confirmUnsavedChanges/)
    assert.match(source, /await confirm\(/)
    assert.match(source, /Unsaved changes/)
    assert.match(source, /Discard changes/)
    assert.doesNotMatch(source, /window\.confirm/)
    assert.doesNotMatch(source, /\bconfirm\('/)
    assert.doesNotMatch(source, /\balert\(/)
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

  it('uses the canvas center for new blocks without auto-fitting after every add', () => {
    const source = fs.readFileSync(pagePath, 'utf8')
    const addBlockBody = functionBody(source, 'addPluginCreatorBlock')

    assert.match(source, /centerPosition/)
    assert.match(source, /canvasRef\.value\?\.centerPosition/)
    assert.doesNotMatch(addBlockBody, /fitCanvasSoon\(\)/)
  })

  it('closes the add block panel after adding a plugin creator block', () => {
    const source = fs.readFileSync(pagePath, 'utf8')

    assert.match(source, /closeAddBlocksPanel/)
    assert.match(source, /function addPluginCreatorBlock[\s\S]*closeAddBlocksPanel\(\)/)
  })
})

function functionBody(source: string, functionName: string) {
  const start = source.indexOf(`function ${functionName}`)
  assert.notEqual(start, -1)
  const nextRegularFunction = source.indexOf('\nfunction ', start + 1)
  const nextAsyncFunction = source.indexOf('\nasync function ', start + 1)
  const nextFunction = [nextRegularFunction, nextAsyncFunction]
    .filter((index) => index !== -1)
    .sort((left, right) => left - right)[0]
  return source.slice(start, nextFunction === -1 ? source.length : nextFunction)
}
