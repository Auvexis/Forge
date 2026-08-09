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

const pluginNodeSource = readFileSync(
  fileURLToPath(
    new URL(
      '../../../../features/workflow-editor/components/nodes/PluginNode.vue',
      import.meta.url,
    ),
  ),
  'utf8',
)

const aiModelNodeSource = readFileSync(
  fileURLToPath(
    new URL(
      '../../../../features/workflow-editor/components/nodes/AiModelNode.vue',
      import.meta.url,
    ),
  ),
  'utf8',
)

const variableTreeSource = readFileSync(
  fileURLToPath(
    new URL(
      '../../../../features/workflow-editor/components/settings/editors/VariableTree.vue',
      import.meta.url,
    ),
  ),
  'utf8',
)

const triggerEditorSource = readFileSync(
  fileURLToPath(
    new URL(
      '../../../../features/workflow-editor/components/settings/editors/TriggerEditor.vue',
      import.meta.url,
    ),
  ),
  'utf8',
)

const triggerNodeSource = readFileSync(
  fileURLToPath(
    new URL(
      '../../../../features/workflow-editor/components/nodes/TriggerNode.vue',
      import.meta.url,
    ),
  ),
  'utf8',
)

describe('plugin theme icons', () => {
  it('resolves credentials plugin icons through the theme-aware plugin icon resolver', () => {
    assert.match(globalSettingsSource, /import \{ resolvePluginIcon \}/)
    assert.match(globalSettingsSource, /const \{ iconVariant, setMode \} = useTheme\(\)/)
    assert.match(globalSettingsSource, /function pluginIcon\(plugin: any\): string/)
    assert.match(globalSettingsSource, /:src="pluginIcon\(plugin\)"/)
    assert.match(globalSettingsSource, /:logo="selectedPluginIcon"/)
    assert.match(globalSettingsSource, /:icon="selectedPluginIcon"/)
  })

  it('resolves command palette icons through the theme-aware plugin icon resolver', () => {
    assert.match(commandPaletteRowSource, /import \{ resolvePluginIcon \}/)
    assert.match(commandPaletteRowSource, /const \{ iconVariant \} = useTheme\(\)/)
    assert.match(commandPaletteRowSource, /const commandIcon = computed/)
    assert.match(commandPaletteRowSource, /:name="commandIcon"/)
  })

  it('refreshes canvas plugin icons when the active theme changes', () => {
    for (const source of [pluginNodeSource, aiModelNodeSource]) {
      assert.match(source, /useTheme\(\)/)
      assert.match(source, /watch\(/)
      assert.match(source, /(iconVariant|isDark)\.value/)
      assert.match(source, /loadPluginAppearance/)
      assert.match(source, /resolvePluginIcon/)
    }
  })

  it('resolves variable tree plugin icons through the theme-aware plugin icon resolver', () => {
    assert.match(variableTreeSource, /import \{ useTheme \}/)
    assert.match(variableTreeSource, /import \{ resolvePluginIcon \}/)
    assert.match(variableTreeSource, /const \{ iconVariant \} = useTheme\(\)/)
    assert.match(variableTreeSource, /resolvePluginIcon\(upPlugin\.manifest\.metadata, \{ iconVariant: iconVariant\.value, fallback: 'puzzle' \}\)/)
    assert.doesNotMatch(variableTreeSource, /upPlugin\.manifest\.metadata\.icon/)
  })

  it('resolves plugin trigger select and canvas icons through theme-aware assets', () => {
    assert.match(triggerEditorSource, /import \{ useTheme \}/)
    assert.match(triggerEditorSource, /import \{ resolvePluginIcon \}/)
    assert.match(triggerEditorSource, /import \{ isIconUrl \}/)
    assert.match(triggerEditorSource, /const \{ iconVariant \} = useTheme\(\)/)
    assert.match(triggerEditorSource, /resolvePluginIcon\(p\.manifest\.metadata, \{[\s\S]*iconVariant: iconVariant\.value/)
    assert.match(triggerEditorSource, /isIconUrl\(iconStr\)/)
    assert.doesNotMatch(triggerEditorSource, /const iconStr = p\.manifest\.metadata\.icon/)

    assert.match(triggerNodeSource, /import \{ isIconUrl \}/)
    assert.match(triggerNodeSource, /isIconUrl\(pluginIcon\.value\)/)
    assert.match(triggerNodeSource, /resolvePluginIcon\(plugin\.manifest\.metadata, \{[\s\S]*iconVariant: iconVariant\.value/)
  })
})
