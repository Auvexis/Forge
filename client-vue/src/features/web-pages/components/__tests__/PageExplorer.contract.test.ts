import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

function read(relativePath: string) {
  return fs.readFileSync(path.resolve(relativePath), 'utf8')
}

describe('page explorer contract', () => {
  it('left panel is renamed Explorer and renders ToolBox, Tree, Assets and Code tabs', () => {
    const editor = read('src/features/web-pages/components/PageEditor.vue')
    const explorer = read('src/features/web-pages/components/PageExplorerPanel.vue')

    assert.match(editor, /title="Explorer"/)
    assert.match(editor, /<PageExplorerPanel/)
    assert.match(explorer, /ToolBox/)
    assert.match(explorer, /Tree/)
    assert.match(explorer, /Assets/)
    assert.match(explorer, /Code/)
    assert.match(explorer, /PageToolboxPanel/)
    assert.match(explorer, /BlockTreePanel/)
    assert.match(explorer, /SiteAssetsPanel/)
    assert.match(explorer, /SiteFilesPanel/)
  })

  it('toolbox exposes grouped html element presets with lucide icons and drag payloads', () => {
    const toolbox = read('src/features/web-pages/components/PageToolboxPanel.vue')
    const css = read('src/features/web-pages/pages.css')

    assert.match(toolbox, /LucideIcon/)
    assert.match(toolbox, /Search elements/)
    for (const section of ['Recently used', 'Text', 'Structure', 'Form', 'Media', 'Interactive']) {
      assert.match(toolbox, new RegExp(section))
    }
    for (const label of ['Text Input', 'Heading', 'Paragraph', 'Rich Text', 'Section', 'Container', 'Quick Stack', 'V Flex', 'H Flex', 'Grid', 'Image', 'Video', 'Youtube', 'Audio', 'Button', 'Link']) {
      assert.match(toolbox, new RegExp(label))
    }
    assert.doesNotMatch(toolbox, /Calendar/)
    assert.doesNotMatch(toolbox, /Diagram/)
    assert.doesNotMatch(toolbox, /List Items/)
    assert.match(toolbox, /application\/x-sailor-page-block/)
    assert.match(toolbox, /preset: item\.id/)
    assert.match(toolbox, /setDragImage/)
    assert.match(css, /web-page-toolbox/)
    assert.match(css, /web-page-toolbox__item-icon/)
    assert.match(css, /var\(--sailor-bg-surface\)/)
    assert.match(css, /var\(--sailor-border\)/)
  })

  it('toolbox presets are preserved when blocks are dropped into the editor', () => {
    const editor = read('src/features/web-pages/components/PageEditor.vue')
    const canvas = read('src/features/web-pages/components/PageCanvas.vue')
    const renderer = read('src/features/web-pages/components/BlockRenderer.vue')
    const create = read('src/features/web-pages/utils/createBlock.ts')

    assert.match(editor, /createBlock\(payload\.tag,\s*undefined,\s*payload\.preset\)/)
    assert.match(canvas, /preset\?: string/)
    assert.match(renderer, /preset\?: string/)
    assert.match(create, /createBlock\(tag: PageBlockTag,\s*id\?: string,\s*preset\?: string\)/)
    assert.match(create, /id: id \?\? createBlockId\(tag,\s*preset\)/)
    assert.match(create, /if \(preset === 'heading'\)/)
    assert.match(create, /if \(preset === 'email-input'\)/)
    assert.match(create, /if \(preset === 'media-image'\)/)
  })

  it('toolbox builds Recently used from the last 6 used items', () => {
    const toolbox = read('src/features/web-pages/components/PageToolboxPanel.vue')

    assert.match(toolbox, /RECENT_ITEMS_LIMIT = 6/)
    assert.match(toolbox, /RECENT_ITEMS_STORAGE_KEY/)
    assert.match(toolbox, /recentItemIds/)
    assert.match(toolbox, /rememberItem\(item\)/)
    assert.match(toolbox, /loadRecentItems/)
    assert.match(toolbox, /id: 'recent'[\s\S]*items: recentItemIds\.value/)
    assert.doesNotMatch(toolbox, /id: 'recent'[\s\S]{0,160}items:\s*\[[\s\S]{0,160}\{ id: 'page'/)
  })

  it('toolbox keeps common presets in existing non-recent sections', () => {
    const toolbox = read('src/features/web-pages/components/PageToolboxPanel.vue')

    assert.match(toolbox, /id: 'text'[\s\S]*\{ id: 'heading', label: 'Heading'/)
    assert.match(toolbox, /id: 'structure'[\s\S]*\{ id: 'page', label: 'Page'/)
    assert.match(toolbox, /id: 'form'[\s\S]*\{ id: 'text-input', label: 'Text Input'/)
    assert.match(toolbox, /id: 'media'[\s\S]*\{ id: 'media-image', label: 'Image'/)
    assert.match(toolbox, /id: 'media'[\s\S]*\{ id: 'video', label: 'Video'[\s\S]*tag: 'video'/)
    assert.match(toolbox, /id: 'media'[\s\S]*\{ id: 'youtube', label: 'Youtube'[\s\S]*tag: 'youtube'/)
    assert.match(toolbox, /id: 'media'[\s\S]*\{ id: 'audio', label: 'Audio'[\s\S]*tag: 'audio'/)
    assert.match(toolbox, /id: 'interactive'[\s\S]*\{ id: 'button', label: 'Button'/)
  })

  it('toolbox exposes Page with click and dedicated page drag behavior', () => {
    const toolbox = read('src/features/web-pages/components/PageToolboxPanel.vue')
    const explorer = read('src/features/web-pages/components/PageExplorerPanel.vue')
    const editor = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(toolbox, /label: 'Page'/)
    assert.match(toolbox, /application\/x-sailor-page/)
    assert.match(toolbox, /emit\('add-page'\)/)
    assert.match(explorer, /@add-page="\$emit\('add-page'\)"/)
    assert.match(editor, /@add-page="addPageAtEnd"/)
    assert.match(editor, /pageDropIndex/)
    assert.match(editor, /createPageAt/)
  })

  it('captures Page drops before nested block drop handlers stop propagation', () => {
    const editor = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(editor, /@dragover\.capture="handlePageDragOver"/)
    assert.match(editor, /@drop\.capture="handlePageDrop"/)
    assert.match(editor, /closestPageDropIndex/)
  })

  it('code tab opens site files on the canvas with BaseCodeEditor', () => {
    const editor = read('src/features/web-pages/components/PageEditor.vue')
    const files = read('src/features/web-pages/components/SiteFilesPanel.vue')
    const codeCanvas = read('src/features/web-pages/components/SiteCodeCanvas.vue')

    assert.match(files, /css\/site\.css/)
    assert.match(files, /js\/site\.js/)
    assert.match(files, /pages\//)
    assert.match(files, /assets\//)
    assert.match(files, /open-file/)
    assert.match(editor, /activeCodeFile/)
    assert.match(editor, /<SiteCodeCanvas/)
    assert.match(codeCanvas, /BaseCodeEditor/)
    assert.match(codeCanvas, /readonly/)
    assert.match(codeCanvas, /image preview/i)
  })

  it('explorer content stays compact under tabs and code tree has hierarchy affordances', () => {
    const explorer = read('src/features/web-pages/components/PageExplorerPanel.vue')
    const files = read('src/features/web-pages/components/SiteFilesPanel.vue')
    const css = read('src/features/web-pages/pages.css')

    assert.match(css, /web-page-explorer[\s\S]*grid-template-rows:\s*auto minmax\(0,\s*auto\)/)
    assert.match(explorer, /web-page-explorer__content/)
    assert.match(files, /LucideIcon/)
    assert.match(files, /folderIcon/)
    assert.match(files, /fileIcon/)
    assert.match(files, /web-page-site-files__children/)
    assert.match(files, /web-page-site-files__guide/)
    assert.match(files, /expandedFolders/)
    assert.match(files, /toggleFolder/)
    assert.match(css, /web-page-site-files__guide/)
    assert.match(css, /web-page-site-files__icon/)
  })

  it('code explorer exposes create file, create folder and upload image actions', () => {
    const explorer = read('src/features/web-pages/components/PageExplorerPanel.vue')
    const editor = read('src/features/web-pages/components/PageEditor.vue')
    const files = read('src/features/web-pages/components/SiteFilesPanel.vue')

    assert.match(files, /create-file/)
    assert.match(files, /create-folder/)
    assert.match(files, /upload-asset/)
    assert.match(files, /delete-file/)
    assert.match(files, /type="file"/)
    assert.match(explorer, /@create-folder/)
    assert.match(explorer, /@upload-asset/)
    assert.match(explorer, /@delete-file/)
    assert.match(editor, /createCodeFolder/)
    assert.match(editor, /uploadSiteAsset/)
    assert.match(editor, /deleteCodeFile/)
  })

  it('assets explorer exposes upload, thumbnails, paths and delete actions', () => {
    const explorer = read('src/features/web-pages/components/PageExplorerPanel.vue')
    const assets = read('src/features/web-pages/components/SiteAssetsPanel.vue')
    const css = read('src/features/web-pages/pages.css')

    assert.match(explorer, /activeTab === 'assets'/)
    assert.match(assets, /web-page-assets-panel/)
    assert.match(assets, /assetFiles/)
    assert.match(assets, /thumbnailUrl/)
    assert.match(assets, /formatAssetSize/)
    assert.match(assets, /upload-asset/)
    assert.match(assets, /delete-file/)
    assert.match(css, /web-page-assets-panel/)
    assert.match(css, /web-page-assets-panel__grid/)
  })

  it('assets can be dragged, dropped for upload, and show upload progress previews', () => {
    const assets = read('src/features/web-pages/components/SiteAssetsPanel.vue')
    const css = read('src/features/web-pages/pages.css')

    assert.match(assets, /draggable="true"/)
    assert.match(assets, /application\/x-sailor-page-asset/)
    assert.match(assets, /text\/plain/)
    assert.match(assets, /setDragImage/)
    assert.match(assets, /@dragover\.prevent/)
    assert.match(assets, /@drop\.prevent="dropUploadAssets"/)
    assert.match(assets, /uploadingAssets/)
    assert.match(assets, /web-page-assets-panel__upload-preview/)
    assert.match(assets, /accept="image\/\*,font\/\*,\.ttf,\.otf,\.woff,\.woff2"/)
    assert.match(css, /web-page-assets-panel__upload-preview/)
    assert.match(css, /web-page-assets-panel__loading-bar/)
  })

  it('code explorer exposes a delete button for deletable files', () => {
    const files = read('src/features/web-pages/components/SiteFilesPanel.vue')
    const css = read('src/features/web-pages/pages.css')

    assert.match(files, /web-page-site-files__file-actions/)
    assert.match(files, /canDeleteFile/)
    assert.match(files, /emit\('delete-file', node\.path\)/)
    assert.match(files, /name="trash-2"/)
    assert.match(css, /web-page-site-files__file-actions/)
    assert.match(css, /web-page-site-files__item--file:hover[\s\S]*web-page-site-files__file-actions/)
  })

  it('code explorer uses BaseModal for file and folder creation instead of window prompt', () => {
    const files = read('src/features/web-pages/components/SiteFilesPanel.vue')

    assert.match(files, /BaseModal/)
    assert.match(files, /BaseInput/)
    assert.match(files, /creationDialog/)
    assert.match(files, /submitCreationDialog/)
    assert.doesNotMatch(files, /window\.prompt/)
  })

  it('folder rows reveal scoped create and upload actions on hover', () => {
    const files = read('src/features/web-pages/components/SiteFilesPanel.vue')
    const css = read('src/features/web-pages/pages.css')

    assert.match(files, /web-page-site-files__folder-actions/)
    assert.match(files, /openCreationDialog\('file', node\.path\)/)
    assert.match(files, /openCreationDialog\('folder', node\.path\)/)
    assert.match(files, /uploadAssetFromFolder/)
    assert.match(css, /web-page-site-files__folder-actions/)
    assert.match(css, /web-page-site-files__item--folder:hover[\s\S]*web-page-site-files__folder-actions/)
  })

  it('code explorer only renders guide lines for nested files and folders', () => {
    const files = read('src/features/web-pages/components/SiteFilesPanel.vue')
    const css = read('src/features/web-pages/pages.css')

    assert.match(files, /v-if="node\.depth > 0"/)
    assert.match(files, /web-page-site-files__item--root/)
    assert.match(css, /web-page-site-files__item--root[\s\S]*web-page-site-files__guide[\s\S]*display:\s*none/)
  })

  it('code canvas can be closed with a BaseButton x icon', () => {
    const editor = read('src/features/web-pages/components/PageEditor.vue')
    const codeCanvas = read('src/features/web-pages/components/SiteCodeCanvas.vue')

    assert.match(codeCanvas, /BaseButton/)
    assert.match(codeCanvas, /icon-left="x"/)
    assert.match(codeCanvas, /@pointerdown\.stop/)
    assert.match(codeCanvas, /@click\.stop="\$emit\('close'\)"/)
    assert.match(editor, /@close="closeCodeCanvas"/)
    assert.match(editor, /function closeCodeCanvas\(\)[\s\S]*activeCodeFile\.value = null/)
  })

  it('deleting the active code file closes the code canvas', () => {
    const editor = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(editor, /function deleteCodeFile/)
    assert.match(editor, /sitesStore\.deleteFile\(path\)/)
    assert.match(editor, /activeCodeFile\.value\?\.path === path/)
    assert.match(editor, /closeCodeCanvas\(\)/)
  })

  it('code canvas enters and leaves with a quick transition', () => {
    const editor = read('src/features/web-pages/components/PageEditor.vue')
    const css = read('src/features/web-pages/pages.css')

    assert.match(editor, /<Transition name="web-page-code-editor"/)
    assert.match(css, /web-page-code-editor-enter-active/)
    assert.match(css, /web-page-code-editor-leave-active/)
  })

  it('Ctrl+S and Meta+S save the active page or active site file', () => {
    const editor = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(editor, /addEventListener\('keydown', handleKeyboardShortcuts\)/)
    assert.match(editor, /removeEventListener\('keydown', handleKeyboardShortcuts\)/)
    assert.match(editor, /event\.preventDefault\(\)/)
    assert.match(editor, /event\.ctrlKey/)
    assert.match(editor, /event\.metaKey/)
    assert.match(editor, /activeCodeFile/)
    assert.match(editor, /sitesStore\.saveActiveSite\(\)/)
    assert.match(editor, /savePage\(\)/)
  })
})
