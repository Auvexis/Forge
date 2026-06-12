import type {
  CommandDescriptor,
  CommandHandler,
  CommandProvider,
  CommandUiIntent,
} from "../command-types.ts";

function uiIntentCommand(input: {
  id: string;
  group: CommandDescriptor["group"];
  label: string;
  description: string;
  keywords: string[];
  icon: string;
  intent: CommandUiIntent;
  message: string;
}): CommandHandler {
  return {
    describe: (): CommandDescriptor => ({
      id: input.id,
      group: input.group,
      label: input.label,
      description: input.description,
      keywords: input.keywords,
      icon: input.icon,
      availability: { enabled: true },
    }),
    execute: () => ({
      ok: true,
      message: input.message,
      uiIntent: input.intent,
    }),
  };
}

const settingsTabApiNote =
  "Settings tab targets are intentionally not exposed yet. Add stable frontend tab ids before adding tab-specific palette commands.";

export const appSettingsCommandProvider: CommandProvider = {
  id: "app-settings",
  order: 20,
  commands: [
    {
      describe: (): CommandDescriptor => ({
        id: "settings.open",
        group: "settings",
        label: "Open Settings",
        description: `Open application settings. ${settingsTabApiNote}`,
        keywords: ["preferences", "configuration", "settings"],
        icon: "settings",
        availability: { enabled: true },
      }),
      execute: () => ({
        ok: true,
        message: "Settings opened",
        navigation: { path: "/settings" },
        uiIntent: { type: "settings.open" },
      }),
    },
    uiIntentCommand({
      id: "production.panel.open",
      group: "production",
      label: "Open Production Panel",
      description: "Open the production monitor panel",
      keywords: ["production", "monitor", "status", "published workflows"],
      icon: "activity",
      intent: { type: "production-panel.open" },
      message: "Production panel opened",
    }),
    uiIntentCommand({
      id: "production.panel.close",
      group: "production",
      label: "Close Production Panel",
      description: "Close the production monitor panel",
      keywords: ["production", "monitor", "hide"],
      icon: "panel-right-close",
      intent: { type: "production-panel.close" },
      message: "Production panel closed",
    }),
  ],
};
