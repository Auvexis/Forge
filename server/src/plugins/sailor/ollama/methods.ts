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
    async listModels(_params, context) {
      const host = getHost(context);
      const response = await fetch(`${host}/api/tags`, {
        method: "GET",
        headers: ollamaHeaders(context),
      });

      return parseOllamaResponse(response);
    },

    async chat(params, context) {
      const { messages, model: paramModel, system: paramSystem, jsonMode } = params;
      const host = getHost(context);
      const model = paramModel;
      const system = paramSystem || context?.credentials.system;

      if (!model || !Array.isArray(messages)) {
        throw new Error("Missing model or messages");
      }

      const response = await fetch(`${host}/api/chat`, {
        method: "POST",
        headers: ollamaHeaders(context),
        body: JSON.stringify({
          model,
          messages: [
            ...(system ? [{ role: "system", content: system }] : []),
            ...messages,
          ],
          stream: false,
          format: jsonMode ? "json" : undefined,
        }),
      });

      return parseOllamaResponse(response);
    },

    async generate(params, context) {
      const { prompt, model, system: paramSystem, jsonMode } = params;

      const host = getHost(context);
      const defaultSystem = context?.credentials.system;

      // Parameter system prompt takes precedence over the default one
      const system = paramSystem || defaultSystem;

      if (!prompt || !model) {
        throw new Error("Missing prompt or model");
      }

      const response = await fetch(`${host}/api/chat`, {
        method: "POST",
        headers: ollamaHeaders(context),
        body: JSON.stringify({
          model,
          messages: [
            ...(system ? [{ role: "system", content: system }] : []),
            {
              role: "user",
              content: prompt,
            },
          ],
          stream: false,
          format: jsonMode ? "json" : undefined,
        }),
      });

      return parseOllamaResponse(response);
    },

    async showModel(params, context) {
      const host = getHost(context);
      const model = params.model;

      if (!model) {
        throw new Error("Missing model");
      }

      const response = await fetch(`${host}/api/show`, {
        method: "POST",
        headers: ollamaHeaders(context),
        body: JSON.stringify({ model }),
      });

      return parseOllamaResponse(response);
    },
  };
}

function getHost(context?: PluginContext): string {
  const host = context?.credentials.host;
  if (!host) {
    return "http://localhost:11434";
  }

  return String(host).trim().replace(/\/+(api|v1)?\/?$/, "");
}

function ollamaHeaders(context?: PluginContext): Record<string, string> {
  const apiKey = context?.credentials.api_key ?? context?.credentials.apiKey ?? context?.credentials.token;
  return {
    "Content-Type": "application/json",
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  };
}

async function parseOllamaResponse(response: Response): Promise<unknown> {
  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.statusText}`);
  }

  return response.json();
}
