import type { PluginContext } from "@auvexis/sailor-sdk";

export function createPostgresqlMethods() {
  return {
    async testConnection(_params: Record<string, never>, _context?: PluginContext) {
      return { ok: true };
    },
  };
}
