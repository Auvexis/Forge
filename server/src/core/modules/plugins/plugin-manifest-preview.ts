import fs from "node:fs";
import type { PluginManifest } from "@auvexis/sailor-sdk";
import { validateManifest } from "./loader.ts";

export interface PluginManifestPreview {
  valid: boolean;
  manifest: PluginManifest | null;
  metadata: PluginManifest["metadata"] | null;
  methodNames: string[];
  methods: Array<{ name: string; label: string; description: string }>;
  triggerNames: string[];
  triggers: Array<{ name: string; label: string; description: string }>;
  authType: string | null;
  warnings: string[];
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
      metadata: null,
      methodNames: [],
      methods: [],
      triggerNames: [],
      triggers: [],
      authType: null,
      warnings: [],
      errors: [error instanceof Error ? error.message : "Failed to read manifest"],
    };
  }

  const errors = validateManifest(parsed);
  if (errors.length > 0) {
    return {
      valid: false,
      manifest: null,
      metadata: null,
      methodNames: [],
      methods: [],
      triggerNames: [],
      triggers: [],
      authType: null,
      warnings: [],
      errors,
    };
  }

  const manifest = parsed as PluginManifest;
  const methodEntries = Object.entries(manifest.methods);
  const triggerEntries = Object.entries(manifest.triggers ?? {});
  const authType = typeof (parsed as any).auth?.type === "string" ? (parsed as any).auth.type : null;

  return {
    valid: true,
    manifest,
    metadata: manifest.metadata,
    methodNames: methodEntries.map(([name]) => name),
    methods: methodEntries.map(([name, method]) => ({
      name,
      label: method.metadata.label,
      description: method.metadata.description,
    })),
    triggerNames: triggerEntries.map(([name]) => name),
    triggers: triggerEntries.map(([name, trigger]) => ({
      name,
      label: trigger.metadata.label,
      description: trigger.metadata.description,
    })),
    authType,
    warnings: authType ? [] : ["Manifest preview does not declare auth type; runtime plugin auth will be checked on load."],
    errors: [],
  };
}
