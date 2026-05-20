import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const globalSettingsSource = readFileSync(
  fileURLToPath(new URL('../AppGlobalSettings.vue', import.meta.url)),
  'utf8',
)

const commandPaletteRowSource = readFileSync(
  fileURLToPath(
    new URL(
      '../../../../features/command-palette/components/CommandPaletteResultRow.vue',
      import.meta.url,
    ),
  ),
  'utf8',
)

describe('plugin theme icons', () => {
  it('resolves credentials plugin icons through the theme-aware plugin icon resolver', () => {
    assert.match(globalSettingsSource, /import \{ resolvePluginIcon \}/)
    assert.match(globalSettingsSource, /const \{ isDark, setMode \} = useTheme\(\)/)
    assert.match(globalSettingsSource, /function pluginIcon\(plugin: any\): string/)
    assert.match(globalSettingsSource, /:src="pluginIcon\(plugin\)"/)
    assert.match(globalSettingsSource, /:logo="selectedPluginIcon"/)
    assert.match(globalSettingsSource, /:icon="selectedPluginIcon"/)
  })

  it('resolves command palette icons through the theme-aware plugin icon resolver', () => {
    assert.match(commandPaletteRowSource, /import \{ resolvePluginIcon \}/)
    assert.match(commandPaletteRowSource, /const \{ isDark \} = useTheme\(\)/)
    assert.match(commandPaletteRowSource, /const commandIcon = computed/)
    assert.match(commandPaletteRowSource, /:name="commandIcon"/)
  })
})
