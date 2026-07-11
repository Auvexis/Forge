import type { FabricPlugin } from "@auvexis/fabric-sdk";
import { AppRepository } from "../app/app-repository.ts";

const plugins = new Map<string, FabricPlugin>();

const SERVER_PORT = process.env.PORT ? parseInt(process.env.PORT) : 23801;

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, "");

const getPublicBaseUrl = (): string => {
  const configuredPublicUrl = AppRepository.getSetting("public_url");
  if (typeof configuredPublicUrl === "string" && configuredPublicUrl.trim()) {
    return trimTrailingSlash(configuredPublicUrl.trim());
  }

  if (process.env.PUBLIC_URL?.trim()) {
    return trimTrailingSlash(process.env.PUBLIC_URL.trim());
  }

  return `http://localhost:${SERVER_PORT}`;
};

const isLocalPublicUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  } catch {
    return true;
  }
};

export const PluginManager = {
  getPlugins: (): FabricPlugin[] => {
    return Array.from(plugins.values());
  },

  getPlugin: (id: string): FabricPlugin => {
    const plugin = plugins.get(id);

    if (!plugin) {
      throw new Error("Plugin not found: " + id);
    }

    return plugin;
  },

  registerPlugin: (plugin: FabricPlugin) => {
    plugins.set(plugin.id, plugin);
    console.log(`[FABRIC | PLUGINS]: Registered plugin ${plugin.id}`);
  },

  clearPlugins: () => {
    plugins.clear();
  },

  getRedirectUri: (pluginId: string): string => {
    return `${getPublicBaseUrl()}/plugins/${pluginId}/auth/callback`;
  },

  isLocalRedirectUri: (redirectUri: string): boolean => {
    return isLocalPublicUrl(redirectUri);
  },
};
