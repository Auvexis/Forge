import { fileURLToPath, pathToFileURL } from "url";
import path, { dirname } from "path";
import fs from "fs";
import { PluginManager } from "./manager.ts";
import { DatabaseManager } from "../../database/index.ts";
import type { Nod8Plugin } from "../../../shared/models/plugin-types.ts";

// ──────────── Manifest Validation ────────────

// Simple structural validator — avoids adding Ajv as a dependency for now.
// Checks the top-level contract that every Nod8 plugin manifest must satisfy.
function validateManifest(manifest: any, pluginPath: string): string[] {
  const errors: string[] = [];

  if (!manifest.metadata) {
    errors.push("Missing 'metadata' section");
    return errors; // Can't continue without metadata
  }

  const required = ["id", "name", "description", "author", "category", "version"];
  for (const field of required) {
    if (!manifest.metadata[field]) {
      errors.push(`Missing metadata.${field}`);
    }
  }

  // Validate id format: kebab-case
  if (manifest.metadata.id && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(manifest.metadata.id)) {
    errors.push(`metadata.id must be kebab-case (e.g. 'my-plugin'). Got: '${manifest.metadata.id}'`);
  }

  // Validate semver
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

// ──────────── Plugin Registry ────────────

const pluginsDb = DatabaseManager.plugins;

/**
 * Upserts a plugin record in the `registered_plugins` table.
 * On first registration, is_enabled defaults to 1 (enabled).
 * On subsequent boots, we only update the version, preserving the
 * user's enabled/disabled choice.
 */
function syncPluginRegistry(id: string, version: string): void {
  const existing = pluginsDb
    .prepare("SELECT id, is_enabled FROM registered_plugins WHERE id = ?")
    .get(id) as { id: string; is_enabled: number } | undefined;

  if (existing) {
    pluginsDb
      .prepare(
        "UPDATE registered_plugins SET version = ?, updated_at = datetime('now') WHERE id = ?",
      )
      .run(version, id);
  } else {
    pluginsDb
      .prepare(
        "INSERT INTO registered_plugins (id, version) VALUES (?, ?)",
      )
      .run(id, version);
  }
}

/**
 * Returns true if the plugin is enabled in the DB registry.
 * Unknown plugins (not yet registered) are treated as enabled by default.
 */
function isPluginEnabled(id: string): boolean {
  const row = pluginsDb
    .prepare("SELECT is_enabled FROM registered_plugins WHERE id = ?")
    .get(id) as { is_enabled: number } | undefined;

  return row ? row.is_enabled === 1 : true;
}

// ──────────── Loader ────────────

export async function loadPlugins() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  const pluginsDir = path.join(__dirname, "../../../plugins");

  async function loadRecursively(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip the developer template directory
        if (entry.name === "_template") continue;
        await loadRecursively(fullPath);
      } else if (entry.isFile() && entry.name === "index.ts") {
        try {
          const module = await import(pathToFileURL(fullPath).href);

          const plugin: Nod8Plugin =
            module.default || module[Object.keys(module)[0]];

          if (!plugin.id) throw new Error("Missing plugin id");
          if (!plugin.manifest) throw new Error("Missing manifest");
          if (!plugin.auth) throw new Error("Missing auth provider");
          if (!plugin.methods) throw new Error("Missing methods");

          // Validate manifest against Nod8 plugin contract
          const validationErrors = validateManifest(plugin.manifest, fullPath);
          if (validationErrors.length > 0) {
            throw new Error(
              `Manifest validation failed:\n${validationErrors.map((e) => `  - ${e}`).join("\n")}`
            );
          }

          // Sync with plugins.db registry
          const version = plugin.manifest.metadata.version as string;
          syncPluginRegistry(plugin.id, version);

          // Skip loading if disabled by the user in the registry
          if (!isPluginEnabled(plugin.id)) {
            console.log(`[NOD8 | PLUGINS]: Skipping disabled plugin ${plugin.id}`);
            continue;
          }

          PluginManager.registerPlugin(plugin);
        } catch (err) {
          console.error(`[NOD8 | PLUGINS]: Failed to load plugin from ${fullPath}`, err);
        }
      }
    }
  }

  await loadRecursively(pluginsDir);
}
