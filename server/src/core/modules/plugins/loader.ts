import { fileURLToPath, pathToFileURL } from "url";
import path, { dirname } from "path";
import fs from "fs";
import { PluginManager } from "./manager.ts";
import type { ForgePlugin } from "../../../shared/models/plugin-types.ts";

// ──────────── Manifest Validation ────────────

// Simple structural validator — avoids adding Ajv as a dependency for now.
// Checks the top-level contract that every Forge plugin manifest must satisfy.
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

          const plugin: ForgePlugin =
            module.default || module[Object.keys(module)[0]];

          if (!plugin.id) throw new Error("Missing plugin id");
          if (!plugin.manifest) throw new Error("Missing manifest");
          if (!plugin.auth) throw new Error("Missing auth provider");
          if (!plugin.methods) throw new Error("Missing methods");

          // Validate manifest against Forge plugin contract
          const validationErrors = validateManifest(plugin.manifest, fullPath);
          if (validationErrors.length > 0) {
            throw new Error(
              `Manifest validation failed:\n${validationErrors.map((e) => `  - ${e}`).join("\n")}`
            );
          }

          PluginManager.registerPlugin(plugin);
        } catch (err) {
          console.error(`[FORGE | PLUGINS]: Failed to load plugin from ${fullPath}`, err);
        }
      }
    }
  }

  await loadRecursively(pluginsDir);
}
