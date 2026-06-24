import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

describe('pages management UI contract', () => {
  it('router exposes /pages and /pages/:projectId', () => {
    const source = fs.readFileSync(path.resolve('src/app/router.ts'), 'utf8')

    assert.match(source, /path: '\/pages'/)
    assert.match(source, /path: '\/pages\/:projectId'/)
    assert.doesNotMatch(source, /path: '\/pages\/:pageId'/)
  })

  it('page shell mounts the editor directly for an empty canvas entry', () => {
    const source = fs.readFileSync(path.resolve('src/app/pages/PagesEditorPage.vue'), 'utf8')

    assert.match(source, /<PageEditor/)
    assert.doesNotMatch(source, /<PagesList/)
    assert.match(source, /AppPage/)
  })

  it('create, delete and open actions are wired to store', () => {
    const source = fs.readFileSync(
      path.resolve('src/features/web-pages/components/PagesList.vue'),
      'utf8',
    )

    assert.match(source, /createPage/)
    assert.match(source, /deletePage/)
    assert.match(source, /openPage/)
    assert.match(source, /router\.push/)
  })

  it('renders pages as searchable grid cards and creates pages through BaseModal', () => {
    const list = fs.readFileSync(path.resolve('src/features/web-pages/components/PagesList.vue'), 'utf8')
    const modal = fs.readFileSync(path.resolve('src/features/web-pages/components/PageCreateSiteModal.vue'), 'utf8')

    assert.match(list, /searchQuery/)
    assert.match(list, /filteredPages/)
    assert.match(list, /web-pages-list__grid/)
    assert.match(list, /PageCreateSiteModal/)
    assert.match(list, /variant="primary"/)
    assert.match(modal, /BaseModal/)
    assert.match(modal, /BaseInput/)
    assert.match(modal, /create/)
  })

  it('page editor owns project create open and import modals', () => {
    const editor = fs.readFileSync(path.resolve('src/features/web-pages/components/PageEditor.vue'), 'utf8')

    assert.match(editor, /BaseModal/)
    assert.match(editor, /BaseFileDropzone/)
    assert.match(editor, /isNewProjectModalOpen/)
    assert.match(editor, /isOpenProjectModalOpen/)
    assert.match(editor, /isImportProjectModalOpen/)
    assert.match(editor, /createProject/)
    assert.match(editor, /openProject/)
    assert.match(editor, /importProjectFile/)
    assert.match(editor, /\/pages\/\$\{site\.id\}/)
    assert.doesNotMatch(editor, /\/pages\/\$\{page\.id\}/)
  })

  it('external plugin installer reuses the shared file dropzone', () => {
    const installer = fs.readFileSync(
      path.resolve('src/features/plugins/components/ExternalPluginInstaller.vue'),
      'utf8',
    )

    assert.match(installer, /BaseFileDropzone/)
    assert.doesNotMatch(installer, /plugin-installer-modal__dropzone/)
  })
})
