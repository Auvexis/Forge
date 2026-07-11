import { PluginManager } from "../plugins/manager.ts";

export function notifyPluginExecutionEnd(executionId: string, status: string): void {
  const terminalStatus =
    status === "SUCCESS" ? "success" : status === "CANCELLED" ? "cancelled" : "failed";

  for (const plugin of PluginManager.getPlugins()) {
    if (plugin.executionLifecycle?.onExecutionEnd) {
      plugin.executionLifecycle.onExecutionEnd(executionId, terminalStatus).catch((error) => {
        console.error(
          `[FABRIC | PLUGINS]: executionLifecycle.onExecutionEnd failed for plugin '${plugin.id}':`,
          error,
        );
      });
    }
  }
}
