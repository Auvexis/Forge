import { CredentialStore } from "../../plugins/credential-store.ts";
import { PluginExecutor } from "../../plugins/executor.ts";
import { PluginManager } from "../../plugins/manager.ts";
import { Vault } from "../../plugins/vault.ts";
import type {
  CredentialSchema,
  Nod8Plugin,
  OAuth2Provider,
  OAuth2Tokens,
  PluginAuthType,
  PluginStatus,
} from "../../../../shared/models/plugin-types.ts";
import type {
  CommandDescriptor,
  CommandExecutionContext,
  CommandHandler,
  CommandProvider,
} from "../command-types.ts";

interface PluginCommandServices {
  listPlugins: () => Nod8Plugin[];
  getPlugin: (id: string) => Nod8Plugin;
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

function pluginCredentialSchema(plugin: Nod8Plugin): CredentialSchema | undefined {
  return (plugin.auth as { credentialSchema?: CredentialSchema }).credentialSchema;
}

function pluginStatus(plugin: Nod8Plugin, services: PluginCommandServices): PluginStatus {
  return services.getPluginStatus(plugin.id, plugin.auth.type, pluginCredentialSchema(plugin));
}

function pluginKeywords(plugin: Nod8Plugin, extra: string[] = []): string[] {
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

async function oauthUrl(plugin: Nod8Plugin, services: PluginCommandServices): Promise<string> {
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

function openPluginCommand(plugin: Nod8Plugin): CommandHandler {
  return {
    describe: (): CommandDescriptor => ({
      id: `plugin.open.${plugin.id}`,
      group: "plugin",
      label: `Open ${plugin.manifest.metadata.name}`,
      description: "Open plugin in Universe",
      keywords: pluginKeywords(plugin, ["open plugin", "universe"]),
      icon: plugin.manifest.metadata.icon || "plug",
      availability: { enabled: true },
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

function connectPluginCommand(plugin: Nod8Plugin): CommandHandler {
  return {
    describe: (context): CommandDescriptor => {
      const services = pluginServices(context);
      return {
        id: `plugin.connect.${plugin.id}`,
        group: "plugin",
        label: `Connect ${plugin.manifest.metadata.name}`,
        description: "Connect plugin using its generic auth contract",
        keywords: pluginKeywords(plugin, ["connect", "authorize", plugin.auth.type]),
        icon: "link",
        availability:
          plugin.auth.type === "none"
            ? { enabled: false, reason: "Plugin does not require authentication" }
            : { enabled: true, reason: pluginStatus(plugin, services) },
      };
    },
    execute: async (context) => {
      if (plugin.auth.type === "api_key") {
        return {
          ok: true,
          message: "Plugin credentials requested",
          uiIntent: { type: "plugin.credentials.open", target: plugin.id },
        };
      }

      const services = pluginServices(context);
      const url = await oauthUrl(plugin, services);
      return {
        ok: true,
        message: "Plugin authorization started",
        uiIntent: {
          type: "plugin.oauth.open",
          target: plugin.id,
          payload: { url },
        },
      };
    },
  };
}

function disconnectPluginCommand(plugin: Nod8Plugin): CommandHandler {
  return {
    describe: (context): CommandDescriptor => ({
      id: `plugin.disconnect.${plugin.id}`,
      group: "plugin",
      label: `Disconnect ${plugin.manifest.metadata.name}`,
      description: "Disconnect OAuth tokens for this plugin",
      keywords: pluginKeywords(plugin, ["disconnect", "revoke", "oauth"]),
      icon: "unlink",
      destructive: true,
      availability:
        plugin.auth.type === "oauth2"
          ? { enabled: true, reason: pluginStatus(plugin, pluginServices(context)) }
          : { enabled: false, reason: "Only OAuth plugins can be disconnected generically" },
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

function reauthenticatePluginCommand(plugin: Nod8Plugin): CommandHandler {
  return {
    describe: (context): CommandDescriptor => ({
      id: `plugin.reauth.${plugin.id}`,
      group: "plugin",
      label: `Re-authenticate ${plugin.manifest.metadata.name}`,
      description: "Start the generic OAuth connection flow again",
      keywords: pluginKeywords(plugin, ["reauthenticate", "reconnect", "oauth"]),
      icon: "refresh-cw",
      availability:
        plugin.auth.type === "oauth2"
          ? { enabled: true, reason: pluginStatus(plugin, pluginServices(context)) }
          : { enabled: false, reason: "Only OAuth plugins can be re-authenticated" },
    }),
    execute: async (context) => {
      const services = pluginServices(context);
      const url = await oauthUrl(plugin, services);
      return {
        ok: true,
        message: "Plugin authorization started",
        uiIntent: {
          type: "plugin.oauth.open",
          target: plugin.id,
          payload: { url },
        },
      };
    },
  };
}

function methodActionCommands(plugin: Nod8Plugin): CommandHandler[] {
  return Object.entries(plugin.manifest.methods).map(([methodName, method]) => ({
    describe: (): CommandDescriptor => ({
      id: `plugin.action.${plugin.id}.${methodName}`,
      group: "plugin",
      label: `${plugin.manifest.metadata.name}: ${method.metadata.label}`,
      description: method.metadata.description,
      keywords: pluginKeywords(plugin, [methodName, method.metadata.label, method.metadata.description]),
      icon: plugin.manifest.metadata.icon || "plug",
      availability: {
        enabled: false,
        reason: "Plugin actions require a frontend-provided payload before execution",
      },
    }),
    execute: async (context, payload) => ({
      ok: true,
      message: "Plugin action executed",
      refreshHints: ["plugins"],
      uiIntent: {
        type: "plugin.action.executed",
        target: plugin.id,
        payload: {
          methodName,
          result: await pluginServices(context).executePlugin(
            plugin.id,
            methodName,
            (payload as Record<string, unknown> | undefined) ?? {},
          ),
        },
      },
    }),
  }));
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

function disabledUninstallCommand(plugin: Nod8Plugin): CommandHandler {
  return {
    describe: (): CommandDescriptor => ({
      id: `plugin.uninstall.${plugin.id}`,
      group: "plugin",
      label: `Uninstall ${plugin.manifest.metadata.name}`,
      description: "Plugin uninstall is disabled until a generic registry API exists",
      keywords: pluginKeywords(plugin, ["uninstall", "remove plugin"]),
      icon: "trash",
      destructive: true,
      availability: { enabled: false, reason: "No generic plugin uninstall API exists yet" },
    }),
    execute: () => ({ ok: false, message: "Plugin uninstall is not available" }),
  };
}

function pluginCommands(plugin: Nod8Plugin): CommandHandler[] {
  return [
    openPluginCommand(plugin),
    connectPluginCommand(plugin),
    disconnectPluginCommand(plugin),
    reauthenticatePluginCommand(plugin),
    disabledUninstallCommand(plugin),
    ...methodActionCommands(plugin),
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
