import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import Database from "better-sqlite3";
import Fastify from "fastify";

import type { ApiResponse } from "../../shared/models/api-response.model.ts";
import { PageRepository } from "../modules/pages/page-repository.ts";
import type { SailorPage } from "../modules/pages/page-types.ts";
import pagesRoutes from "./pages.routes.ts";

async function buildApp() {
  const db = new Database(":memory:");
  PageRepository.setDatabaseProvider(() => db);
  PageRepository.ensureSchema();
  const app = Fastify({ logger: false });
  await app.register(pagesRoutes, {
    getActiveProfileId: () => "profile_a",
    actionService: {
      submitAction: async () => ({ ok: true, statusCode: 202, executionId: "exec_page" }),
    },
  });
  return app;
}

describe("pages routes", () => {
  beforeEach(() => {
    PageRepository.resetDatabaseProvider();
  });

  it("CRUD returns API response shape", async () => {
    const app = await buildApp();

    const createResponse = await app.inject({
      method: "POST",
      url: "/pages",
      payload: { title: "Landing Page" },
    });
    const created = createResponse.json() as ApiResponse<SailorPage>;

    assert.equal(createResponse.statusCode, 201);
    assert.equal(created.error, null);
    assert.equal(created.data?.profileId, "profile_a");

    const listResponse = await app.inject({ method: "GET", url: "/pages" });
    assert.equal(listResponse.statusCode, 200);
    assert.equal((listResponse.json() as ApiResponse<unknown[]>).data?.length, 1);

    const getResponse = await app.inject({ method: "GET", url: `/pages/${created.data?.id}` });
    assert.equal(getResponse.statusCode, 200);

    const updateResponse = await app.inject({
      method: "PUT",
      url: `/pages/${created.data?.id}`,
      payload: { title: "Home", slug: "home" },
    });
    assert.equal(updateResponse.statusCode, 200);
    assert.equal((updateResponse.json() as ApiResponse<SailorPage>).data?.slug, "home");

    const deleteResponse = await app.inject({ method: "DELETE", url: `/pages/${created.data?.id}` });
    assert.equal(deleteResponse.statusCode, 200);
  });

  it("preview returns HTML with text/html", async () => {
    const app = await buildApp();
    const createResponse = await app.inject({ method: "POST", url: "/pages", payload: { title: "Landing Page" } });
    const page = (createResponse.json() as ApiResponse<SailorPage>).data!;

    const response = await app.inject({ method: "GET", url: `/pages/${page.id}/preview` });

    assert.equal(response.statusCode, 200);
    assert.match(response.headers["content-type"] ?? "", /text\/html/);
    assert.match(response.body, /Landing Page/);
  });

  it("published page returns HTML with text/html", async () => {
    const app = await buildApp();
    const createResponse = await app.inject({ method: "POST", url: "/pages", payload: { title: "Landing Page" } });
    const page = (createResponse.json() as ApiResponse<SailorPage>).data!;
    await app.inject({ method: "POST", url: `/pages/${page.id}/publish` });

    const response = await app.inject({ method: "GET", url: "/p/landing-page" });

    assert.equal(response.statusCode, 200);
    assert.match(response.headers["content-type"] ?? "", /text\/html/);
  });

  it("action submit returns 202", async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/p/landing-page/actions/action_submit",
      payload: { email: "ada@example.com" },
    });

    assert.equal(response.statusCode, 202);
    assert.equal(response.json().data.executionId, "exec_page");
  });

  it("invalid payload returns 400 with no stack trace", async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/pages",
      payload: { title: "" },
    });
    const body = response.json() as ApiResponse<null>;

    assert.equal(response.statusCode, 400);
    assert.doesNotMatch(body.error ?? "", /at .*\.ts/);
  });

  it("missing page returns 404", async () => {
    const app = await buildApp();

    const response = await app.inject({ method: "GET", url: "/pages/missing" });

    assert.equal(response.statusCode, 404);
  });
});
