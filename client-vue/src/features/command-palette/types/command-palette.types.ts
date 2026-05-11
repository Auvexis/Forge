export type CommandGroup =
  | 'navigation'
  | 'settings'
  | 'workflow'
  | 'universe'
  | 'production'
  | 'plugin'
  | 'execution'
  | 'utility'

export interface CommandAvailability {
  enabled: boolean
  reason?: string
  hidden?: boolean
}

export interface CommandNavigationResult {
  path: string
  replace?: boolean
}

export interface CommandUiIntent {
  type: string
  target?: string
  payload?: Record<string, unknown>
}

export interface CommandDescriptor {
  id: string
  group: CommandGroup
  label: string
  description?: string
  keywords?: string[]
  icon?: string
  destructive?: boolean
  availability: CommandAvailability
}

export interface CommandExecutionContext {
  routePath?: string
  activeWorkflowId?: string
  activeExecutionId?: string
  isUniverseMode?: boolean
}

export interface CommandDrilldownList {
  type: 'list'
  title: string
  commands: CommandDescriptor[]
}

export interface CommandDrilldownInput {
  type: 'input'
  title: string
  placeholder: string
  targetCommandId: string
  payloadKey: string
}

export type CommandDrilldown = CommandDrilldownList | CommandDrilldownInput

export interface CommandExecutionResult {
  ok: boolean
  message?: string
  navigation?: CommandNavigationResult
  uiIntent?: CommandUiIntent
  clipboardText?: string
  refreshHints?: string[]
  drilldown?: CommandDrilldown
}
