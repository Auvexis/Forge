import { pathToFileURL } from "url";
import path from "path";
import fs from "fs";
import AjvModule from "ajv";
import addFormatsModule from "ajv-formats";
import { manifestSchema } from "@auvexis/sailor-sdk";
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

const AjvCtor = AjvModule as any;
const addFormats = addFormatsModule as any;
const triggerDeliveryModes = ["webhook", "polling", "realtime"] as const;
const agentToolSideEffects = [
  "read",
  "write",
  "delete",
  "external-message",
  "external-payment",
  "filesystem",
] as const;

function buildSailorManifestSchema(): any {
  const schema = structuredClone(manifestSchema as any);
  const metadataDefinition = schema.properties.metadata;
  const methodDefinition = schema.$defs.MethodDefinition;
  const triggerDefinition = schema.$defs.TriggerDefinition;

  schema.properties["x-created-by"] = { const: "sailor-plugin-creator" };
  schema.properties["x-creator-version"] = { type: "string" };
  schema.properties["x-editable-low-code"] = { type: "boolean" };

  metadataDefinition.properties.agentCapabilities = {
    type: "object",
    additionalProperties: false,
    properties: {
      chatModel: {
        type: "object",
        required: ["enabled"],
        additionalProperties: false,
        properties: {
          enabled: { type: "boolean" },
          adapter: { enum: ["openai-compatible"] },
          label: { type: "string", minLength: 2, maxLength: 120 },
          description: { type: "string", minLength: 20, maxLength: 1000 },
          defaultModel: { type: "string", minLength: 1, maxLength: 200 },
          defaultBaseUrl: { type: "string", format: "uri" },
          credentialPluginId: { type: "string", minLength: 1, maxLength: 120 },
        },
        if: {
          properties: { enabled: { const: true } },
          required: ["enabled"],
        },
        then: {
          required: ["adapter", "label", "description", "defaultModel"],
        },
      },
      memoryStore: {
        type: "object",
        required: ["enabled"],
        additionalProperties: false,
        properties: {
          enabled: { type: "boolean" },
          adapter: { enum: ["sailor-internal", "plugin-memory-store"] },
          label: { type: "string", minLength: 2, maxLength: 120 },
          description: { type: "string", minLength: 20, maxLength: 1000 },
        },
        if: {
          properties: { enabled: { const: true } },
          required: ["enabled"],
        },
        then: {
          required: ["adapter", "label", "description"],
        },
      },
    },
  };

  triggerDefinition.required = ["metadata", "delivery", "payloadSchema"];
  triggerDefinition.additionalProperties = false;
  triggerDefinition.properties.delivery = {
    type: "object",
    required: ["mode"],
    additionalProperties: false,
    properties: {
      mode: { enum: triggerDeliveryModes },
      requiresPublicUrl: { type: "boolean" },
      recommendedPollSeconds: { type: "integer", minimum: 1 },
    },
  };
  triggerDefinition.properties.payloadSchema = {
    $ref: "#/$defs/JSONSchemaResponse",
  };

  methodDefinition.properties.agentTool = {
    type: "object",
    required: ["enabled"],
    additionalProperties: false,
    properties: {
      enabled: { type: "boolean" },
      name: {
        type: "string",
        pattern: "^[a-z][a-z0-9_]{2,63}$",
      },
      description: {
        type: "string",
        minLength: 20,
        maxLength: 1000,
      },
      sideEffect: { enum: agentToolSideEffects },
      requiresApproval: { type: "boolean" },
      timeoutMs: {
        type: "integer",
        minimum: 1000,
        maximum: 120000,
      },
    },
    if: {
      properties: { enabled: { const: true } },
      required: ["enabled"],
    },
    then: {
      required: ["name", "description", "sideEffect", "requiresApproval", "timeoutMs"],
    },
  };

  return schema;
}

const ajv = new AjvCtor({
  allErrors: true,
  strict: false,
});
addFormats(ajv);
const validateSailorManifest = ajv.compile(buildSailorManifestSchema());

function formatPath(error: any): string {
  const instancePath = String(error.instancePath ?? "").replace(/^\//, "").replace(/\//g, ".");
  if (error.keyword === "required" && typeof error.params?.missingProperty === "string") {
    return instancePath || "root";
  }
  return instancePath || "root";
}

function formatValidationError(error: any): string {
  const path = formatPath(error);

  if (error.keyword === "required" && typeof error.params?.missingProperty === "string") {
    return `${path} must have required property '${error.params.missingProperty}'`;
  }

  if (error.keyword === "pattern" && typeof error.params?.pattern === "string") {
    return `${path} must match pattern ${error.params.pattern}`;
  }

  if (error.keyword === "const") {
    return `${path} must be equal to one of the allowed values`;
  }

  if (error.keyword === "enum" && Array.isArray(error.params?.allowedValues)) {
    return `${path} must be one of ${error.params.allowedValues.join(", ")}`;
  }

  if (error.keyword === "additionalProperties" && typeof error.params?.additionalProperty === "string") {
    return `${path} must NOT have additional property '${error.params.additionalProperty}'`;
  }

  return `${path} ${error.message ?? "is invalid"}`;
}

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
  return validateSailorManifest(manifest)
    ? []
    : (validateSailorManifest.errors ?? []).map(formatValidationError);
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
