import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import Database from "better-sqlite3";

import { createMigrationEngine } from "../../database/migration-engine.ts";
import {
  AppRepository,
  resetAppDatabaseProvider,
  setAppDatabaseProvider,
} from "../app/app-repository.ts";
import {
  CredentialStore,
  resetCredentialsDatabaseProvider,
  setCredentialsDatabaseProvider,
} from "../plugins/credential-store.ts";
import { PluginManager } from "../plugins/manager.ts";
import { WorkflowLifecycleManager } from "./lifecycle.ts";
import type { WorkflowItem } from "../../../shared/models/workflow-types.ts";

async function createDb(name: "app" | "credentials"): Promise<Database.Database> {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  await createMigrationEngine(db, name).up();
  return db;
}

function pluginWorkflow(): WorkflowItem {
  return {
    metadata: {
      id: "wf-plugin",
      name: "Plugin workflow",
      version: "1.0.0",
      isActive: true,
      isDraft: false,
      public: false,
      createdAt: "2026-05-18T00:00:00.000Z",
    },
    trigger: {
      type: "plugin",
      pluginId: "telegram",
      triggerName: "onMessage",
      webhookPath: "telegram-hook",
    },
    nodes: {},
    edges: [],
    variables: [],
  };
}

describe("WorkflowLifecycleManager", () => {
  afterEach(() => {
    PluginManager.clearPlugins();
    resetAppDatabaseProvider();
    resetCredentialsDatabaseProvider();
  });

  it("passes profile-scoped plugin event URLs and profile credentials to plugin setup", async () => {
    const appDb = await createDb("app");
    const credentialsDb = await createDb("credentials");
    setAppDatabaseProvider(() => appDb);
    setCredentialsDatabaseProvider(() => credentialsDb);
    AppRepository.setSetting("public_url", "https://sailor.example");
    CredentialStore.saveCredentials("telegram", { botToken: "bruno-token" });

    let receivedContext: any = null;
    PluginManager.registerPlugin({
      id: "telegram",
      manifest: {
        metadata: { id: "telegram", name: "Telegram", version: "1.0.0" },
        methods: {},
        triggers: {
          onMessage: {
            metadata: { label: "On Message", description: "On Message" },
          },
        },
      },
      auth: { type: "api_key" },
      methods: {},
      triggers: {
        onMessage: {
          setup: async (context: any) => {
            receivedContext = context;
          },
          teardown: async () => {},
        },
      },
    } as any);

    await WorkflowLifecycleManager.activate(pluginWorkflow(), {
      profileId: "bruno",
    });

    assert.equal(
      receivedContext.webhookUrl,
      "https://sailor.example/p/bruno/plugin-events/wf-plugin/trigger/telegram/onMessage",
    );
    assert.deepEqual(receivedContext.credentials, { botToken: "bruno-token" });

    appDb.close();
    credentialsDb.close();
  });
});
