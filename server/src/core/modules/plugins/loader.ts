import { pathToFileURL } from "url";
import path from "path";
import fs from "fs";
import type Database from "better-sqlite3";
import { PluginManager } from "./manager.ts";
import { nd8HomePaths } from "../../runtime/nd8-home.ts";
import {
  isPluginEnabled,
  syncPluginRegistry,
  type PluginSource,
} from "./plugin-registry.ts";
import type { Nod8Plugin } from "../../../shared/models/plugin-types.ts";

interface PluginManagerLike {
  registerPlugin(plugin: Nod8Plugin): void;
}

interface PluginLoaderLogger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string, error?: unknown): void;
}

type PluginImporter = (entrypoint: string) => Promise<Nod8Plugin>;

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

// Simple structural validator. Checks the top-level contract every plugin manifest must satisfy.
export function validateManifest(manifest: any): string[] {
  const errors: string[] = [];

  if (!manifest.metadata) {
    errors.push("Missing 'metadata' section");
    return errors;
  }

  const required = ["id", "name", "description", "author", "category", "version"];
  for (const field of required) {
    if (!manifest.metadata[field]) {
      errors.push(`Missing metadata.${field}`);
    }
  }

  if (manifest.metadata.id && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(manifest.metadata.id)) {
    errors.push(`metadata.id must be kebab-case (e.g. 'my-plugin'). Got: '${manifest.metadata.id}'`);
  }

  if (manifest.metadata.version && !/^\d+\.\d+\.\d+$/.test(manifest.metadata.version)) {
    errors.push(`metadata.version must be semver (e.g. '1.0.0'). Got: '${manifest.metadata.version}'`);
  }

  if (!manifest.methods || typeof manifest.methods !== "object") {
    errors.push("Missing or invalid 'methods' section");
    return errors;
  }

  if (Object.keys(manifest.methods).length === 0) {
    errors.push("Plugin must define at least one method");
  }

  for (const [methodName, method] of Object.entries(manifest.methods) as [string, any][]) {
    if (!method.metadata?.label) errors.push(`methods.${methodName}: missing metadata.label`);
    if (!method.parameters || method.parameters.type !== "object") {
      errors.push(`methods.${methodName}: parameters must be a JSON Schema object (type: "object")`);
    }
    if (!method.responseSchema?.type) {
      errors.push(`methods.${methodName}: missing responseSchema.type`);
    }
    if (!method.ui?.component) {
      errors.push(`methods.${methodName}: missing ui.component`);
    }
  }

  return errors;
}

function findPluginEntrypoints(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];

  const entrypoints: string[] = [];
  const walk = (current: string) => {
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "_template") continue;
        walk(fullPath);
      } else if (entry.isFile() && (entry.name === "index.ts" || entry.name === "index.js")) {
        entrypoints.push(fullPath);
      }
    }
  };

  walk(dir);
  return entrypoints;
}

async function importPlugin(entrypoint: string): Promise<Nod8Plugin> {
  const module = await import(pathToFileURL(entrypoint).href);
  const plugin: Nod8Plugin = module.default || module[Object.keys(module)[0]];

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

      if (source === "external" && internalIds.has(plugin.id)) {
        result.skippedConflicts += 1;
        options.logger.warn(
          `[NOD8 | PLUGINS]: Skipping external plugin ${plugin.id}; it conflicts with an internal plugin`,
        );
        continue;
      }

      const version = plugin.manifest.metadata.version as string;
      const installPath = source === "external" ? path.dirname(entrypoint) : null;
      syncPluginRegistry(options.registryDb, {
        id: plugin.id,
        version,
        source,
        installPath,
        manifestPath: source === "external" ? path.join(path.dirname(entrypoint), "manifest.json") : null,
      });

      if (!isPluginEnabled(options.registryDb, plugin.id)) {
        result.skippedDisabled += 1;
        options.logger.info(`[NOD8 | PLUGINS]: Skipping disabled plugin ${plugin.id}`);
        continue;
      }

      options.pluginManager.registerPlugin(plugin);
      result.loaded[source] += 1;
      if (source === "internal") {
        internalIds.add(plugin.id);
      }
    } catch (error) {
      result.failed += 1;
      options.logger.error(`[NOD8 | PLUGINS]: Failed to load plugin from ${entrypoint}`, error);
    }
  }
}

export async function loadPlugins(options: LoadPluginsOptions = {}): Promise<LoadPluginsResult> {
  const registryDb = options.registryDb ?? (await import("../../database/index.ts")).DatabaseManager.plugins;
  const resolved = {
    registryDb,
    pluginManager: options.pluginManager ?? PluginManager,
    logger: options.logger ?? defaultLogger,
    pluginImporter: options.pluginImporter ?? importPlugin,
  };
  const internalPluginsDir = options.internalPluginsDir ?? nd8HomePaths.internalPluginsDir;
  const externalPluginsDir = options.externalPluginsDir ?? nd8HomePaths.globalPluginsDir;
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
    `[NOD8 | PLUGINS]: Loaded ${result.loaded.internal} internal and ${result.loaded.external} external plugins`,
  );

  return result;
}
