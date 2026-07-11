import type { PluginManifest } from "@auvexis/fabric-sdk";

export type PluginInstallSourceType = "repository_url" | "extracted_folder";
export type PluginPreviewStatus = "ready" | "invalid" | "expired";
export type PluginInstallScope = "current_profile" | "selected_profile" | "all_profiles";

export interface PluginInstallSourceMetadata {
  type: PluginInstallSourceType;
  originalValue: string;
  cachedAt: string;
}

export interface ResolvedPluginInstallSource {
  sourceType: PluginInstallSourceType;
  localPath: string;
  metadata: PluginInstallSourceMetadata;
}

export interface LocatedPluginRelease {
  releaseDir: string;
  manifestPath: string;
  entrypointPath: string;
  methodsPath: string;
  packageJsonPath: string;
  packageLockPath: string;
}

export interface ExternalPluginPreview {
  previewId: string;
  status: PluginPreviewStatus;
  manifest: PluginManifest | null;
  methodNames: string[];
  triggerNames: string[];
  authType: string | null;
  warnings: string[];
  errors: string[];
  release: LocatedPluginRelease | null;
  source: PluginInstallSourceMetadata;
  createdAt: string;
  expiresAt: string;
}

export interface PluginInstallResult {
  installId: string;
  pluginId: string;
  version: string;
  installPath: string;
  scope: PluginInstallScope;
  profileId?: string;
  reloadStatus: "loaded" | "restart_required" | "failed";
  error?: string;
}
