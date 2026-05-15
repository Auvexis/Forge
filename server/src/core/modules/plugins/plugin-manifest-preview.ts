import fs from "node:fs";
import type { PluginManifest } from "../../../shared/models/plugin-types.ts";
import { validateManifest } from "./loader.ts";

export interface PluginManifestPreview {
  valid: boolean;
  manifest: PluginManifest | null;
  methodNames: string[];
  errors: string[];
}

export function readPluginManifestPreview(manifestPath: string): PluginManifestPreview {
  let parsed: unknown;

  try {
    parsed = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (error) {
    return {
      valid: false,
      manifest: null,
      methodNames: [],
      errors: [error instanceof Error ? error.message : "Failed to read manifest"],
    };
  }

  const errors = validateManifest(parsed);
  if (errors.length > 0) {
    return {
      valid: false,
      manifest: null,
      methodNames: [],
      errors,
    };
  }

  const manifest = parsed as PluginManifest;
  return {
    valid: true,
    manifest,
    methodNames: Object.keys(manifest.methods),
    errors: [],
  };
}
