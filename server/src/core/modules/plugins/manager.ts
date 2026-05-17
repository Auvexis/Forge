import type { SailorPlugin } from "@auvexis/sailor-sdk";
import { AppRepository } from "../app/app-repository.ts";

const plugins = new Map<string, SailorPlugin>();

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
  getPlugins: (): SailorPlugin[] => {
    return Array.from(plugins.values());
  },

  getPlugin: (id: string): SailorPlugin => {
    const plugin = plugins.get(id);

    if (!plugin) {
      throw new Error("Plugin not found: " + id);
    }

    return plugin;
  },

  registerPlugin: (plugin: SailorPlugin) => {
    plugins.set(plugin.id, plugin);
    console.log(`[SAILOR | PLUGINS]: Registered plugin ${plugin.id}`);
  },

  getRedirectUri: (pluginId: string): string => {
    return `${getPublicBaseUrl()}/plugins/${pluginId}/auth/callback`;
  },

  isLocalRedirectUri: (redirectUri: string): boolean => {
    return isLocalPublicUrl(redirectUri);
  },
};
