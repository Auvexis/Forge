import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Database from "better-sqlite3";
import Fastify from "fastify";

import type { ApiResponse } from "../../shared/models/api-response.model.ts";
import { PageRepository } from "../modules/pages/page-repository.ts";
import type { SailorPage } from "../modules/pages/page-types.ts";
import pagesRoutes from "./pages.routes.ts";

describe("pages form workflow smoke", () => {
  it("creates a page, publishes it and submits a published action", async () => {
    const db = new Database(":memory:");
    PageRepository.setDatabaseProvider(() => db);
    PageRepository.ensureSchema();
    const app = Fastify({ logger: false });
    await app.register(pagesRoutes, {
      getActiveProfileId: () => "profile_a",
      actionService: {
        submitAction: async () => ({ ok: true, statusCode: 202, executionId: "exec_page_smoke" }),
      },
    });

    const createdResponse = await app.inject({
      method: "POST",
      url: "/pages",
      payload: {
        title: "Lead Capture",
        blocks: [
          {
            id: "form_1",
            tag: "form",
            action: { id: "action_submit", type: "submitForm", formId: "lead-form" },
            children: [],
          },
        ],
      },
    });
    const page = (createdResponse.json() as ApiResponse<SailorPage>).data!;
    await app.inject({ method: "POST", url: `/pages/${page.id}/publish` });

    const submitResponse = await app.inject({
      method: "POST",
      url: "/p/lead-capture/actions/action_submit",
      payload: { email: "ada@example.com" },
    });

    assert.equal(submitResponse.statusCode, 202);
    assert.equal(submitResponse.json().data.executionId, "exec_page_smoke");
  });
});
