import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))
const startGuideDir = resolve(currentDir, '..')
const appPath = resolve(currentDir, '../../../app/App.vue')

function read(relativePath: string): string {
  return readFileSync(resolve(startGuideDir, relativePath), 'utf8')
}

describe('start guide controller contract', () => {
  it('exposes a small public composable API', () => {
    const source = read('useStartGuide.ts')

    assert.match(source, /openIfNeeded/)
    assert.match(source, /open/)
    assert.match(source, /skip/)
    assert.match(source, /complete/)
    assert.match(source, /reset/)
  })

  it('uses registry ids and current profile local progress for auto-open', () => {
    const source = read('useStartGuide.ts')

    assert.match(source, /startGuideRegistry/)
    assert.match(source, /useProfileStore/)
    assert.match(source, /currentProfile\?\.id/)
    assert.match(source, /hasCompletedStartGuide/)
  })

  it('keeps manual open separate from openIfNeeded', () => {
    const source = read('useStartGuide.ts')

    assert.match(source, /function openIfNeeded/)
    assert.match(source, /function open\(/)
    assert.doesNotMatch(source, /function open\([^)]*\)[\s\S]{0,240}hasCompletedStartGuide/)
  })

  it('renders a global StartGuideHost and supports preview media branches', () => {
    const app = readFileSync(appPath, 'utf8')
    const guide = read('StartGuide.vue')
    const host = read('StartGuideHost.vue')
    const types = read('startGuide.types.ts')

    assert.match(app, /StartGuideHost/)
    assert.match(host, /Teleport/)
    assert.match(guide, /preview\?\.type === 'image'/)
    assert.match(guide, /preview\?\.type === 'gif'/)
    assert.match(guide, /preview\?\.type === 'video'/)
    assert.match(types, /type: 'component'/)
    assert.match(guide, /preview\?\.type === 'component'/)
    assert.match(guide, /previewComponent/)
    assert.match(guide, /startGuide\.skip/)
    assert.match(guide, /startGuide\.complete/)
  })

  it('keeps rich preview components behind a typed component registry', () => {
    const registry = read('startGuide.registry.ts')
    const previewRegistry = read('startGuidePreviewComponents.ts')

    assert.match(previewRegistry, /startGuidePreviewComponents/)
    assert.match(previewRegistry, /UtilityNodesGuidePreview/)
    assert.match(registry, /type: 'component'/)
    assert.match(registry, /component: 'utility-nodes'/)
    assert.doesNotMatch(registry, /UtilityNodesGuidePreview/)
  })

  it('allows the user to change tutorial language from the modal', () => {
    const store = read('startGuideController.store.ts')
    const guide = read('StartGuide.vue')

    assert.match(store, /function setLang\(lang: StartGuideLang\)/)
    assert.match(store, /setLang/)
    assert.match(guide, /languageOptions/)
    assert.match(guide, /controller\.setLang/)
    assert.match(guide, /v-for="option in languageOptions"/)
    assert.match(guide, /start-guide__language-option/)
    assert.match(guide, /'en'/)
    assert.match(guide, /'pt'/)
    assert.match(guide, /'es'/)
    assert.doesNotMatch(guide, /BaseDropdownSelect/)
  })

  it('uses a larger modal layout with more breathing room', () => {
    const guide = read('StartGuide.vue')

    assert.match(guide, /width: min\(860px/)
    assert.match(guide, /height: 360px/)
    assert.match(guide, /padding: var\(--sailor-space-6\)/)
  })

  it('renders utility node previews with real icons and explicit colors', () => {
    const preview = read('previews/UtilityNodesGuidePreview.vue')

    assert.match(preview, /workflowNodesApi/)
    assert.match(preview, /loadWorkflowNodeCatalog/)
    assert.match(preview, /LucideIcon/)
    assert.match(preview, /node\.style\.icon/)
    assert.match(preview, /node\.style\.iconColor/)
    assert.match(preview, /node\.style\.bgColor/)
    assert.match(preview, /node\.style\.borderColor/)
    assert.doesNotMatch(preview, /utility-nodes-guide__dot/)
    assert.doesNotMatch(preview, /const utilityNodes: UtilityNodeGuideItem\[\]/)
  })
})
