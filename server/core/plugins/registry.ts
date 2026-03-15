import type { PluginExportModel } from "../shared/models/plugin.model.ts";
import { GoogleDrivePlugin } from "./google-drive/index.ts";

export const PluginRegistry: Record<string, PluginExportModel> = {
  [GoogleDrivePlugin.id]: GoogleDrivePlugin,
};
