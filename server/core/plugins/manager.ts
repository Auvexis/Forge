import { db } from "../database.ts";
import {
  parsePluginModelToDBRow,
  type PluginDBRow,
  type PluginModel,
} from "../shared/models/plugin.model.ts";
import { GoogleDrivePlugin } from "./google-drive/index.ts";

const plugins = new Map<string, PluginModel>();

export const PluginManager = {
  getPlugins: () => {
    return Array.from(plugins.values());
  },

  getPlugin: (id: string) => {
    const plugin = plugins.get(id);

    if (!plugin) {
      throw new Error("Plugin not found: " + id);
    }

    return plugin;
  },

  registerPlugin: (plugin: PluginModel) => {
    try {
      const existingPlugin = db
        .prepare("SELECT * FROM plugins WHERE id = ?")
        .get(plugin.id) as PluginDBRow | undefined;

      if (existingPlugin) {
        db.prepare(
          `
            UPDATE plugins SET
              icon = @icon,
              name = @name,
              description = @description,
              version = @version,
              author = @author,
              repository = @repository,
              enabled = @enabled,
              config = @config
            WHERE id = @id
          `,
        ).run(parsePluginModelToDBRow(plugin));
      } else {
        db.prepare(
          `
            INSERT INTO plugins (
              id,
              icon,
              name,
              description,
              version,
              author,
              repository,
              enabled,
              config
            ) VALUES (
              @id,
              @icon,
              @name,
              @description,
              @version,
              @author,
              @repository,
              @enabled,
              @config
            )
          `,
        ).run(parsePluginModelToDBRow(plugin));
      }
    } catch (error: any) {
      throw new Error("Error registering plugin: " + error);
    } finally {
      plugins.set(plugin.id, plugin);
      console.log(`[FORGE | PLUGINS]: Registered plugin ${plugin.id}`);
    }
  },

  updatePluginConfig: (id: string, config: Record<string, any>) => {
    try {
      const existingPlugin = db
        .prepare("SELECT * FROM plugins WHERE id = ?")
        .get(id) as PluginDBRow | undefined;

      if (!existingPlugin) {
        throw new Error("Plugin not found: " + id);
      }

      db.prepare(
        `
          UPDATE plugins SET
            config = @config
          WHERE id = @id
        `,
      ).run({ config: JSON.stringify(config), id });
    } catch (error: any) {
      throw new Error("Error updating plugin config: " + error);
    } finally {
      const plugin = plugins.get(id);
      if (plugin) {
        plugin.config = config;
        plugins.set(id, plugin);
        console.log(`[FORGE | PLUGINS]: Updated config for plugin ${id}`);
      }
    }
  },
};

PluginManager.registerPlugin(GoogleDrivePlugin);
