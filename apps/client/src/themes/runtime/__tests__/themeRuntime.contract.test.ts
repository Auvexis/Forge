import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it } from 'node:test'

const root = process.cwd()

function read(relativePath: string) {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

function readFilesRecursive(relativePath: string): string[] {
  return readdirSync(resolve(root, relativePath), { withFileTypes: true }).flatMap((entry) => {
    const entryPath = `${relativePath}/${entry.name}`
    return entry.isDirectory() ? readFilesRecursive(entryPath) : [entryPath]
  })
}

function tokenNameToCssVar(tokenName: string) {
  return `--fabric-${tokenName.replace(/\./g, '-').replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}`
}

function componentPrefixFromPath(relativePath: string) {
  const name = relativePath.split('/').at(-1)?.replace(/\.vue$/, '') ?? ''
  return name.charAt(0).toLowerCase() + name.slice(1)
}

function isVisualToken(varName: string) {
  const includePrefixes = [
    'bg-',
    'border',
    'text-primary',
    'text-secondary',
    'text-muted',
    'text-disabled',
    'text-inverse',
    'text-error',
    'text-warning',
    'text-success',
    'text-chrome',
    'button-',
    'input-',
    'status-',
    'sidebar-',
    'topbar-',
    'workbench-',
    'panel-',
    'shadow-',
    'accent',
    'green-',
    'red-',
    'amber-',
    'blue-',
    'brand-',
    'color-',
  ]
  const skipPrefixes = [
    'space-',
    'font-',
    'duration-',
    'ease-',
    'radius-',
    'z-',
    'text-xs',
    'text-sm',
    'text-base',
    'text-lg',
    'text-xl',
    'text-2xl',
    'text-3xl',
    'active-sidebar-width',
    'sidebar-width',
    'sidebar-expanded',
    'workbench-status-height',
  ]

  return (
    !skipPrefixes.some((prefix) => varName === prefix || varName.startsWith(prefix)) &&
    includePrefixes.some((prefix) => varName === prefix || varName.startsWith(prefix))
  )
}

describe('theme runtime contract', () => {
  it('keeps theme JSON files separate from runtime TypeScript', () => {
    const jsonEntries = readdirSync(resolve(root, 'src/themes/json'))
    const runtimeEntries = readdirSync(resolve(root, 'src/themes/runtime'))

    assert.deepEqual(jsonEntries.filter((entry) => entry.endsWith('.ts')), [])
    assert.ok(jsonEntries.includes('dark.json'))
    assert.ok(jsonEntries.includes('light.json'))
    assert.ok(jsonEntries.includes('template.json'))
    assert.ok(runtimeEntries.some((entry) => entry.endsWith('.ts')))
  })

  it('defines VS Code-style dot tokens for shared component surfaces', () => {
    const darkTheme = JSON.parse(read('src/themes/json/dark.json')) as { tokens: Record<string, string> }
    const lightTheme = JSON.parse(read('src/themes/json/light.json')) as { tokens: Record<string, string> }

    for (const tokenName of [
      'accent',
      'bg.canvas',
      'radius.xs',
      'radius.sm',
      'radius.md',
      'radius.lg',
      'radius.xl',
      'radius.full',
      'button.danger.bg',
      'button.outline.bg',
      'baseBadge.neutral.bg',
      'baseButton.ghost.bg',
      'baseCodeEditor.bg',
      'baseCodeEditor.radius',
      'baseCodeEditor.text',
      'baseColorPicker.bg',
      'baseDropdownSelect.bg',
      'baseFileDropzone.bg',
      'baseFloatingWindow.bg',
      'baseInput.bg',
      'baseSelect.bg',
      'baseSwitch.track.bg',
      'baseTextarea.bg',
      'baseTopbarButton.radius',
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
      'baseModal.radius',
      'baseModal.inner.border',
      'baseModal.highlight',
      'baseCanvas.ruler.lines',
      'baseCanvas.selection.bg',
      'appPanel.bg',
      'appDock.bg',
      'appHint.bg',
      'appConfirmPanel.radius',
      'appDropdownMenu.radius',
      'appDropdownItem.radius',
      'codeBlock.bg',
      'dataTable.bg',
      'globalSettings.nav.active.bg',
      'globalAddNodePanel.bg',
      'globalAddNodePanel.item.hover.bg',
      'jsonViewer.key.text',
      'notificationPanel.bg',
      'notificationTrigger.badge.text',
      'profileSwitcher.hover.bg',
      'sidebarGlobalPanel.bg',
      'statusBadge.success.bg',
      'workbench.panel.header.bg',
      'workbench.rail.button.hover.bg',
      'workbench.status.button.active.bg',
      'workflowTimeline.bg',
      'workflowTimeline.clip.bg',
      'workflowTimeline.depth.bg',
      'workflowTimeline.duration.bg',
      'workflowTimeline.lane.bg',
      'workflowTimeline.playhead',
      'workflowTimeline.tooltip.bg',
      'workflowTimeline.tooltip.border',
      'workflowTimeline.trail',
      'topbar.notificationBadge.text',
      'executionPanel.bg',
    ]) {
      assert.equal(typeof darkTheme.tokens[tokenName], 'string')
      assert.equal(typeof lightTheme.tokens[tokenName], 'string')
    }
  })

  it('keeps the theme template aligned with built-in theme tokens', () => {
    const darkTheme = JSON.parse(read('src/themes/json/dark.json')) as { tokens: Record<string, string> }
    const lightTheme = JSON.parse(read('src/themes/json/light.json')) as { tokens: Record<string, string> }
    const templateTheme = JSON.parse(read('src/themes/json/template.json')) as {
      id: string
      name: string
      tokens: Record<string, string>
    }

    assert.equal(templateTheme.id, 'fabric.custom-template')
    assert.equal(templateTheme.name, 'Fabric Custom Template')
    assert.deepEqual(Object.keys(templateTheme.tokens).sort(), Object.keys(lightTheme.tokens).sort())
    assert.deepEqual(Object.keys(templateTheme.tokens).sort(), Object.keys(darkTheme.tokens).sort())
  })

  it('keeps Vue visual styles behind component theme tokens', () => {
    const genericUsages: string[] = []

    for (const relativePath of readFilesRecursive('src').filter((entry) => entry.endsWith('.vue'))) {
      const source = read(relativePath)
      const componentPrefix = tokenNameToCssVar(`${componentPrefixFromPath(relativePath)}.`).replace(/-$/, '')

      for (const match of source.matchAll(/var\(--fabric-([a-z0-9-]+)/g)) {
        const varName = match[1]
        const cssVar = `--fabric-${varName}`
        if (isVisualToken(varName) && !cssVar.startsWith(componentPrefix)) {
          genericUsages.push(`${relativePath}: ${cssVar}`)
        }
      }
    }

    assert.deepEqual(genericUsages, [])
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

  it('builds settings preview cards from JSON theme tokens', () => {
    const preview = read('src/themes/runtime/theme.preview.ts')
    const settings = read('src/shared/components/layout/AppGlobalSettings.vue')
    const themeSelect = read('src/shared/components/base/BaseThemeSelect.vue')

    assert.match(preview, /getFabricThemePreviewCards/)
    assert.match(preview, /getFabricTheme\(themeIdForType\('dark'\)\)/)
    assert.match(preview, /getFabricTheme\(themeIdForType\('light'\)\)/)
    assert.match(preview, /resolveThemeToken/)
    assert.match(settings, /BaseThemeSelect/)
    assert.match(themeSelect, /getFabricThemePreviewCards\(\)/)
    assert.doesNotMatch(settings, /accentColor: '#/)
  })

  it('keeps the dark theme neutral instead of warm brown', () => {
    const darkTheme = JSON.parse(read('src/themes/json/dark.json')) as { tokens: Record<string, string> }
    const darkThemeSource = read('src/themes/json/dark.json')

    assert.equal(darkTheme.tokens['bg.base'], '#0C0C0C')
    assert.equal(darkTheme.tokens['bg.chrome'], '#202020')
    assert.equal(darkTheme.tokens['bg.canvas'], '#171717')
    assert.doesNotMatch(
      darkThemeSource,
      /fffaf4|fff7ee|250, 244|3a302c|4a3e39|c8bbb5|9d8f88|6d625d|1c1815|24201d|2c2723|3a332e|171411|1f1a18/,
    )
  })
})
