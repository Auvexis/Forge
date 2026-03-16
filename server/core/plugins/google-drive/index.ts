import { db } from "../../database.ts";
import type { PluginModel, PluginDBRow } from "../../shared/models/plugin.model.ts";
import manifest from "./manifest.json" with { type: "json" };
import { GoogleDriveMethods } from "./methods.ts";

const plugin = db
  .prepare(`SELECT * FROM plugins WHERE id = ?`)
  .get("google-drive") as PluginDBRow | undefined;

export const GoogleDrivePlugin: PluginModel = {
  id: "google-drive",
  icon: "",
  name: "Google Drive",
  description: "Google Drive plugin",
  version: "1.0.0",
  author: "Forge",
  repository: "https://github.com/Auvexis/Forge",
  enabled: true,
  methods: GoogleDriveMethods,
  manifest,
  config: plugin?.config ? JSON.parse(plugin.config) : {},
};
