import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))
const installerSource = readFileSync(resolve(currentDir, '../ExternalPluginInstaller.vue'), 'utf8')
const appSource = readFileSync(resolve(currentDir, '../../../../app/App.vue'), 'utf8')

describe('external plugin installer modal contract', () => {
  it('renders the installer as a BaseModal with settings-style two-column layout', () => {
    assert.match(installerSource, /<BaseModal\s+:is-open="isOpen"/)
    assert.match(installerSource, /class="plugin-installer-modal__aside"/)
    assert.match(installerSource, /class="plugin-installer-modal__main"/)
  })

  it('keeps source inputs on the left and manifest preview states on the right', () => {
    assert.match(installerSource, /Repository URL/)
    assert.match(installerSource, /Extracted folder/)
    assert.match(installerSource, /type="file"/)
    assert.match(installerSource, /webkitdirectory/)
    assert.match(installerSource, /@drop\.prevent="handleFolderDrop"/)
    assert.match(installerSource, /watch\(repositoryUrl/)
    assert.match(installerSource, /v-if="loading"/)
    assert.match(installerSource, /v-else-if="preview\?\.manifest"/)
    assert.match(installerSource, /manifest\.metadata\.name/)
    assert.doesNotMatch(installerSource, /Preview repository/)
    assert.doesNotMatch(installerSource, /Preview folder/)
  })

  it('shows install errors even while a manifest preview is visible', () => {
    assert.match(installerSource, /plugin-installer-modal__install-error/)
    assert.match(installerSource, /v-if="error"/)
    assert.match(installerSource, /result\.reloadStatus/)
  })

  it('opens from the sidebar as a global overlay instead of the sidebar panel', () => {
    assert.match(appSource, /const isPluginInstallerOpen = ref\(false\)/)
    assert.match(appSource, /<ExternalPluginInstaller\s+:is-open="isPluginInstallerOpen"/)
    assert.doesNotMatch(appSource, /openPanel\(\{\s*title: 'Plugin Installer'/)
  })

  it('auto-opens its start guide through the shared tutorial utility', () => {
    const registrySource = readFileSync(
      resolve(currentDir, '../../../../shared/start-guide/startGuide.registry.ts'),
      'utf8',
    )

    assert.match(installerSource, /useStartGuide/)
    assert.match(installerSource, /watch\(\s*\(\) => props\.isOpen/)
    assert.match(installerSource, /openIfNeeded\('plugin-external-installer'\)/)
    assert.match(registrySource, /'plugin-external-installer'/)
    assert.match(registrySource, /category: 'plugins'/)
  })
})
