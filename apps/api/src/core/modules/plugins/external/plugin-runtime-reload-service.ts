import path from "node:path";
import { pathToFileURL } from "node:url";
import { PluginManager } from "../manager.ts";
import type { FabricPlugin } from "@auvexis/fabric-sdk";

export interface RuntimeReloadResult {
  status: "loaded" | "restart_required" | "failed";
  error?: string;
}

export async function reloadExternalPlugin(pluginDir: string, installId: string): Promise<RuntimeReloadResult> {
  try {
    const module = await import(`${pathToFileURL(path.join(pluginDir, "index.js")).href}?t=${Date.now()}`);
    const plugin: FabricPlugin = module.default || module[Object.keys(module)[0]];
    PluginManager.registerPlugin({ ...plugin, id: installId });
    return { status: "loaded" };
  } catch (error) {
    return {
      status: "failed",
      error: error instanceof Error ? error.message : "Failed to hot reload plugin",
    };
  }
}
