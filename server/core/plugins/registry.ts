import type { PluginExportModel } from "../shared/models/plugin.model.ts";
import { GoogleDrivePlugin } from "./google-drive/index.ts";

const plugins = new Map<string, PluginExportModel>();

export function registerPlugin(plugin: PluginExportModel) {
  plugins.set(plugin.id, plugin);
}

export function getPlugin(id: string) {
  return plugins.get(id);
}

export function getPlugins() {
  return Array.from(plugins.values());
}

registerPlugin(GoogleDrivePlugin);