import type { Nd8HomePaths } from "./nd8-home.ts";

export function formatRuntimeDiagnostics(
  paths: Pick<Nd8HomePaths, "home" | "dataDir" | "globalPluginsDir" | "defaultProfileDir">,
): string[] {
  return [
    `[NOD8 | RUNTIME]: ND8_HOME ${paths.home}`,
    `[NOD8 | RUNTIME]: Data directory ${paths.dataDir}`,
    `[NOD8 | RUNTIME]: External plugins directory ${paths.globalPluginsDir}`,
    `[NOD8 | RUNTIME]: Default profile directory ${paths.defaultProfileDir}`,
  ];
}
