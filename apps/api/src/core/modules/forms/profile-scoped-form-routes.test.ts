import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import Fastify from "fastify";

import { initializeProfileDatabases } from "../../database/index.ts";
import {
  resetAppDatabaseProvider,
  setAppDatabaseProvider,
} from "../app/app-repository.ts";
import {
  resetWorkflowDatabaseProvider,
  setWorkflowDatabaseProvider,
  WorkflowRepository,
} from "../workflows/repository.ts";
import { getProfileDatabaseContext } from "../../profiles/profile-database-context.ts";
import { ProfileDatabaseManager } from "../../profiles/profile-database-manager.ts";
import { resolveProfilePaths } from "../../profiles/profile-paths.ts";
import { ProfileScopeRunner } from "../../profiles/profile-scope-runner.ts";
import { ProfileStore } from "../../profiles/profile-store.ts";
import { registerFormRoutes } from "./form-routes.ts";
import type { ApiResponse } from "../../../shared/models/api-response.model.ts";
import type { WorkflowItem } from "../../../shared/models/workflow-types.ts";

function formWorkflow(id: string, name: string): WorkflowItem {
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
      type: "form",
      formSlug: "signup",
      formFields: [{ name: "email", label: "Email", type: "email" }],
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

describe("profile scoped form routes", () => {
  afterEach(() => {
    resetAppDatabaseProvider();
    resetWorkflowDatabaseProvider();
  });

  it("resolves and submits duplicate form slugs through the explicit profile id", async () => {
    const fabricHome = fs.mkdtempSync(path.join(os.tmpdir(), "fabric-scoped-form-"));
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
      WorkflowRepository.saveWorkflow(formWorkflow("wf-default", "Default Signup"));
    });
    runner.runWithProfile("bruno", () => {
      WorkflowRepository.saveWorkflow(formWorkflow("wf-bruno", "Bruno Signup"));
    });

    const app = Fastify({ logger: false });
    const sendResponse = <T>(reply: any, response: ApiResponse<T>) =>
      reply.code(response.status_code).send(response);
    registerFormRoutes(app, {
      clientOrigin: "http://client.test",
      sendResponse,
      profileScopeRunner: runner,
    });

    const definition = await app.inject({
      method: "GET",
      url: "/p/bruno/forms-api/signup",
    });
    assert.equal(definition.statusCode, 200, definition.body);
    assert.equal(definition.json().data.workflowId, "wf-bruno");

    const submit = await app.inject({
      method: "POST",
      url: "/p/bruno/forms-api/signup/submit?mode=prod",
      payload: { email: "bruno@example.com" },
    });
    assert.equal(submit.statusCode, 202, submit.body);

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
