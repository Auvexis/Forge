import { apiRequest } from './client'
import { ENDPOINTS } from './endpoints'
import type {
  CommandDescriptor,
  CommandExecutionContext,
  CommandExecutionResult,
} from '@/features/command-palette/types/command-palette.types'

function contextParams(context: CommandExecutionContext = {}) {
  return {
    routePath: context.routePath,
    activeWorkflowId: context.activeWorkflowId,
    activeExecutionId: context.activeExecutionId,
    isUniverseMode: context.isUniverseMode,
  }
}

export const commandPaletteApi = {
  list: (context: CommandExecutionContext = {}) =>
    apiRequest<CommandDescriptor[]>(ENDPOINTS.COMMAND_PALETTE_COMMANDS, {
      params: contextParams(context),
    }),

  search: (query: string, context: CommandExecutionContext = {}) =>
    apiRequest<CommandDescriptor[]>(ENDPOINTS.COMMAND_PALETTE_SEARCH, {
      params: { q: query, ...contextParams(context) },
    }),

  execute: (
    commandId: string,
    payload: Record<string, unknown> = {},
    context: CommandExecutionContext = {},
  ) =>
    apiRequest<CommandExecutionResult>(ENDPOINTS.COMMAND_PALETTE_EXECUTE(commandId), {
      method: 'POST',
      body: { payload, context },
    }),
}
