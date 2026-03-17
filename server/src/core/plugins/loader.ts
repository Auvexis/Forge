import { fileURLToPath, pathToFileURL } from "url";
import path, { dirname } from "path";
import fs from "fs";
import { PluginManager } from "./manager.ts";

export async function loadPlugins() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  const pluginsDir = path.join(__dirname, "../../plugins");

  async function loadRecursively(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await loadRecursively(fullPath);
      } else if (entry.isFile() && entry.name === "index.ts") {
        try {
          const module = await import(pathToFileURL(fullPath).href);

          const plugin = module.default || module[Object.keys(module)[0]];

          if (!plugin.id) throw new Error("Missing plugin id");
          if (!plugin.methods) throw new Error("Missing methods");
          if (!plugin.manifest) throw new Error("Missing manifest");

          PluginManager.registerPlugin(plugin);
        } catch (err) {
          console.error(`[FORGE]: Failed to load plugin ${fullPath}`, err);
        }
      }
    }
  }

  await loadRecursively(pluginsDir);
}
