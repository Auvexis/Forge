import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { pluginsCommandProvider } from "./plugins.commands.ts";
import { CommandExecutor } from "../command-executor.ts";
import { CommandRegistry } from "../command-registry.ts";
import type { CommandExecutionContext } from "../command-types.ts";
import type { Nod8Plugin } from "../../../../shared/models/plugin-types.ts";

function oauthPlugin(id = "generic-oauth"): Nod8Plugin {
  return {
    id,
    manifest: {
      metadata: {
        id,
        name: "Generic OAuth",
        description: "OAuth plugin",
        icon: "plug",
        category: "Test",
        author: "Test",
        version: "1.0.0",
        repository: "",
      },
      methods: {
        listItems: {
          metadata: { label: "List Items", description: "List items" },
          parameters: { type: "object", properties: {} },
          responseSchema: { type: "array" },
          ui: {},
        },
      },
    },
    auth: {
      type: "oauth2",
      credentialSchema: {
        client_id: {
          type: "string",
          inputType: "text",
          label: "Client ID",
          required: true,
        },
      },
      scopes: [],
      getAuthUrl: async () => "https://auth.example/connect",
      exchangeCode: async () => ({ access_token: "token" }),
    },
    methods: {
      listItems: async () => [],
    },
  };
}

function apiKeyPlugin(id = "generic-api-key"): Nod8Plugin {
  return {
    ...oauthPlugin(id),
    manifest: {
      ...oauthPlugin(id).manifest,
      metadata: { ...oauthPlugin(id).manifest.metadata, id, name: "Generic API Key" },
    },
    auth: {
      type: "api_key",
      credentialSchema: {
        api_key: {
          type: "string",
          inputType: "password",
          label: "API Key",
          required: true,
        },
      },
    },
  };
}

function build(context: CommandExecutionContext) {
  const registry = new CommandRegistry();
  registry.registerProvider(pluginsCommandProvider);
  return { registry, executor: new CommandExecutor(registry) };
}

describe("plugins command provider", () => {
  it("indexes installed plugins and manifest methods without provider-specific ids", async () => {
    const context: CommandExecutionContext = {
      services: {
        plugins: {
          listPlugins: () => [oauthPlugin()],
          getPluginStatus: () => "connected",
        },
      },
    };
    const { registry } = build(context);

    const commands = await registry.list(context);

    assert.ok(commands.some((command) => command.id === "plugin.open.generic-oauth"));
    assert.ok(
      commands.some(
        (command) =>
          command.id === "plugin.action.generic-oauth.listitems" &&
          command.keywords?.includes("list items"),
      ),
    );
    assert.equal(commands.some((command) => command.id.includes("telegram")), false);
  });

  it("returns OAuth connect URLs through the generic auth contract", async () => {
    const context: CommandExecutionContext = {
      services: {
        plugins: {
          listPlugins: () => [oauthPlugin()],
          getPlugin: () => oauthPlugin(),
          getPluginStatus: () => "configured",
          getCredentials: () => ({ client_id: "abc" }),
          getRedirectUri: () => "http://localhost/callback",
        },
      },
    };
    const { executor } = build(context);

    const result = await executor.execute("plugin.connect.generic-oauth", context, {});

    assert.deepEqual(result, {
      ok: true,
      message: "Plugin authorization started",
      uiIntent: {
        type: "plugin.oauth.open",
        target: "generic-oauth",
        payload: { url: "https://auth.example/connect" },
      },
    });
  });

  it("returns API-key credential UI intents without storing secrets in the command", async () => {
    const context: CommandExecutionContext = {
      services: {
        plugins: {
          listPlugins: () => [apiKeyPlugin()],
          getPlugin: () => apiKeyPlugin(),
          getPluginStatus: () => "not_configured",
        },
      },
    };
    const { executor } = build(context);

    const result = await executor.execute("plugin.connect.generic-api-key", context, {});

    assert.deepEqual(result.uiIntent, {
      type: "plugin.credentials.open",
      target: "generic-api-key",
    });
    assert.equal(JSON.stringify(result).includes("api_key"), false);
  });

  it("marks disconnect destructive and removes OAuth tokens generically", async () => {
    let deleted = "";
    const context: CommandExecutionContext = {
      services: {
        plugins: {
          listPlugins: () => [oauthPlugin()],
          getPlugin: () => oauthPlugin(),
          getPluginStatus: () => "connected",
          getCredentials: () => ({ client_id: "abc" }),
          getTokens: () => ({ access_token: "token" }),
          deleteTokens: (pluginId: string) => {
            deleted = pluginId;
          },
        },
      },
    };
    const { executor, registry } = build(context);

    const command = (await registry.list(context)).find(
      (descriptor) => descriptor.id === "plugin.disconnect.generic-oauth",
    );
    const result = await executor.execute("plugin.disconnect.generic-oauth", context, {});

    assert.equal(command?.destructive, true);
    assert.equal(deleted, "generic-oauth");
    assert.deepEqual(result.refreshHints, ["plugins"]);
  });

  it("exposes install and uninstall as disabled until a generic registry API exists", async () => {
    const context: CommandExecutionContext = {
      services: {
        plugins: {
          listPlugins: () => [oauthPlugin()],
          getPluginStatus: () => "connected",
        },
      },
    };
    const { registry } = build(context);

    const commands = await registry.list(context);

    assert.equal(commands.find((command) => command.id === "plugin.install")?.availability.enabled, false);
    assert.equal(
      commands.find((command) => command.id === "plugin.uninstall.generic-oauth")?.availability.enabled,
      false,
    );
  });
});
