import { CredentialStore } from "../../plugins/credential-store.ts";
import { PluginExecutor } from "../../plugins/executor.ts";
import { PluginManager } from "../../plugins/manager.ts";
import { Vault } from "../../plugins/vault.ts";
import type {
  CredentialSchema,
  SailorPlugin,
  OAuth2Provider,
  OAuth2Tokens,
  PluginAuthType,
  PluginStatus,
} from "@auvexis/sailor-sdk";
import type {
  CommandDescriptor,
  CommandDrilldown,
  CommandExecutionContext,
  CommandHandler,
  CommandProvider,
} from "../command-types.ts";

interface PluginCommandServices {
  listPlugins: () => SailorPlugin[];
  getPlugin: (id: string) => SailorPlugin;
  getPluginStatus: (
    pluginId: string,
    authType: PluginAuthType,
    schema?: CredentialSchema,
  ) => PluginStatus;
  getCredentials: (pluginId: string) => Record<string, string> | null;
  getTokens: (pluginId: string) => OAuth2Tokens | null;
  deleteTokens: (pluginId: string) => void;
  getRedirectUri: (pluginId: string) => string;
  executePlugin: (pluginId: string, methodName: string, params: Record<string, unknown>) => Promise<unknown>;
}

const defaultPluginServices: PluginCommandServices = {
  listPlugins: PluginManager.getPlugins,
  getPlugin: PluginManager.getPlugin,
  getPluginStatus: CredentialStore.getPluginStatus.bind(CredentialStore),
  getCredentials: CredentialStore.getCredentials.bind(CredentialStore),
  getTokens: CredentialStore.getTokens.bind(CredentialStore),
  deleteTokens: CredentialStore.deleteTokens.bind(CredentialStore),
  getRedirectUri: PluginManager.getRedirectUri,
  executePlugin: PluginExecutor.execute,
};

function pluginServices(context: CommandExecutionContext): PluginCommandServices {
  return {
    ...defaultPluginServices,
    ...((context.services?.plugins as Partial<PluginCommandServices> | undefined) ?? {}),
  };
}

function pluginCredentialSchema(plugin: SailorPlugin): CredentialSchema | undefined {
  return (plugin.auth as { credentialSchema?: CredentialSchema }).credentialSchema;
}

function pluginStatus(plugin: SailorPlugin, services: PluginCommandServices): PluginStatus {
  return services.getPluginStatus(plugin.id, plugin.auth.type, pluginCredentialSchema(plugin));
}

function pluginKeywords(plugin: SailorPlugin, extra: string[] = []): string[] {
  const metadata = plugin.manifest.metadata;
  return [
    plugin.id,
    metadata.id,
    metadata.name,
    metadata.category,
    metadata.description,
    ...extra,
  ].filter(Boolean);
}

function pluginIconFields(plugin: SailorPlugin): Pick<CommandDescriptor, "icon" | "iconLight" | "iconDark"> {
  const metadata = plugin.manifest.metadata;
  return {
    icon: metadata.icon || "plug",
    iconLight: metadata.iconLight,
    iconDark: metadata.iconDark,
  };
}

async function oauthUrl(plugin: SailorPlugin, services: PluginCommandServices): Promise<string> {
  if (plugin.auth.type !== "oauth2") {
    throw new Error("Plugin does not support OAuth2");
  }

  const provider = plugin.auth as OAuth2Provider;
  const stored = services.getCredentials(plugin.id) ?? {};
  let credentials = Vault.mergeWithStored(plugin.id, provider.credentialSchema, stored);
  credentials = Vault.resolveEnvExpressions(credentials);

  if (!credentials || Object.keys(credentials).length === 0) {
    throw new Error("Credentials not found. Configure plugin credentials first.");
  }

  return provider.getAuthUrl(credentials, services.getRedirectUri(plugin.id));
}

// ─── Drilldown builder ────────────────────────────────────────────────────────

function pluginDrilldown(plugin: SailorPlugin, context: CommandExecutionContext): CommandDrilldown {
  const services = pluginServices(context);
  const status = pluginStatus(plugin, services);
  const isOAuth = plugin.auth.type === "oauth2";
  const isApiKey = plugin.auth.type === "api_key";
  const isConnected = status === "connected";
  const methodCount = Object.keys(plugin.manifest.methods).length;

  const subcommands: CommandDescriptor[] = [
    {
      id: `plugin.open.${plugin.id}`,
      group: "plugin",
      label: "Open in Universe",
      description: "Focus this plugin in the Universe view",
      keywords: ["universe", "open"],
      ...pluginIconFields(plugin),
      availability: { enabled: true },
    },
  ];

  if (isOAuth || isApiKey) {
    subcommands.push({
      id: `plugin.connect.${plugin.id}`,
      group: "plugin",
      label: isConnected ? "Re-authenticate" : "Connect / Authenticate",
      description: isConnected
        ? "Start the OAuth connection flow again"
        : "Authenticate to enable this plugin",
      keywords: ["connect", "auth", "oauth", "api key"],
      icon: "link",
      availability: { enabled: true },
    });
  }

  if (isOAuth && isConnected) {
    subcommands.push({
      id: `plugin.disconnect.${plugin.id}`,
      group: "plugin",
      label: "Disconnect",
      description: "Remove OAuth tokens for this plugin",
      keywords: ["disconnect", "revoke"],
      icon: "unlink",
      destructive: true,
      availability: { enabled: true },
    });
  }

  if (methodCount > 0) {
    subcommands.push({
      id: `plugin.methods.${plugin.id}`,
      group: "plugin",
      label: `Methods (${methodCount})`,
      description: "View available plugin methods",
      keywords: ["methods", "actions"],
      icon: "code",
      availability: {
        enabled: false,
        reason: "Plugin actions require a frontend-provided payload before execution",
      },
    });
  }

  subcommands.push({
    id: `plugin.uninstall.${plugin.id}`,
    group: "plugin",
    label: "Uninstall",
    description: "Disabled until a generic uninstall API exists",
    keywords: ["uninstall", "remove"],
    icon: "trash",
    destructive: true,
    availability: { enabled: false, reason: "No generic plugin uninstall API exists yet" },
  });

  return {
    type: "list",
    title: plugin.manifest.metadata.name,
    commands: subcommands,
  };
}

// ─── Per-plugin parent entry (shown in main list) ─────────────────────────────

function pluginEntryCommand(plugin: SailorPlugin): CommandHandler {
  return {
    describe: (context): CommandDescriptor => {
      const services = pluginServices(context);
      const status = pluginStatus(plugin, services);
      return {
        id: `plugin.entry.${plugin.id}`,
        group: "plugin",
        label: plugin.manifest.metadata.name,
        description: `${plugin.manifest.metadata.category} · ${status}`,
        keywords: pluginKeywords(plugin, ["plugin"]),
        ...pluginIconFields(plugin),
        availability: { enabled: true },
      };
    },
    execute: (context) => ({
      ok: true,
      drilldown: pluginDrilldown(plugin, context),
    }),
  };
}

// ─── Concrete sub-commands executed by drilldown selection ────────────────────
// These are hidden from the main list (availability.hidden = true) and only
// reachable via the drilldown mechanism.

function openPluginCommand(plugin: SailorPlugin): CommandHandler {
  return {
    describe: (): CommandDescriptor => ({
      id: `plugin.open.${plugin.id}`,
      group: "plugin",
      label: `Open ${plugin.manifest.metadata.name} in Universe`,
      keywords: pluginKeywords(plugin, ["open plugin", "universe"]),
      ...pluginIconFields(plugin),
      availability: { enabled: true, hidden: true },
    }),
    execute: () => ({
      ok: true,
      message: "Plugin opened",
      navigation: { path: "/universe" },
      uiIntent: {
        type: "plugin.open",
        target: plugin.id,
        payload: { pluginId: plugin.id },
      },
    }),
  };
}

function connectPluginCommand(plugin: SailorPlugin): CommandHandler {
  return {
    describe: (context): CommandDescriptor => {
      const services = pluginServices(context);
      return {
        id: `plugin.connect.${plugin.id}`,
        group: "plugin",
        label: `Connect ${plugin.manifest.metadata.name}`,
        keywords: pluginKeywords(plugin, ["connect", "authorize", plugin.auth.type]),
        icon: "link",
        availability:
          plugin.auth.type === "none"
            ? { enabled: false, reason: "Plugin does not require authentication", hidden: true }
            : { enabled: true, hidden: true, reason: pluginStatus(plugin, services) },
      };
    },
    execute: async (context) => {
      return {
        ok: true,
        message: "Plugin credentials requested",
        uiIntent: { type: "plugin.credentials.open", target: plugin.id },
      };
    },
  };
}

function disconnectPluginCommand(plugin: SailorPlugin): CommandHandler {
  return {
    describe: (context): CommandDescriptor => ({
      id: `plugin.disconnect.${plugin.id}`,
      group: "plugin",
      label: `Disconnect ${plugin.manifest.metadata.name}`,
      keywords: pluginKeywords(plugin, ["disconnect", "revoke", "oauth"]),
      icon: "unlink",
      destructive: true,
      availability:
        plugin.auth.type === "oauth2"
          ? { enabled: true, hidden: true, reason: pluginStatus(plugin, pluginServices(context)) }
          : { enabled: false, reason: "Only OAuth plugins can be disconnected generically", hidden: true },
    }),
    execute: async (context) => {
      const services = pluginServices(context);
      const tokens = services.getTokens(plugin.id);
      if (plugin.auth.type === "oauth2" && tokens && plugin.auth.revokeTokens) {
        const credentials = services.getCredentials(plugin.id) ?? {};
        await plugin.auth.revokeTokens(tokens, credentials);
      }
      services.deleteTokens(plugin.id);
      return {
        ok: true,
        message: "Plugin disconnected",
        refreshHints: ["plugins"],
      };
    },
  };
}

function disabledInstallCommand(): CommandHandler {
  return {
    describe: (): CommandDescriptor => ({
      id: "plugin.install",
      group: "plugin",
      label: "Install Plugin",
      description: "Plugin install is disabled until a generic registry API exists",
      keywords: ["install plugin", "marketplace"],
      icon: "download",
      availability: { enabled: false, reason: "No generic plugin install API exists yet" },
    }),
    execute: () => ({ ok: false, message: "Plugin install is not available" }),
  };
}

function pluginCommands(plugin: SailorPlugin): CommandHandler[] {
  return [
    pluginEntryCommand(plugin),
    openPluginCommand(plugin),
    connectPluginCommand(plugin),
    disconnectPluginCommand(plugin),
  ];
}

export const pluginsCommandProvider: CommandProvider = {
  id: "plugins",
  order: 40,
  commands: (context) => {
    const services = pluginServices(context);
    return [
      disabledInstallCommand(),
      ...services.listPlugins().flatMap(pluginCommands),
    ];
  },
};
