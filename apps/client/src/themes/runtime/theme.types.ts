export type FabricThemeType = 'dark' | 'light'

export interface FabricThemeDefinition {
  $schema?: string
  id: string
  name: string
  type: FabricThemeType
  tokens: Record<string, string>
}

export type FabricThemeId = 'fabric.dark' | 'fabric.light'
