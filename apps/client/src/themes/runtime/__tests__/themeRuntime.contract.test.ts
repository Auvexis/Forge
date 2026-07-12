import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it } from 'node:test'

const root = process.cwd()

function read(relativePath: string) {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

describe('theme runtime contract', () => {
  it('keeps theme JSON files separate from runtime TypeScript', () => {
    const jsonEntries = readdirSync(resolve(root, 'src/themes/json'))
    const runtimeEntries = readdirSync(resolve(root, 'src/themes/runtime'))

    assert.deepEqual(jsonEntries.filter((entry) => entry.endsWith('.ts')), [])
    assert.ok(jsonEntries.includes('dark.json'))
    assert.ok(jsonEntries.includes('light.json'))
    assert.ok(runtimeEntries.some((entry) => entry.endsWith('.ts')))
  })

  it('defines VS Code-style dot tokens for shared component surfaces', () => {
    const darkTheme = JSON.parse(read('src/themes/json/dark.json')) as { tokens: Record<string, string> }
    const lightTheme = JSON.parse(read('src/themes/json/light.json')) as { tokens: Record<string, string> }

    for (const tokenName of [
      'accent',
      'bg.canvas',
      'button.danger.bg',
      'button.outline.bg',
      'baseBadge.neutral.bg',
      'baseButton.ghost.bg',
      'baseCodeEditor.bg',
      'baseColorPicker.bg',
      'baseDropdownSelect.bg',
      'baseFileDropzone.bg',
      'baseFloatingWindow.bg',
      'baseInput.bg',
      'baseSelect.bg',
      'baseSwitch.track.bg',
      'baseTextarea.bg',
      'baseTopbarButton.hover.bg',
      'baseVariableInput.bg',
      'appContextMenu.bg',
      'appDialog.bg',
      'appDropdownItem.hover.bg',
      'appPopover.bg',
      'appToaster.bg',
      'appShell.bg',
      'appPage.bg',
      'baseModal.bg',
      'appPanel.bg',
      'appDock.bg',
      'appHint.bg',
      'codeBlock.bg',
      'dataTable.bg',
      'globalSettings.nav.active.bg',
      'guideBook.bg',
      'jsonViewer.key.text',
      'notificationPanel.bg',
      'profileSwitcher.hover.bg',
      'sidebarGlobalPanel.bg',
      'startGuide.bg',
      'statusBadge.success.bg',
    ]) {
      assert.equal(typeof darkTheme.tokens[tokenName], 'string')
      assert.equal(typeof lightTheme.tokens[tokenName], 'string')
    }
  })

  it('loads JSON themes through a runtime registry and applies them from useTheme', () => {
    const registry = read('src/themes/runtime/theme.registry.ts')
    const loader = read('src/themes/runtime/theme.loader.ts')
    const useTheme = read('src/shared/composables/useTheme.ts')
    const main = read('src/main.ts')

    assert.match(registry, /from '\.\.\/json\/dark\.json'/)
    assert.match(registry, /from '\.\.\/json\/light\.json'/)
    assert.match(loader, /tokenNameToCssVar/)
    assert.match(loader, /--fabric-/)
    assert.match(useTheme, /applyFabricThemeByType\(resolved\)/)
    assert.match(main, /import '\.\/shared\/composables\/useTheme'/)
  })
})
