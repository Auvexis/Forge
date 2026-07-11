import type { PluginContext } from "@auvexis/fabric-sdk";

/**
 * Plugin method factory.
 *
 * Each method must match a key declared in manifest.json `methods`.
 * The `params` object will have the keys defined in your method's
 * `parameters.properties` — already type-coerced and validated by Fabric.
 *
 * The `context` object provides:
 *   - context.credentials — The plugin's stored/ENV credentials
 *   - context.tokens     — OAuth2 tokens (if auth.type === "oauth2")
 */
export function createMethods(): Record<
  string,
  (params: any, context?: PluginContext) => Promise<any>
> {
  return {
    /**
     * listItems — corresponds to manifest.methods.listItems
     */
    async listItems(params, context) {
      const { query, maxResults = 20 } = params;

      // Replace this with your actual API call
      // const apiKey = context?.credentials?.api_key;
      const results = [
        { id: "1", name: "Example Item 1", createdAt: new Date().toISOString() },
        { id: "2", name: "Example Item 2", createdAt: new Date().toISOString() },
      ];

      return results.slice(0, maxResults);
    },

    /**
     * getItem — corresponds to manifest.methods.getItem
     */
    async getItem(params, context) {
      const { id } = params;

      // Replace this with your actual API call
      return {
        id,
        name: `Item ${id}`,
        description: "Full details for this item.",
        createdAt: new Date().toISOString(),
      };
    },
  };
}
