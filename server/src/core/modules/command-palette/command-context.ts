import type { CommandExecutionContext } from "./command-types.ts";

export function createCommandExecutionContext(
  overrides: Partial<CommandExecutionContext> = {},
): CommandExecutionContext {
  return {
    services: {},
    ...overrides,
  };
}
