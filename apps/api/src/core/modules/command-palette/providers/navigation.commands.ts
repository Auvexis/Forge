import type {
  CommandDescriptor,
  CommandExecutionContext,
  CommandHandler,
  CommandProvider,
} from "../command-types.ts";

interface NavigationCommandInput {
  id: string;
  label: string;
  path: string;
  description: string;
  keywords: string[];
  icon: string;
}

function navigationCommand(input: NavigationCommandInput): CommandHandler {
  return {
    describe: (): CommandDescriptor => ({
      id: input.id,
      group: "navigation",
      label: input.label,
      description: input.description,
      keywords: [input.path, ...input.keywords],
      icon: input.icon,
      availability: { enabled: true },
    }),
    execute: () => ({
      ok: true,
      message: `${input.label} opened`,
      navigation: { path: input.path },
    }),
  };
}

function enterUniverseCommand(): CommandHandler {
  return {
    describe: (): CommandDescriptor => ({
      id: "universe.enter",
      group: "universe",
      label: "Enter Universe",
      description: "Open Universe Mode",
      keywords: ["universe", "plugins", "space", "/universe"],
      icon: "orbit",
      availability: { enabled: true },
    }),
    execute: () => ({
      ok: true,
      message: "Universe opened",
      navigation: { path: "/universe" },
      uiIntent: { type: "universe.enter" },
    }),
  };
}

function exitUniverseCommand(): CommandHandler {
  return {
    describe: (context: CommandExecutionContext): CommandDescriptor => ({
      id: "universe.exit",
      group: "universe",
      label: "Exit Universe",
      description: "Return to workflows",
      keywords: ["leave universe", "workflows", "/workflows"],
      icon: "log-out",
      availability: context.isUniverseMode
        ? { enabled: true }
        : { enabled: false, reason: "Universe mode is not active" },
    }),
    execute: () => ({
      ok: true,
      message: "Universe closed",
      navigation: { path: "/workflows" },
      uiIntent: { type: "universe.exit" },
    }),
  };
}

function openAgentPanelCommand(): CommandHandler {
  return {
    describe: (): CommandDescriptor => ({
      id: "agent-panel.open",
      group: "navigation",
      label: "Open Agent Panel",
      description: "Open the global published agent chat panel",
      keywords: ["agents", "agent chat", "published agents", "global agent"],
      icon: "bot",
      availability: { enabled: true },
    }),
    execute: () => ({
      ok: true,
      message: "Agent panel opened",
      uiIntent: { type: "agent-panel.open" },
    }),
  };
}

function openGuideBookCommand(): CommandHandler {
  return {
    describe: (): CommandDescriptor => ({
      id: "guide-book.open",
      group: "navigation",
      label: "Open Guide Book",
      description: "Browse and replay Fabric guides for tools, pages, and workflows",
      keywords: ["guide", "tutorial", "docs", "help", "start guide"],
      icon: "book-open",
      availability: { enabled: true },
    }),
    execute: () => ({
      ok: true,
      message: "Guide Book opened",
      uiIntent: { type: "guide-book.open" },
    }),
  };
}

export const navigationCommandProvider: CommandProvider = {
  id: "navigation",
  order: 10,
  commands: [
    openAgentPanelCommand(),
    openGuideBookCommand(),
    navigationCommand({
      id: "nav.home",
      label: "Home",
      path: "/",
      description: "Open the app home route",
      keywords: ["dashboard", "start"],
      icon: "home",
    }),
    navigationCommand({
      id: "nav.workflows",
      label: "Workflows",
      path: "/workflows",
      description: "Open workflows",
      keywords: ["workflow", "editor", "automations"],
      icon: "workflow",
    }),
    navigationCommand({
      id: "nav.universe",
      label: "Universe",
      path: "/universe",
      description: "Open Universe Mode",
      keywords: ["plugins", "space"],
      icon: "orbit",
    }),
    navigationCommand({
      id: "nav.settings",
      label: "Settings",
      path: "/settings",
      description: "Open app settings",
      keywords: ["preferences", "configuration"],
      icon: "settings",
    }),
    enterUniverseCommand(),
    exitUniverseCommand(),
  ],
};
