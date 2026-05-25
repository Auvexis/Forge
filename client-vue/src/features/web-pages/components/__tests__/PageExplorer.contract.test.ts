import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

function read(relativePath: string) {
  return fs.readFileSync(path.resolve(relativePath), 'utf8')
}

describe('page explorer contract', () => {
  it('left panel is renamed Explorer and renders Tree and Code tabs', () => {
    const editor = read('src/features/web-pages/components/PageEditor.vue')
    const explorer = read('src/features/web-pages/components/PageExplorerPanel.vue')

    assert.match(editor, /title="Explorer"/)
    assert.match(editor, /<PageExplorerPanel/)
    assert.match(explorer, /Tree/)
    assert.match(explorer, /Code/)
    assert.match(explorer, /BlockTreePanel/)
    assert.match(explorer, /SiteFilesPanel/)
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

    assert.match(editor, /addEventListener\('keydown', handleKeyboardSave\)/)
    assert.match(editor, /removeEventListener\('keydown', handleKeyboardSave\)/)
    assert.match(editor, /event\.preventDefault\(\)/)
    assert.match(editor, /event\.ctrlKey/)
    assert.match(editor, /event\.metaKey/)
    assert.match(editor, /activeCodeFile/)
    assert.match(editor, /sitesStore\.saveActiveSite\(\)/)
    assert.match(editor, /savePage\(\)/)
  })
})
