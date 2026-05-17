import type { PluginContext } from "@auvexis/sailor-sdk";

/**
 * Plugin method factory.
 *
 * Each method must match a key declared in manifest.json `methods`.
 * The `params` object will have the keys defined in your method's
 * `parameters.properties` — already type-coerced and validated by Sailor.
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
    async generate(params, context) {
      const { prompt, system: paramSystem, jsonMode } = params;

      const host = context?.credentials.host;
      const model = context?.credentials.model;
      const defaultSystem = context?.credentials.system;

      // Parameter system prompt takes precedence over the default one
      const system = paramSystem || defaultSystem;

      if (!prompt || !host || !model) {
        throw new Error("Missing prompt, host or model");
      }

      const response = await fetch(`${host}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: system,
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          stream: false,
          format: jsonMode ? "json" : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();

      return data;
    },
  };
}
