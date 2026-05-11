import type { ZodType } from "zod";

export type CommandId = string;

export type CommandGroup =
  | "navigation"
  | "settings"
  | "workflow"
  | "universe"
  | "production"
  | "plugin"
  | "execution"
  | "utility";

export interface CommandAvailability {
  enabled: boolean;
  reason?: string;
  hidden?: boolean;
}

export interface CommandNavigationResult {
  path: string;
  replace?: boolean;
}

export interface CommandUiIntent {
  type: string;
  target?: string;
  payload?: Record<string, unknown>;
}

export interface CommandDescriptor {
  id: CommandId;
  group: CommandGroup;
  label: string;
  description?: string;
  keywords?: string[];
  icon?: string;
  destructive?: boolean;
  payloadSchema?: ZodType;
  availability: CommandAvailability;
}

export interface CommandExecutionContext {
  routePath?: string;
  activeWorkflowId?: string;
  activeExecutionId?: string;
  isUniverseMode?: boolean;
  services?: Record<string, unknown>;
}

/** Drilldown list: palette shows a secondary list of sub-commands. */
export interface CommandDrilldownList {
  type: "list";
  title: string;
  commands: CommandDescriptor[];
}

/** Drilldown input: palette shows a text field, then executes targetCommandId with payloadKey=value. */
export interface CommandDrilldownInput {
  type: "input";
  title: string;
  placeholder: string;
  targetCommandId: string;
  payloadKey: string;
}

export type CommandDrilldown = CommandDrilldownList | CommandDrilldownInput;

export interface CommandExecutionResult {
  ok: boolean;
  message?: string;
  navigation?: CommandNavigationResult;
  uiIntent?: CommandUiIntent;
  clipboardText?: string;
  refreshHints?: string[];
  /** When present, palette stays open and renders the drilldown instead of closing. */
  drilldown?: CommandDrilldown;
}

export interface CommandHandler {
  describe(context: CommandExecutionContext): CommandDescriptor | Promise<CommandDescriptor>;
  execute(
    context: CommandExecutionContext,
    payload?: unknown,
  ): CommandExecutionResult | Promise<CommandExecutionResult>;
}

export interface CommandProvider {
  id: string;
  order: number;
  commands:
    | CommandHandler[]
    | ((context: CommandExecutionContext) => CommandHandler[] | Promise<CommandHandler[]>);
}
