import type { SailorHomePaths } from "./sailor-home.ts";

export function formatRuntimeDiagnostics(
  paths: Pick<SailorHomePaths, "home" | "dataDir" | "globalPluginsDir" | "defaultProfileDir">,
): string[] {
  return [
    `[SAILOR | RUNTIME]: SAILOR_HOME ${paths.home}`,
    `[SAILOR | RUNTIME]: Data directory ${paths.dataDir}`,
    `[SAILOR | RUNTIME]: External plugins directory ${paths.globalPluginsDir}`,
    `[SAILOR | RUNTIME]: Default profile directory ${paths.defaultProfileDir}`,
  ];
}
