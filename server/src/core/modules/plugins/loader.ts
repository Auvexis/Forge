import { pathToFileURL } from "url";
import path from "path";
import fs from "fs";
import { validateManifest as validateSdkManifest } from "@auvexis/sailor-sdk";
import type { SailorPlugin } from "@auvexis/sailor-sdk";
import type Database from "better-sqlite3";
import { PluginManager } from "./manager.ts";
import { sailorHomePaths } from "../../runtime/sailor-home.ts";
import {
  isPluginEnabled,
  getPluginRegistryDatabase,
  syncPluginRegistry,
  type PluginSource,
} from "./plugin-registry.ts";

interface PluginManagerLike {
  registerPlugin(plugin: SailorPlugin): void;
}

interface PluginLoaderLogger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string, error?: unknown): void;
}

type PluginImporter = (entrypoint: string) => Promise<SailorPlugin>;

export interface LoadPluginsOptions {
  internalPluginsDir?: string;
  externalPluginsDir?: string;
  registryDb?: Database.Database;
  pluginManager?: PluginManagerLike;
  logger?: PluginLoaderLogger;
  pluginImporter?: PluginImporter;
}

export interface LoadPluginsResult {
  loaded: Record<PluginSource, number>;
  failed: number;
  skippedDisabled: number;
  skippedConflicts: number;
}

const defaultLogger: PluginLoaderLogger = {
  info: (message) => console.log(message),
  warn: (message) => console.warn(message),
  error: (message, error) => console.error(message, error),
};

export function validateManifest(manifest: any): string[] {
  const result = validateSdkManifest(manifest);
  return result.valid ? [] : result.errors;
}

function findPluginEntrypoints(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];

  const entrypoints: string[] = [];
  const walk = (current: string) => {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    const hasManifest = entries.some((entry) => entry.isFile() && entry.name === "manifest.json");

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "_template" || entry.name === "node_modules") continue;
        walk(fullPath);
      } else if (
        hasManifest &&
        entry.isFile() &&
        (entry.name === "index.ts" || entry.name === "index.js")
      ) {
        entrypoints.push(fullPath);
      }
    }
  };

  walk(dir);
  return entrypoints;
}

async function importPlugin(entrypoint: string): Promise<SailorPlugin> {
  const module = await import(pathToFileURL(entrypoint).href);
  const plugin: SailorPlugin = module.default || module[Object.keys(module)[0]];

  if (!plugin.id) throw new Error("Missing plugin id");
  if (!plugin.manifest) throw new Error("Missing manifest");
  if (!plugin.auth) throw new Error("Missing auth provider");
  if (!plugin.methods) throw new Error("Missing methods");

  const validationErrors = validateManifest(plugin.manifest);
  if (validationErrors.length > 0) {
    throw new Error(
      `Manifest validation failed:\n${validationErrors.map((error) => `  - ${error}`).join("\n")}`,
    );
  }

  return plugin;
}

async function loadSource(
  source: PluginSource,
  dir: string,
  options: Required<Pick<LoadPluginsOptions, "registryDb" | "pluginManager" | "logger" | "pluginImporter">>,
  result: LoadPluginsResult,
  internalIds: Set<string>,
): Promise<void> {
  for (const entrypoint of findPluginEntrypoints(dir)) {
    try {
      const plugin = await options.pluginImporter(entrypoint);
      const runtimePlugin =
        source === "external"
          ? {
              ...plugin,
              id: path.basename(path.dirname(entrypoint)),
            }
          : plugin;

      if (source === "external" && internalIds.has(runtimePlugin.id)) {
        result.skippedConflicts += 1;
        options.logger.warn(
          `[SAILOR | PLUGINS]: Skipping external plugin ${runtimePlugin.id}; it conflicts with an internal plugin`,
        );
        continue;
      }

      const version = plugin.manifest.metadata.version as string;
      const installPath = source === "external" ? path.dirname(entrypoint) : null;
      syncPluginRegistry(options.registryDb, {
        id: runtimePlugin.id,
        pluginId: plugin.manifest.metadata.id,
        version,
        source,
        installPath,
        manifestPath: source === "external" ? path.join(path.dirname(entrypoint), "manifest.json") : null,
      });

      if (!isPluginEnabled(options.registryDb, runtimePlugin.id)) {
        result.skippedDisabled += 1;
        options.logger.info(`[SAILOR | PLUGINS]: Skipping disabled plugin ${runtimePlugin.id}`);
        continue;
      }

      options.pluginManager.registerPlugin(runtimePlugin);
      result.loaded[source] += 1;
      if (source === "internal") {
        internalIds.add(runtimePlugin.id);
      }
    } catch (error) {
      result.failed += 1;
      options.logger.error(`[SAILOR | PLUGINS]: Failed to load plugin from ${entrypoint}`, error);
    }
  }
}

export async function loadPlugins(options: LoadPluginsOptions = {}): Promise<LoadPluginsResult> {
  const registryDb = options.registryDb ?? getPluginRegistryDatabase();
  const resolved = {
    registryDb,
    pluginManager: options.pluginManager ?? PluginManager,
    logger: options.logger ?? defaultLogger,
    pluginImporter: options.pluginImporter ?? importPlugin,
  };
  const internalPluginsDir = options.internalPluginsDir ?? sailorHomePaths.internalPluginsDir;
  const externalPluginsDir = options.externalPluginsDir ?? sailorHomePaths.globalPluginsDir;
  const result: LoadPluginsResult = {
    loaded: { internal: 0, external: 0 },
    failed: 0,
    skippedDisabled: 0,
    skippedConflicts: 0,
  };
  const internalIds = new Set<string>();

  await loadSource("internal", internalPluginsDir, resolved, result, internalIds);
  await loadSource("external", externalPluginsDir, resolved, result, internalIds);

  resolved.logger.info(
    `[SAILOR | PLUGINS]: Loaded ${result.loaded.internal} internal and ${result.loaded.external} external plugins`,
  );

  return result;
}
