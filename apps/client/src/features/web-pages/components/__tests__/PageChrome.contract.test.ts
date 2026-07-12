import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

function read(relativePath: string) {
  return fs.readFileSync(path.resolve(relativePath), 'utf8')
}

describe('page chrome contract', () => {
  it('pages editor keeps the app shell topbar available when opening Fabric Pages', () => {
    const source = read('src/app/pages/PagesEditorPage.vue')

    assert.doesNotMatch(source, /useAppUiStore/)
    assert.doesNotMatch(source, /enterUniverseMode/)
    assert.doesNotMatch(source, /quitUniverseMode/)
    assert.match(source, /<PageEditor/)
    assert.doesNotMatch(source, /<PagesList/)
    assert.doesNotMatch(source, /route\.params\.pageId/)
  })

  it('page chrome exposes topbar File Edit View menus', () => {
    const source = read('src/features/web-pages/components/PageChromeToolbar.vue')

    assert.match(source, /Teleport to="#fabric-topbar-left"/)
    assert.match(source, /go\.home/)
    assert.doesNotMatch(source, /Back to Home/)
    assert.match(source, /File/)
    assert.match(source, /Edit/)
    assert.match(source, /View/)
    assert.match(source, /file\.newProject/)
    assert.match(source, /file\.openProject/)
    assert.match(source, /file\.importProject/)
    assert.match(source, /file\.save/)
    assert.match(source, /file\.preview/)
    assert.match(source, /file\.togglePublish/)
    assert.doesNotMatch(source, /file\.publish/)
    assert.doesNotMatch(source, /file\.unpublish/)
    assert.match(source, /file\.openLive/)
    assert.match(source, /file\.exportProject/)
    assert.match(source, /Export project/)
  })

  it('page chrome exposes undo and redo commands', () => {
    const toolbar = read('src/features/web-pages/components/PageChromeToolbar.vue')
    const editor = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(toolbar, /canUndo\?: boolean/)
    assert.match(toolbar, /canRedo\?: boolean/)
    assert.match(toolbar, /edit\.undo/)
    assert.match(toolbar, /edit\.redo/)
    assert.match(toolbar, /Undo/)
    assert.match(toolbar, /Redo/)
    assert.match(toolbar, /undo-2/)
    assert.match(toolbar, /redo-2/)
    assert.match(editor, /:can-undo="editorStore\.canUndo"/)
    assert.match(editor, /:can-redo="editorStore\.canRedo"/)
    assert.match(editor, /editorStore\.undo\(\)/)
    assert.match(editor, /editorStore\.redo\(\)/)
  })

  it('page chrome keeps multiselect state out of the compact toolbar', () => {
    const toolbar = read('src/features/web-pages/components/PageChromeToolbar.vue')
    const editor = read('src/features/web-pages/components/PageEditor.vue')
    const css = read('src/features/web-pages/pages.css')

    assert.doesNotMatch(toolbar, /selectedCount\?: number/)
    assert.doesNotMatch(toolbar, /web-page-chrome__selection-status/)
    assert.doesNotMatch(toolbar, /mouse-pointer-2/)
    assert.doesNotMatch(editor, /:selected-count="editorStore\.selectedBlockIds\.length"/)
    assert.doesNotMatch(css, /\.web-page-chrome__selection-status/)
  })

  it('page editor supports undo and redo keyboard shortcuts', () => {
    const editor = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(editor, /handleKeyboardShortcuts/)
    assert.match(editor, /event\.key\.toLowerCase\(\) === 'z'/)
    assert.match(editor, /event\.key\.toLowerCase\(\) === 'y'/)
    assert.match(editor, /event\.metaKey/)
    assert.match(editor, /event\.ctrlKey/)
    assert.match(editor, /event\.shiftKey/)
    assert.match(editor, /undoPageEdit/)
    assert.match(editor, /redoPageEdit/)
  })

  it('page editor supports Explorer and Inspector hotkeys', () => {
    const editor = read('src/features/web-pages/components/PageEditor.vue')
    const toolbar = read('src/features/web-pages/components/PageChromeToolbar.vue')

    assert.match(toolbar, /Toggle explorer/)
    assert.match(toolbar, /Ctrl B/)
    assert.match(toolbar, /Toggle inspector/)
    assert.match(toolbar, /Ctrl I/)
    assert.match(editor, /toggleLeftPanel/)
    assert.match(editor, /toggleRightPanel/)
    assert.match(editor, /event\.key\.toLowerCase\(\) === 'b'/)
    assert.match(editor, /event\.key\.toLowerCase\(\) === 'i'/)
  })

  it('page chrome advertises cross-platform save shortcut', () => {
    const editor = read('src/features/web-pages/components/PageEditor.vue')
    const toolbar = read('src/features/web-pages/components/PageChromeToolbar.vue')

    assert.match(toolbar, /saveShortcutLabel/)
    assert.match(toolbar, /navigator\.platform/)
    assert.match(toolbar, /Cmd S/)
    assert.match(toolbar, /Ctrl S/)
    assert.match(toolbar, /file\.save[\s\S]*shortcut: saveShortcutLabel\.value/)
    assert.match(editor, /event\.ctrlKey/)
    assert.match(editor, /event\.metaKey/)
    assert.match(editor, /event\.key\.toLowerCase\(\) !== 's'/)
    assert.match(editor, /saveActiveDocument\(\)/)
  })

  it('page editor guards unsaved changes when leaving pages', () => {
    const source = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(source, /hasUnsavedProjectChanges/)
    assert.match(source, /confirmUnsavedProjectLeave/)
    assert.match(source, /Unsaved changes/)
    assert.match(source, /This page project has unsaved changes/)
    assert.match(source, /Save & Leave/)
    assert.match(source, /Discard & Leave/)
    assert.match(source, /beforeunload/)
    assert.match(source, /event\.preventDefault\(\)/)
    assert.match(source, /saveActiveDocument\(\)/)
  })

  it('page chrome switches File Edit View dropdowns on hover after a menu is open', () => {
    const source = read('src/features/web-pages/components/PageChromeToolbar.vue')

    assert.match(source, /menuRefs/)
    assert.match(source, /activeMenuId/)
    assert.match(source, /registerMenuRef/)
    assert.match(source, /openChromeMenu/)
    assert.match(source, /handleMenuMouseEnter/)
    assert.match(source, /@mouseenter="handleMenuMouseEnter\(menu\.id\)"/)
    assert.match(source, /@open="activeMenuId = menu\.id"/)
  })

  it('page chrome has direct save preview and publish ghost buttons', () => {
    const source = read('src/features/web-pages/components/PageChromeToolbar.vue')

    assert.match(source, /BaseButton/)
    assert.match(source, /variant="ghost"/)
    assert.match(source, /Save/)
    assert.match(source, /Preview/)
    assert.match(source, /publishCommandLabel/)
    assert.match(source, /publishCommandIcon/)
    assert.match(source, /file\.togglePublish/)
    assert.match(source, /Open live/)
  })

  it('page chrome keeps page actions with menus and places undo redo after autosave', () => {
    const source = read('src/features/web-pages/components/PageChromeToolbar.vue')
    const actionsMarkup = source.match(/<div class="web-page-chrome__actions">[\s\S]*?<\/div>/)?.[0] ?? ''

    assert.match(source, /v-for="menu in resolvedMenus"/)
    assert.match(actionsMarkup, /file\.save/)
    assert.match(actionsMarkup, /file\.preview/)
    assert.match(actionsMarkup, /file\.togglePublish/)
    assert.match(actionsMarkup, /file\.openLive/)
    assert.match(actionsMarkup, /toggle-autosave/)
    assert.match(actionsMarkup, /edit\.undo/)
    assert.match(actionsMarkup, /edit\.redo/)
    assert.ok(actionsMarkup.indexOf('toggle-autosave') < actionsMarkup.indexOf('edit.undo'))
    assert.ok(actionsMarkup.indexOf('edit.undo') < actionsMarkup.indexOf('edit.redo'))
  })

  it('page chrome keeps save dot states in the compact toolbar', () => {
    const source = read('src/features/web-pages/components/PageChromeToolbar.vue')
    const css = read('src/features/web-pages/pages.css')

    assert.doesNotMatch(source, /saveState/)
    assert.doesNotMatch(source, /saveStatusIcon/)
    assert.doesNotMatch(source, /cloud-check/)
    assert.doesNotMatch(source, /cloud-alert/)
    assert.doesNotMatch(source, /loader-circle/)
    assert.doesNotMatch(source, /web-page-chrome__save-status/)
    assert.match(source, /web-page-chrome__save-dot/)
    assert.match(source, /web-page-chrome__save-dot--dirty/)
    assert.match(css, /300ms/)
  })

  it('page chrome keeps only primary actions in the local toolbar', () => {
    const source = read('src/features/web-pages/components/PageChromeToolbar.vue')
    const css = read('src/features/web-pages/pages.css')
    const actionsRule = css.match(/\.web-page-chrome__actions\s*{[\s\S]*?}/)?.[0] ?? ''

    assert.match(source, /web-page-chrome__actions/)
    assert.doesNotMatch(source, /web-page-chrome__status/)
    assert.doesNotMatch(source, /NotificationTrigger/)
    assert.doesNotMatch(actionsRule, /margin-left:\s*auto/)
  })

  it('page chrome exposes a Pages autosave switch like Workflow Editor', () => {
    const source = read('src/features/web-pages/components/PageChromeToolbar.vue')
    const editor = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(source, /BaseSwitch/)
    assert.match(source, /web-page-chrome__autosave/)
    assert.match(source, /Autosave/)
    assert.match(source, /isAutosaveEnabled/)
    assert.match(source, /toggle-autosave/)
    assert.match(editor, /schedulePagesAutosave/)
    assert.match(editor, /setPagesAutosaveEnabled/)
    assert.match(editor, /:is-autosave-enabled="isPagesAutosaveEnabled"/)
    assert.match(editor, /@toggle-autosave="setPagesAutosaveEnabled"/)
  })

  it('page badge exposes direct preview and delete buttons', () => {
    const source = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(source, /web-page-editor__page-chip/)
    assert.match(source, /previewCanvasPage/)
    assert.match(source, /title="Preview page"/)
    assert.match(source, /icon-left="eye"/)
    assert.match(source, /deletePageFromBadge/)
    assert.match(source, /icon-left="trash-2"/)
    assert.match(source, /variant="ghost"/)
  })

  it('page editor passes dirty and saving state to chrome and makes both side panels resizable', () => {
    const source = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(source, /:is-dirty="editorStore\.isDirty \|\| pagesStore\.isDirty \|\| sitesStore\.isDirty"/)
    assert.match(source, /:is-saving="pagesStore\.isSaving \|\| sitesStore\.isSaving"/)
    assert.match(source, /resizable/)
    assert.match(source, /resize-side="right"/)
    assert.match(source, /resize-side="left"/)
  })

  it('page editor downloads active site project from the File menu export command', () => {
    const source = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(source, /file\.exportProject/)
    assert.match(source, /exportActiveProject/)
    assert.match(source, /sitesStore\.exportActiveSiteProject\(\)/)
    assert.match(source, /downloadBlobFile/)
    assert.match(source, /\.fabric-site\.zip/)
    assert.doesNotMatch(source, /downloadJsonFile/)
    assert.match(source, /Blob/)
    assert.doesNotMatch(source, /\.fabric\.json/)
  })

  it('open project modal previews first project page and exposes project export and delete actions', () => {
    const source = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(source, /projectPreviews/)
    assert.match(source, /loadProjectPreviews/)
    assert.match(source, /web-page-project-modal__preview/)
    assert.match(source, /previewBlocks/)
    assert.match(source, /BaseButton[\s\S]*icon-left="download"[\s\S]*exportProject\(site\.id\)/)
    assert.match(source, /BaseButton[\s\S]*icon-left="trash-2"[\s\S]*deleteProject\(site\.id\)/)
    assert.match(source, /useConfirm/)
    assert.match(source, /confirm\(/)
    assert.match(source, /sitesStore\.deleteSite\(projectId\)/)
    assert.match(source, /sitesStore\.exportSiteProject\(projectId\)/)
    assert.doesNotMatch(source, /web-page-project-modal__project-icon/)
  })

  it('open project modal closes automatically after a project is selected', () => {
    const source = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(source, /async function openProject\(projectId: string\)/)
    assert.match(source, /await activateProject\(projectId\)/)
    assert.match(source, /closeProjectModals\(true\)/)
  })

  it('save without an active project opens new project modal and continues into created project', () => {
    const source = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(source, /hasDraftPageWithoutProject/)
    assert.match(source, /hasCreatedProject\.value \? hasUnsavedProjectChanges\.value : hasDraftPageWithoutProject\.value/)
    assert.match(source, /pendingCreateProjectSave/)
    assert.match(source, /openNewProjectModal\(\{ saveAfterCreate: true \}\)/)
    assert.match(source, /ensureProjectHasPage\(site\.id\)/)
    assert.match(source, /title: draftPage\?\.title \?\? 'Home'/)
    assert.match(source, /bodyStyles: draftPage\?\.bodyStyles/)
    assert.match(source, /await activateProject\(site\.id\)/)
    assert.match(source, /closeProjectModals\(true\)/)
  })

  it('page editor exposes a project settings modal', () => {
    const source = read('src/features/web-pages/components/PageEditor.vue')
    const toolbar = read('src/features/web-pages/components/PageChromeToolbar.vue')

    assert.match(toolbar, /file\.projectSettings/)
    assert.match(toolbar, /Project settings/)
    assert.match(source, /isProjectSettingsModalOpen/)
    assert.match(source, /openProjectSettingsModal/)
    assert.match(source, /saveProjectSettings/)
    assert.match(source, /BaseModal[\s\S]*Project settings/)
    assert.match(source, /projectSettingsName/)
    assert.match(source, /projectSettingsSlug/)
    assert.match(source, /sitesStore\.saveActiveSite\(\)/)
  })
})
