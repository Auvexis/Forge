import { db } from "../../database.ts";
import type { PluginExportModel, PluginModel } from "../../shared/models/plugin.model.ts";
import manifest from "./manifest.json" with { type: "json" };
import { GoogleDriveMethods } from "./methods.ts";

const plugin = db
  .prepare(`SELECT * FROM plugins WHERE id = ?`)
  .get("google-drive") as PluginModel | undefined;

export const GoogleDrivePlugin: PluginExportModel = {
  id: "google-drive",
  name: "Google Drive",
  version: "1.0.0",
  enabled: true,
  methods: GoogleDriveMethods,
  manifest,
  config: plugin?.config ? JSON.parse(plugin.config) : {},
};
