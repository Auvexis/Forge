import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import Database from "better-sqlite3";

import { loadPlugins, validateManifest } from "./loader.ts";
import type { SailorPlugin } from "@auvexis/sailor-sdk";

function createRegistryDb(): Database.Database {
  const db = new Database(":memory:");
  db.prepare(
    `
    CREATE TABLE registered_plugins (
      id TEXT PRIMARY KEY NOT NULL,
      plugin_id TEXT,
      version TEXT NOT NULL,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      installed_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      source TEXT NOT NULL DEFAULT 'internal',
      install_path TEXT,
      manifest_path TEXT
    )
  `,
  ).run();
  return db;
}

function writePlugin(root: string, id: string, version = "1.0.0"): string {
  const pluginDir = path.join(root, id);
  fs.mkdirSync(pluginDir, { recursive: true });
  fs.writeFileSync(
    path.join(pluginDir, "manifest.json"),
    JSON.stringify({
      metadata: {
        id,
        name: id,
        description: "Test plugin",
        icon: "plug",
        category: "test",
        author: "SAILOR",
        version,
        repository: "",
      },
      methods: {
        ping: {
          metadata: { label: "Ping", description: "Ping" },
          parameters: { type: "object", properties: {} },
          responseSchema: { type: "object", properties: {} },
        },
      },
    }),
  );
  fs.writeFileSync(
    path.join(pluginDir, "index.js"),
    `
      export default {
        id: ${JSON.stringify(id)},
        manifest: {
          metadata: {
            id: ${JSON.stringify(id)},
            name: ${JSON.stringify(id)},
            description: "Test plugin",
            icon: "plug",
            category: "test",
            author: "SAILOR",
            version: ${JSON.stringify(version)},
            repository: ""
          },
          methods: {
            ping: {
              metadata: { label: "Ping", description: "Ping" },
              parameters: { type: "object", properties: {} },
              responseSchema: { type: "object", properties: {} }
            }
          }
        },
        auth: { type: "none" },
        methods: { ping: async () => ({ ok: true }) }
      };
    `,
  );
  return pluginDir;
}

function pluginFromEntrypoint(entrypoint: string, pluginId = path.basename(path.dirname(entrypoint))): SailorPlugin {
  const id = pluginId;
  return {
    id,
    manifest: {
      metadata: {
        id,
        name: id,
        description: "Test plugin",
        icon: "plug",
        category: "test",
        author: "SAILOR",
        version: "1.0.0",
        repository: "",
      },
      methods: {
        ping: {
          metadata: { label: "Ping", description: "Ping" },
          parameters: { type: "object", properties: {} },
          responseSchema: { type: "object", properties: {} },
        },
      },
    },
    auth: { type: "none" },
    methods: { ping: async () => ({ ok: true }) },
  };
}

function createManager() {
  const registered: SailorPlugin[] = [];
  return {
    registered,
    manager: {
      registerPlugin(plugin: SailorPlugin) {
        registered.push(plugin);
      },
    },
  };
}

function createValidManifest(overrides: Record<string, unknown> = {}) {
  return {
    metadata: {
      id: "sdk-contract-plugin",
      name: "SDK Contract Plugin",
      description: "Checks SDK validation",
      icon: "plug",
      category: "test",
      author: "SAILOR",
      version: "1.0.0",
      repository: "",
      ...overrides,
    },
    methods: {
      ping: {
        metadata: { label: "Ping", description: "Ping" },
        parameters: { type: "object", properties: {} },
        responseSchema: { type: "object", properties: {} },
      },
    },
  };
}

function readInternalManifest(pluginId: string) {
  return JSON.parse(fs.readFileSync(path.resolve("src/plugins/sailor", pluginId, "manifest.json"), "utf8")) as any;
}

describe("loadPlugins", () => {
  it("validates manifests using the public Sailor SDK contract", () => {
    const errors = validateManifest(createValidManifest());

    assert.deepEqual(errors, []);
  });

  it("accepts enabled plugin-level chat model agent capabilities", () => {
    const errors = validateManifest(
      createValidManifest({
        agentCapabilities: {
          chatModel: {
            enabled: true,
            adapter: "openai-compatible",
            label: "OpenAI Compatible",
            description: "Provides chat completions through an OpenAI-compatible API endpoint.",
            defaultModel: "gpt-4.1-mini",
            defaultBaseUrl: "https://api.example.com/v1",
            credentialPluginId: "openai",
          },
        },
      }),
    );

    assert.deepEqual(errors, []);
  });

  it("accepts generic plugin-level chat model agent capabilities", () => {
    const errors = validateManifest(
      createValidManifest({
        agentCapabilities: {
          chatModel: {
            enabled: true,
            adapter: "generic",
            label: "Generic Chat Model",
            description: "Provides chat completions through a configurable compatible API endpoint.",
            defaultModel: "llama3.2",
            defaultBaseUrl: "http://localhost:11434/v1",
            credentialPluginId: "sailor-ollama",
          },
        },
      }),
    );

    assert.deepEqual(errors, []);
  });

  it("accepts native Ollama plugin-level chat model agent capabilities", () => {
    const errors = validateManifest(
      createValidManifest({
        agentCapabilities: {
          chatModel: {
            enabled: true,
            adapter: "ollama",
            label: "Ollama Chat Model",
            description: "Provides chat completions through the native Ollama API endpoint.",
            defaultModel: "llama3.2",
            defaultBaseUrl: "http://localhost:11434",
            credentialPluginId: "sailor-ollama",
          },
        },
      }),
    );

    assert.deepEqual(errors, []);
  });

  it("accepts agent tool instructions metadata", () => {
    const manifest = createValidManifest();
    (manifest.methods.ping as any).agentTool = {
      enabled: true,
      name: "sdk_ping",
      description: "Ping the SDK contract plugin from an agent workflow.",
      instructions: "Use this only for fast connectivity checks.",
      sideEffect: "read",
      requiresApproval: false,
      timeoutMs: 30000,
    };

    const errors = validateManifest(manifest);

    assert.deepEqual(errors, []);
  });

  it("accepts agent tool selection metadata", () => {
    const manifest = createValidManifest();
    (manifest.methods.ping as any).agentTool = {
      enabled: true,
      name: "sdk_ping",
      description: "Ping the SDK contract plugin from an agent workflow.",
      sideEffect: "read",
      requiresApproval: false,
      timeoutMs: 30000,
      selection: {
        path: "$",
        labelFields: ["name"],
        valueField: "id",
        mode: "single",
      },
    };

    const errors = validateManifest(manifest);

    assert.deepEqual(errors, []);
  });

  it("rejects enabled chat model agent capabilities missing required display metadata", () => {
    const errors = validateManifest(
      createValidManifest({
        agentCapabilities: {
          chatModel: {
            enabled: true,
          },
        },
      }),
    );

    assert.ok(errors.includes("metadata.agentCapabilities.chatModel must have required property 'adapter'"));
    assert.ok(errors.includes("metadata.agentCapabilities.chatModel must have required property 'label'"));
    assert.ok(errors.includes("metadata.agentCapabilities.chatModel must have required property 'description'"));
    assert.ok(errors.includes("metadata.agentCapabilities.chatModel must have required property 'defaultModel'"));
  });

  it("rejects unsupported chat model agent capability adapters", () => {
    const errors = validateManifest(
      createValidManifest({
        agentCapabilities: {
          chatModel: {
            enabled: true,
            adapter: "not-openai",
            label: "Unsupported Adapter",
            description: "Provides chat completions through an unsupported test adapter.",
            defaultModel: "test-model",
          },
        },
      }),
    );

    assert.ok(
      errors.some((error) => error.includes("openai-compatible") && error.includes("generic") && error.includes("ollama")),
      `Expected an error mentioning supported adapters, got: ${errors.join("; ")}`,
    );
  });

  it("validates internal chat model provider manifests", () => {
    const expectedAdapters: Record<string, string> = {
      openai: "openai-compatible",
      openrouter: "openai-compatible",
      ollama: "ollama",
    };

    for (const [pluginId, adapter] of Object.entries(expectedAdapters)) {
      const manifest = readInternalManifest(pluginId);
      const errors = validateManifest(manifest);

      assert.deepEqual(errors, [], `${pluginId} manifest should validate`);
      assert.equal(manifest.metadata.agentCapabilities?.chatModel?.enabled, true);
      assert.equal(manifest.metadata.agentCapabilities.chatModel.adapter, adapter);
    }
  });

  it("accepts enabled plugin-level memory store agent capabilities", () => {
    const errors = validateManifest(
      createValidManifest({
        agentCapabilities: {
          memoryStore: {
            enabled: true,
            adapter: "plugin-memory-store",
            label: "Plugin Memory",
            description: "Stores and retrieves agent memory through this plugin capability.",
            searchMethodId: "searchAgentMemory",
            putMethodId: "putAgentMemory",
          },
        },
      }),
    );

    assert.deepEqual(errors, []);
  });

  it("rejects enabled memory store agent capabilities missing required metadata", () => {
    const errors = validateManifest(
      createValidManifest({
        agentCapabilities: {
          memoryStore: {
            enabled: true,
          },
        },
      }),
    );

    assert.ok(errors.includes("metadata.agentCapabilities.memoryStore must have required property 'adapter'"));
    assert.ok(errors.includes("metadata.agentCapabilities.memoryStore must have required property 'label'"));
    assert.ok(errors.includes("metadata.agentCapabilities.memoryStore must have required property 'description'"));
    assert.ok(errors.includes("metadata.agentCapabilities.memoryStore must have required property 'searchMethodId'"));
    assert.ok(errors.includes("metadata.agentCapabilities.memoryStore must have required property 'putMethodId'"));
  });

  it("validates internal plugin-backed memory store manifests", () => {
    const manifest = readInternalManifest("postgresql");
    const errors = validateManifest(manifest);

    assert.deepEqual(errors, [], "postgresql manifest should validate");
    assert.equal(manifest.metadata.agentCapabilities?.memoryStore?.enabled, true);
    assert.equal(manifest.metadata.agentCapabilities.memoryStore.adapter, "plugin-memory-store");
    assert.equal(typeof manifest.metadata.agentCapabilities.memoryStore.searchMethodId, "string");
    assert.equal(typeof manifest.metadata.agentCapabilities.memoryStore.putMethodId, "string");
  });

  it("declares agent-enabled tools for internal plugin manifests", () => {
    const internalPluginsDir = path.resolve(import.meta.dirname, "../../../plugins/sailor");
    const manifests = fs
      .readdirSync(internalPluginsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => ({
        pluginName: entry.name,
        manifest: readInternalManifest(entry.name),
      }));

    assert.ok(manifests.length > 0, "expected internal plugin manifests");

    for (const { pluginName, manifest } of manifests) {
      const agentToolMethods = Object.values(manifest.methods ?? {}).filter(
        (method: any) => method.agentTool?.enabled === true,
      );

      assert.ok(agentToolMethods.length > 0, `${pluginName} should expose at least one agent tool`);
    }
  });

  it("accepts light and dark plugin metadata icons through the public Sailor SDK contract", () => {
    const errors = validateManifest({
      metadata: {
        id: "sdk-contract-plugin",
        name: "SDK Contract Plugin",
        description: "Checks SDK icon variants",
        icon: "https://cdn.example.com/icon.svg",
        iconLight: "https://cdn.example.com/icon-light.svg",
        iconDark: "https://cdn.example.com/icon-dark.svg",
        category: "test",
        author: "SAILOR",
        version: "1.0.0",
        repository: "",
      },
      methods: {
        ping: {
          metadata: { label: "Ping", description: "Ping" },
          parameters: { type: "object", properties: {} },
          responseSchema: { type: "object", properties: {} },
        },
      },
    });

    assert.deepEqual(errors, []);
  });

  it("rejects legacy method ui metadata through the public Sailor SDK contract", () => {
    const errors = validateManifest({
      metadata: {
        id: "sdk-contract-plugin",
        name: "SDK Contract Plugin",
        description: "Checks SDK validation",
        icon: "plug",
        category: "test",
        author: "SAILOR",
        version: "1.0.0",
        repository: "",
      },
      methods: {
        ping: {
          metadata: { label: "Ping", description: "Ping" },
          parameters: { type: "object", properties: {} },
          responseSchema: { type: "object", properties: {} },
          ui: { component: "card" },
        },
      },
    });

    assert.deepEqual(errors, ["methods.ping must NOT have additional property 'ui'"]);
  });

  it("loads internal and external plugin sources into the registry", async () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-loader-"));
    const internalDir = path.join(temp, "internal");
    const externalDir = path.join(temp, "external");
    writePlugin(internalDir, "internal-one");
    writePlugin(externalDir, "external-one");
    const db = createRegistryDb();
    const { manager, registered } = createManager();

    const result = await loadPlugins({
      internalPluginsDir: internalDir,
      externalPluginsDir: externalDir,
      registryDb: db,
      pluginManager: manager,
      logger: { info: () => {}, error: () => {}, warn: () => {} },
      pluginImporter: async (entrypoint) => pluginFromEntrypoint(entrypoint),
    });

    assert.equal(result.loaded.internal, 1);
    assert.equal(result.loaded.external, 1);
    assert.deepEqual(registered.map((plugin) => plugin.id).sort(), ["external-one", "internal-one"]);

    const rows = db.prepare("SELECT id, source FROM registered_plugins ORDER BY id").all() as any[];
    assert.deepEqual(rows, [
      { id: "external-one", source: "external" },
      { id: "internal-one", source: "internal" },
    ]);
    db.close();
  });

  it("loads default database canary plugins from internal sailor plugins", async () => {
    const internalDir = path.resolve("src/plugins/sailor");
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-loader-"));
    const externalDir = path.join(temp, "external");
    const db = createRegistryDb();
    const { manager, registered } = createManager();

    await loadPlugins({
      internalPluginsDir: internalDir,
      externalPluginsDir: externalDir,
      registryDb: db,
      pluginManager: manager,
      logger: { info: () => {}, error: () => {}, warn: () => {} },
    });

    const pluginIds = registered.map((plugin) => plugin.id);

    assert.ok(pluginIds.includes("sailor-postgresql"));
    assert.ok(pluginIds.includes("sailor-supabase"));
    db.close();
  });

  it("loads expanded default plugin catalog from internal sailor plugins", async () => {
    const internalDir = path.resolve("src/plugins/sailor");
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-loader-"));
    const externalDir = path.join(temp, "external");
    const db = createRegistryDb();
    const { manager, registered } = createManager();

    await loadPlugins({
      internalPluginsDir: internalDir,
      externalPluginsDir: externalDir,
      registryDb: db,
      pluginManager: manager,
      logger: { info: () => {}, error: () => {}, warn: () => {} },
    });

    const pluginIds = new Set(registered.map((plugin) => plugin.id));
    const expectedIds = [
      "discord",
      "slack",
      "github",
      "notion",
      "trello",
      "jira",
      "google-calendar",
      "openrouter",
      "openai",
      "google-sheets",
    ];

    for (const expectedId of expectedIds) {
      assert.ok(pluginIds.has(expectedId), `${expectedId} should load from default catalog`);
    }
    db.close();
  });

  it("loads external plugins under install id when manifest id conflicts with internal plugin ids", async () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-loader-"));
    const internalDir = path.join(temp, "internal");
    const externalDir = path.join(temp, "external");
    writePlugin(internalDir, "same-plugin");
    writePlugin(externalDir, "same-plugin-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    const db = createRegistryDb();
    const { manager, registered } = createManager();

    const result = await loadPlugins({
      internalPluginsDir: internalDir,
      externalPluginsDir: externalDir,
      registryDb: db,
      pluginManager: manager,
      logger: { info: () => {}, error: () => {}, warn: () => {} },
      pluginImporter: async (entrypoint) => {
        if (entrypoint.includes("same-plugin-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")) {
          return pluginFromEntrypoint(entrypoint, "same-plugin");
        }
        return pluginFromEntrypoint(entrypoint);
      },
    });

    assert.equal(result.loaded.internal, 1);
    assert.equal(result.loaded.external, 1);
    assert.equal(result.skippedConflicts, 0);
    assert.deepEqual(registered.map((plugin) => plugin.id).sort(), [
      "same-plugin",
      "same-plugin-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    ]);

    const row = db
      .prepare("SELECT id, plugin_id FROM registered_plugins WHERE id = ?")
      .get("same-plugin-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa") as any;
    assert.deepEqual(row, {
      id: "same-plugin-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      plugin_id: "same-plugin",
    });
    db.close();
  });

  it("does not try to load package entrypoints inside plugin node_modules", async () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-loader-"));
    const internalDir = path.join(temp, "internal");
    const externalDir = path.join(temp, "external");
    const pluginDir = writePlugin(externalDir, "external-with-deps");
    const packageDir = path.join(pluginDir, "node_modules", "some-package");
    fs.mkdirSync(packageDir, { recursive: true });
    fs.writeFileSync(path.join(packageDir, "index.js"), "export default {};");
    const db = createRegistryDb();
    const { manager, registered } = createManager();
    const seenEntrypoints: string[] = [];

    const result = await loadPlugins({
      internalPluginsDir: internalDir,
      externalPluginsDir: externalDir,
      registryDb: db,
      pluginManager: manager,
      logger: { info: () => {}, error: () => {}, warn: () => {} },
      pluginImporter: async (entrypoint) => {
        seenEntrypoints.push(entrypoint);
        return pluginFromEntrypoint(entrypoint);
      },
    });

    assert.equal(result.loaded.external, 1);
    assert.equal(result.failed, 0);
    assert.equal(registered.length, 1);
    assert.deepEqual(seenEntrypoints, [path.join(pluginDir, "index.js")]);
    db.close();
  });

  it("does not throw when external plugin directory is missing or invalid", async () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-loader-"));
    const internalDir = path.join(temp, "internal");
    const externalDir = path.join(temp, "missing-external");
    const invalidDir = path.join(temp, "invalid");
    fs.mkdirSync(path.join(invalidDir, "bad-plugin"), { recursive: true });
    fs.writeFileSync(path.join(invalidDir, "bad-plugin", "manifest.json"), "{}");
    fs.writeFileSync(path.join(invalidDir, "bad-plugin", "index.js"), "export default {};");
    const db = createRegistryDb();
    const { manager } = createManager();

    const missingResult = await loadPlugins({
      internalPluginsDir: internalDir,
      externalPluginsDir: externalDir,
      registryDb: db,
      pluginManager: manager,
      logger: { info: () => {}, error: () => {}, warn: () => {} },
      pluginImporter: async (entrypoint) => pluginFromEntrypoint(entrypoint),
    });
    const invalidResult = await loadPlugins({
      internalPluginsDir: internalDir,
      externalPluginsDir: invalidDir,
      registryDb: db,
      pluginManager: manager,
      logger: { info: () => {}, error: () => {}, warn: () => {} },
      pluginImporter: async () => {
        throw new Error("bad plugin");
      },
    });

    assert.equal(missingResult.failed, 0);
    assert.equal(invalidResult.failed, 1);
    db.close();
  });
});
