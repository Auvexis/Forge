import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { pluginsCommandProvider } from "./plugins.commands.ts";
import { CommandExecutor } from "../command-executor.ts";
import { CommandRegistry } from "../command-registry.ts";
import type { CommandExecutionContext } from "../command-types.ts";
import type { FabricPlugin } from "@auvexis/fabric-sdk";

function oauthPlugin(id = "generic-oauth"): FabricPlugin {
  return {
    id,
    manifest: {
      metadata: {
        id,
        name: "Generic OAuth",
        description: "OAuth plugin",
        icon: "plug",
        iconLight: "plug-light.svg",
        iconDark: "plug-dark.svg",
        categories: ["Core"],
        author: "Test",
        version: "1.0.0",
        repository: "",
      },
      methods: {
        listItems: {
          metadata: { label: "List Items", description: "List items" },
          parameters: { type: "object", properties: {} },
          responseSchema: { type: "array" },
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

function apiKeyPlugin(id = "generic-api-key"): FabricPlugin {
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
  it("indexes installed plugins as drilldown entries", async () => {
    const context: CommandExecutionContext = {
      services: {
        plugins: {
          listPlugins: () => [oauthPlugin()],
          getPluginStatus: () => "connected",
        },
      },
    };
    const { registry, executor } = build(context);

    const commands = await registry.list(context);

    assert.ok(commands.some((command) => command.id === "plugin.entry.generic-oauth"));
    const entry = commands.find((command) => command.id === "plugin.entry.generic-oauth");
    assert.equal(entry?.iconLight, "plug-light.svg");
    assert.equal(entry?.iconDark, "plug-dark.svg");
    assert.equal(commands.some((command) => command.id.includes("telegram")), false);

    const result = await executor.execute("plugin.entry.generic-oauth", context, {});
    assert.equal(result.drilldown?.type, "list");
    if (result.drilldown?.type === "list") {
      assert.ok(result.drilldown.commands.some(c => c.id === "plugin.open.generic-oauth"));
      const openCommand = result.drilldown.commands.find(c => c.id === "plugin.open.generic-oauth");
      assert.equal(openCommand?.iconLight, "plug-light.svg");
      assert.equal(openCommand?.iconDark, "plug-dark.svg");
      assert.ok(result.drilldown.commands.some(c => c.id === "plugin.methods.generic-oauth"));
    }
  });

  it("returns OAuth connect URLs through the generic auth contract via sub-command", async () => {
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
      message: "Plugin credentials requested",
      uiIntent: {
        type: "plugin.credentials.open",
        target: "generic-oauth",
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

    // Get the sub-command from the drilldown list of the entry command
    const entryResult = await executor.execute("plugin.entry.generic-oauth", context, {});
    const command = entryResult.drilldown?.type === "list" 
      ? entryResult.drilldown.commands.find(c => c.id === "plugin.disconnect.generic-oauth")
      : undefined;

    const result = await executor.execute("plugin.disconnect.generic-oauth", context, {});

    assert.equal(command?.destructive, true);
    assert.equal(deleted, "generic-oauth");
    assert.deepEqual(result.refreshHints, ["plugins"]);
  });

  it("opens the external installer and keeps uninstall disabled until a generic uninstall API exists", async () => {
    const context: CommandExecutionContext = {
      services: {
        plugins: {
          listPlugins: () => [oauthPlugin()],
          getPluginStatus: () => "connected",
        },
      },
    };
    const { registry, executor } = build(context);

    const commands = await registry.list(context);
    const installCommand = commands.find((command) => command.id === "plugin.install");
    assert.equal(installCommand?.availability.enabled, true);
    assert.equal(
      installCommand?.description,
      "Open the Plugin Installer for repository URLs or local plugin folders",
    );
    assert.deepEqual(await executor.execute("plugin.install", context, {}), {
      ok: true,
      uiIntent: { type: "plugin-installer.open" },
    });

    const entryResult = await executor.execute("plugin.entry.generic-oauth", context, {});
    const uninstallCommand = entryResult.drilldown?.type === "list"
      ? entryResult.drilldown.commands.find(c => c.id === "plugin.uninstall.generic-oauth")
      : undefined;

    assert.equal(uninstallCommand?.availability.enabled, false);
  });
});
