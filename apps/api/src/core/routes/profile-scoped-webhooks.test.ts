import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import Fastify from "fastify";

import workflowsRoutes from "./workflows.routes.ts";
import { initializeProfileDatabases } from "../database/index.ts";
import { getProfileDatabaseContext } from "../profiles/profile-database-context.ts";
import { ProfileDatabaseManager } from "../profiles/profile-database-manager.ts";
import { resolveProfilePaths } from "../profiles/profile-paths.ts";
import { ProfileScopeRunner } from "../profiles/profile-scope-runner.ts";
import { ProfileStore } from "../profiles/profile-store.ts";
import {
  resetAppDatabaseProvider,
  setAppDatabaseProvider,
} from "../modules/app/app-repository.ts";
import {
  resetWorkflowDatabaseProvider,
  setWorkflowDatabaseProvider,
  WorkflowRepository,
} from "../modules/workflows/repository.ts";
import type { WorkflowItem } from "../../shared/models/workflow-types.ts";

function webhookWorkflow(id: string, name: string): WorkflowItem {
  return {
    metadata: {
      id,
      name,
      version: "1.0.0",
      isActive: true,
      isDraft: false,
      public: false,
      createdAt: "2026-05-18T00:00:00.000Z",
    },
    trigger: {
      type: "webhook",
      webhookSlug: "orders",
      webhookMethods: ["POST"],
    },
    nodes: {},
    edges: [],
    variables: [],
  };
}

async function migrateProfile(fabricHome: string, profileId: string): Promise<void> {
  const manager = new ProfileDatabaseManager();
  manager.open(resolveProfilePaths({ fabricHome, profileId }));
  await initializeProfileDatabases(manager);
  manager.close();
}

describe("profile scoped webhooks", () => {
  afterEach(() => {
    resetAppDatabaseProvider();
    resetWorkflowDatabaseProvider();
  });

  it("resolves duplicate webhook slugs through the explicit profile id", async () => {
    const fabricHome = fs.mkdtempSync(path.join(os.tmpdir(), "fabric-scoped-webhook-"));
    const store = new ProfileStore({ fabricHome });
    store.ensureInitialized();
    store.createProfile({ id: "bruno", name: "Bruno", avatarEmoji: "🧭" });
    const runner = new ProfileScopeRunner({ fabricHome, store });
    setAppDatabaseProvider(() => {
      const context = getProfileDatabaseContext();
      if (!context) throw new Error("Missing profile database context");
      return context.app;
    });
    setWorkflowDatabaseProvider(() => {
      const context = getProfileDatabaseContext();
      if (!context) throw new Error("Missing profile database context");
      return context.workflows;
    });

    await migrateProfile(fabricHome, "default");
    await migrateProfile(fabricHome, "bruno");

    runner.runWithProfile("default", () => {
      WorkflowRepository.saveWorkflow(webhookWorkflow("wf-default", "Default Orders"));
    });
    runner.runWithProfile("bruno", () => {
      WorkflowRepository.saveWorkflow(webhookWorkflow("wf-bruno", "Bruno Orders"));
    });

    const app = Fastify({ logger: false });
    await app.register(workflowsRoutes, { profileScopeRunner: runner });

    const response = await app.inject({
      method: "POST",
      url: "/p/bruno/webhook/orders",
      payload: { ok: true },
    });

    assert.equal(response.statusCode, 202, response.body);

    const brunoExecutions = runner.runWithProfile("bruno", () =>
      WorkflowRepository.getWorkflowExecutions("wf-bruno"),
    );
    const defaultExecutions = runner.runWithProfile("default", () =>
      WorkflowRepository.getWorkflowExecutions("wf-default"),
    );

    assert.equal(brunoExecutions.length, 1);
    assert.equal(defaultExecutions.length, 0);

    await app.close();
  });
});
