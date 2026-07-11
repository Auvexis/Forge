import type { FabricHomePaths } from "./fabric-home.ts";

export function formatRuntimeDiagnostics(
  paths: Pick<FabricHomePaths, "home" | "dataDir" | "globalPluginsDir" | "defaultProfileDir">,
): string[] {
  return [
    `[FABRIC | RUNTIME]: FABRIC_HOME ${paths.home}`,
    `[FABRIC | RUNTIME]: Data directory ${paths.dataDir}`,
    `[FABRIC | RUNTIME]: External plugins directory ${paths.globalPluginsDir}`,
    `[FABRIC | RUNTIME]: Default profile directory ${paths.defaultProfileDir}`,
  ];
}
