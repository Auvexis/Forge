import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";
import { readPluginManifestPreview } from "../plugin-manifest-preview.ts";
import { syncPluginRegistry } from "../plugin-registry.ts";
import { sailorHomePaths, type SailorHomePaths } from "../../../runtime/sailor-home.ts";
import { applyPluginProfileScope } from "./plugin-profile-scope-service.ts";
import { installPluginDependencies } from "./plugin-dependency-installer.ts";
import { generatePluginInstallId } from "./plugin-install-id-generator.ts";
import { validatePluginInstallRelease } from "./plugin-install-validator.ts";
import { reloadExternalPlugin, type RuntimeReloadResult } from "./plugin-runtime-reload-service.ts";
import type { PluginInstallResult, PluginInstallScope, PluginInstallSourceMetadata } from "./types.ts";
import type { ProfileId } from "../../../profiles/profile-types.ts";

export interface ExternalPluginInstallerPaths {
  globalPluginsDir: string;
  pluginCacheDir: string;
  logsDir: string;
  profilesDir: string;
  defaultProfileDir: string;
}

export interface InstallExternalPluginInput {
  releaseDir: string;
  source: PluginInstallSourceMetadata;
  scope: PluginInstallScope;
  currentProfileId?: ProfileId;
  selectedProfileId?: ProfileId;
  paths?: ExternalPluginInstallerPaths;
  registryDb: Database.Database;
  installIdGenerator?: (pluginId: string, pluginsDir: string) => string;
  dependencyInstaller?: (pluginDir: string, installId: string, logsDir: string) => void;
  runtimeReload?: (pluginDir: string, installId: string) => RuntimeReloadResult | Promise<RuntimeReloadResult>;
}

function installerPaths(paths: SailorHomePaths): ExternalPluginInstallerPaths {
  return {
    globalPluginsDir: paths.globalPluginsDir,
    pluginCacheDir: paths.pluginCacheDir,
    logsDir: paths.logsDir,
    profilesDir: paths.profilesDir,
    defaultProfileDir: paths.defaultProfileDir,
  };
}

function copyReleaseToStaging(releaseDir: string, stagingDir: string): void {
  fs.rmSync(stagingDir, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(stagingDir), { recursive: true });
  fs.cpSync(releaseDir, stagingDir, { recursive: true, verbatimSymlinks: false });
}

function ensureDestinationFree(destination: string): void {
  if (fs.existsSync(destination)) {
    throw new Error(`External plugin install destination already exists: ${destination}`);
  }
}

export function installExternalPlugin(input: InstallExternalPluginInput): PluginInstallResult {
  const paths = input.paths ?? installerPaths(sailorHomePaths);
  const release = {
    releaseDir: input.releaseDir,
    manifestPath: path.join(input.releaseDir, "manifest.json"),
    entrypointPath: path.join(input.releaseDir, "index.js"),
    methodsPath: path.join(input.releaseDir, "methods.js"),
    packageJsonPath: path.join(input.releaseDir, "package.json"),
    packageLockPath: path.join(input.releaseDir, "package-lock.json"),
  };
  validatePluginInstallRelease(release);

  const preview = readPluginManifestPreview(release.manifestPath);
  if (!preview.valid || !preview.manifest) {
    throw new Error(`Cannot install invalid plugin manifest: ${preview.errors.join("; ")}`);
  }

  const pluginId = preview.manifest.metadata.id;
  const version = preview.manifest.metadata.version;
  const installIdGenerator = input.installIdGenerator ?? generatePluginInstallId;
  const installId = installIdGenerator(pluginId, paths.globalPluginsDir);
  const stagingDir = path.join(paths.pluginCacheDir, "staging", installId);
  const destination = path.join(paths.globalPluginsDir, installId);
  ensureDestinationFree(destination);

  try {
    copyReleaseToStaging(input.releaseDir, stagingDir);
    (input.dependencyInstaller ?? installPluginDependencies)(stagingDir, installId, path.join(paths.logsDir, "plugin-installs"));
    fs.mkdirSync(paths.globalPluginsDir, { recursive: true });
    fs.renameSync(stagingDir, destination);
  } catch (error) {
    fs.rmSync(path.join(paths.pluginCacheDir, "staging"), { recursive: true, force: true });
    throw error;
  }

  syncPluginRegistry(input.registryDb, {
    id: installId,
    pluginId,
    version,
    source: "external",
    installPath: destination,
    manifestPath: path.join(destination, "manifest.json"),
  });

  applyPluginProfileScope({
    profilesDir: paths.profilesDir,
    defaultProfileDir: paths.defaultProfileDir,
    scope: input.scope,
    currentProfileId: input.currentProfileId,
    selectedProfileId: input.selectedProfileId,
    reference: { id: installId, source: "external", version },
  });

  let reloadResult: RuntimeReloadResult = { status: "restart_required" };
  const runtimeReload = input.runtimeReload ?? reloadExternalPlugin;
  const maybeReload = runtimeReload(destination, installId);
  if ("then" in Object(maybeReload)) {
    reloadResult = { status: "restart_required" };
  } else {
    reloadResult = maybeReload as RuntimeReloadResult;
  }

  return {
    installId,
    pluginId,
    version,
    installPath: destination,
    scope: input.scope,
    profileId: input.scope === "selected_profile" ? input.selectedProfileId : input.currentProfileId,
    reloadStatus: reloadResult.status,
    error: reloadResult.error,
  };
}
