import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import Database from "better-sqlite3";
import Fastify from "fastify";

import { createMigrationEngine } from "../database/migration-engine.ts";
import {
  resetWorkflowDatabaseProvider,
  setWorkflowDatabaseProvider,
  WorkflowRepository,
} from "../modules/workflows/repository.ts";
import type { WorkflowItem, WorkflowTrigger } from "../../shared/models/workflow-types.ts";
import workflowsRoutes from "./workflows.routes.ts";

async function createWorkflowDb(): Promise<Database.Database> {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  await createMigrationEngine(db, "workflows").up();
  return db;
}

function workflow(
  id: string,
  name: string,
  trigger: WorkflowTrigger,
  overrides: Partial<WorkflowItem["metadata"]> = {},
): WorkflowItem {
  return {
    metadata: {
      id,
      name,
      version: "1.0.0",
      isActive: true,
      isDraft: false,
      public: false,
      createdAt: "2026-06-30T00:00:00.000Z",
      ...overrides,
    },
    trigger,
    nodes: {
      manualTrigger: {
        type: "trigger",
        name: "Manual Intake",
        trigger: {
          type: "manual",
          schema: {
            type: "object",
            properties: { query: { type: "string" } },
            required: ["query"],
          },
        },
      },
      formTrigger: {
        type: "trigger",
        name: "Lead Form",
        trigger: {
          type: "form",
          formFields: [
            { name: "email", label: "Email", type: "email", required: true },
            { name: "age", label: "Age", type: "number" },
          ],
        },
      },
      webhookTrigger: {
        type: "trigger",
        name: "Order Webhook",
        trigger: {
          type: "webhook",
          webhookSlug: "orders",
          webhookBodySchema: {
            orderId: { type: "string", required: true, description: "Order id" },
            total: { type: "number" },
          },
        },
      },
      cronTrigger: {
        type: "trigger",
        name: "Cron",
        trigger: { type: "cron", cronExpression: "* * * * *" },
      },
      disabledFormTrigger: {
        type: "trigger",
        name: "Disabled Form",
        disabled: true,
        trigger: {
          type: "form",
          formFields: [{ name: "hidden", label: "Hidden", type: "text" }],
        },
      },
    },
    edges: [],
    variables: [],
  };
}

describe("callable workflows routes", () => {
  afterEach(() => {
    resetWorkflowDatabaseProvider();
  });

  it("lists published workflows with normalized callable trigger metadata", async () => {
    const db = await createWorkflowDb();
    setWorkflowDatabaseProvider(() => db);
    WorkflowRepository.saveWorkflow(workflow("wf-callable", "Callable Ops", { type: "manual" }));
    WorkflowRepository.saveWorkflow(workflow("wf-draft", "Draft Ops", { type: "manual" }, { isDraft: true }));
    WorkflowRepository.saveWorkflow(workflow("wf-inactive", "Inactive Ops", { type: "manual" }, { isActive: false }));

    const app = Fastify({ logger: false });
    await app.register(workflowsRoutes);

    const response = await app.inject({
      method: "GET",
      url: "/workflows/callable",
    });

    assert.equal(response.statusCode, 200, response.body);
    const body = response.json();
    assert.equal(body.status_code, 200);
    assert.equal(body.error, null);
    assert.deepEqual(body.data.map((item: any) => item.id), ["wf-callable"]);

    const [callable] = body.data;
    assert.equal(callable.name, "Callable Ops");
    assert.deepEqual(
      callable.triggers.map((trigger: any) => ({
        id: trigger.id,
        name: trigger.name,
        type: trigger.type,
        icon: trigger.icon,
      })),
      [
        { id: "manualTrigger", name: "Manual Intake", type: "manual", icon: "play-circle" },
        { id: "formTrigger", name: "Lead Form", type: "form", icon: "clipboard-list" },
        { id: "webhookTrigger", name: "Order Webhook", type: "webhook", icon: "webhook" },
      ],
    );
    assert.deepEqual(callable.triggers[0].schema, {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    });
    assert.deepEqual(callable.triggers[1].schema, {
      type: "object",
      properties: {
        email: { type: "string", title: "Email", format: "email" },
        age: { type: "number", title: "Age" },
      },
      required: ["email"],
    });
    assert.deepEqual(callable.triggers[2].schema, {
      type: "object",
      properties: {
        orderId: { type: "string", description: "Order id" },
        total: { type: "number" },
      },
      required: ["orderId"],
    });

    await app.close();
    db.close();
  });

  it("normalizes manual trigger editor field maps into callable JSON schema", async () => {
    const db = await createWorkflowDb();
    setWorkflowDatabaseProvider(() => db);
    WorkflowRepository.saveWorkflow({
      ...workflow("wf-manual-map", "Manual Map", { type: "manual" }),
      nodes: {
        manualTrigger: {
          type: "trigger",
          name: "Manual Intake",
          trigger: {
            type: "manual",
            schema: {
              email: { type: "string", required: true },
              count: { type: "number", required: false },
            },
          },
        },
      },
    });

    const app = Fastify({ logger: false });
    await app.register(workflowsRoutes);

    const response = await app.inject({
      method: "GET",
      url: "/workflows/callable",
    });

    assert.equal(response.statusCode, 200, response.body);
    const body = response.json();
    const [callable] = body.data;
    assert.deepEqual(callable.triggers[0].schema, {
      type: "object",
      properties: {
        email: { type: "string" },
        count: { type: "number" },
      },
      required: ["email"],
    });

    await app.close();
    db.close();
  });
});
