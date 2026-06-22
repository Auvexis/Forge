import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, it } from "node:test";
import Database from "better-sqlite3";
import Fastify from "fastify";
import multipart from "@fastify/multipart";

import type { ApiResponse } from "../../shared/models/api-response.model.ts";
import { PageRepository } from "../modules/pages/page-repository.ts";
import { SiteRepository } from "../modules/pages/site-repository.ts";
import type { SailorPage } from "../modules/pages/page-types.ts";
import pagesRoutes from "./pages.routes.ts";

async function buildApp() {
  const db = new Database(":memory:");
  const assetStorageRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-page-assets-route-"));
  PageRepository.setDatabaseProvider(() => db);
  SiteRepository.setDatabaseProvider(() => db);
  PageRepository.ensureSchema();
  const app = Fastify({ logger: false });
  await app.register(multipart);
  await app.register(pagesRoutes, {
    getActiveProfileId: () => "profile_a",
    assetStorageRoot,
    actionService: {
      submitAction: async () => ({ ok: true, statusCode: 202, executionId: "exec_page" }),
    },
  });
  return app;
}

describe("pages routes", () => {
  beforeEach(() => {
    PageRepository.resetDatabaseProvider();
    SiteRepository.resetDatabaseProvider();
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
    assert.equal((listResponse.json() as ApiResponse<Array<{ publishedAt: string | null }>>).data?.[0]?.publishedAt, null);

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
    const listResponse = await app.inject({ method: "GET", url: "/pages" });

    assert.equal(response.statusCode, 200);
    assert.match(response.headers["content-type"] ?? "", /text\/html/);
    assert.equal(typeof (listResponse.json() as ApiResponse<Array<{ publishedAt: string }>>).data?.[0]?.publishedAt, "string");
  });

  it("unpublish removes live page and clears list status", async () => {
    const app = await buildApp();
    const createResponse = await app.inject({ method: "POST", url: "/pages", payload: { title: "Landing Page" } });
    const page = (createResponse.json() as ApiResponse<SailorPage>).data!;
    await app.inject({ method: "POST", url: `/pages/${page.id}/publish` });

    const unpublishResponse = await app.inject({ method: "POST", url: `/pages/${page.id}/unpublish` });
    const liveResponse = await app.inject({ method: "GET", url: "/p/landing-page" });
    const listResponse = await app.inject({ method: "GET", url: "/pages" });

    assert.equal(unpublishResponse.statusCode, 200);
    assert.deepEqual(unpublishResponse.json().data, { pageId: page.id, publishedAt: null });
    assert.equal(liveResponse.statusCode, 404);
    assert.equal((listResponse.json() as ApiResponse<Array<{ publishedAt: string | null }>>).data?.[0]?.publishedAt, null);
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

  it("site routes create, list, update, delete, and create site pages", async () => {
    const app = await buildApp();

    const createSiteResponse = await app.inject({
      method: "POST",
      url: "/sites",
      payload: { name: "Marketing Site" },
    });
    const site = createSiteResponse.json().data;

    assert.equal(createSiteResponse.statusCode, 201);
    assert.equal(site.profileId, "profile_a");
    assert.deepEqual(site.files.map((file: { path: string }) => file.path), ["pages", "assets", "js", "css"]);

    const createPageResponse = await app.inject({
      method: "POST",
      url: `/sites/${site.id}/pages`,
      payload: { title: "Home" },
    });
    const page = createPageResponse.json().data;

    assert.equal(createPageResponse.statusCode, 201);
    assert.equal(page.siteId, site.id);

    const listPagesResponse = await app.inject({ method: "GET", url: `/sites/${site.id}/pages` });
    assert.equal(listPagesResponse.statusCode, 200);
    assert.equal(listPagesResponse.json().data.length, 1);

    const updateSiteResponse = await app.inject({
      method: "PUT",
      url: `/sites/${site.id}`,
      payload: { name: "Marketing", slug: "marketing" },
    });
    assert.equal(updateSiteResponse.statusCode, 200);
    assert.equal(updateSiteResponse.json().data.slug, "marketing");

    const listSitesResponse = await app.inject({ method: "GET", url: "/sites" });
    assert.equal(listSitesResponse.statusCode, 200);
    assert.equal(listSitesResponse.json().data.length, 1);

    const deleteSiteResponse = await app.inject({ method: "DELETE", url: `/sites/${site.id}` });
    assert.equal(deleteSiteResponse.statusCode, 200);
  });

  it("site project file routes create, update, delete, upload and serve assets", async () => {
    const app = await buildApp();
    const site = (await app.inject({ method: "POST", url: "/sites", payload: { name: "Assets" } })).json().data;

    const folderResponse = await app.inject({
      method: "POST",
      url: `/sites/${site.id}/files`,
      payload: { path: "assets/brand", kind: "folder" },
    });
    assert.equal(folderResponse.statusCode, 200);
    assert.equal(folderResponse.json().data.files.some((file: { path: string }) => file.path === "assets/brand"), true);

    const fileResponse = await app.inject({
      method: "POST",
      url: `/sites/${site.id}/files`,
      payload: { path: "css/site.css", kind: "file", content: "body{}" },
    });
    assert.equal(fileResponse.statusCode, 200);

    const updateResponse = await app.inject({
      method: "PUT",
      url: `/sites/${site.id}/files`,
      payload: { path: "css/site.css", content: "body{margin:0}" },
    });
    assert.equal(updateResponse.statusCode, 200);
    assert.equal(updateResponse.json().data.files.find((file: { path: string }) => file.path === "css/site.css")?.content, "body{margin:0}");

    const uploadResponse = await app.inject({
      method: "POST",
      url: `/sites/${site.id}/assets`,
      ...multipartPayload("logo.png", "png"),
    });
    assert.equal(uploadResponse.statusCode, 200);
    assert.equal(uploadResponse.json().data.asset.path, "assets/logo.png");

    const assetResponse = await app.inject({ method: "GET", url: `/sites/${site.id}/assets/logo.png` });
    assert.equal(assetResponse.statusCode, 200);
    assert.equal(assetResponse.body, "png");

    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/sites/${site.id}/files`,
      payload: { path: "css/site.css" },
    });
    assert.equal(deleteResponse.statusCode, 200);
    assert.equal(deleteResponse.json().data.files.some((file: { path: string }) => file.path === "css/site.css"), false);
  });

  it("exports and imports a site project into the active profile", async () => {
    const app = await buildApp();
    const site = (await app.inject({ method: "POST", url: "/sites", payload: { name: "Exportable" } })).json().data;
    await app.inject({ method: "POST", url: `/sites/${site.id}/pages`, payload: { title: "Home" } });

    const exportResponse = await app.inject({ method: "GET", url: `/sites/${site.id}/export` });
    assert.equal(exportResponse.statusCode, 200);
    assert.match(exportResponse.headers["content-type"] as string, /application\/zip/);
    assert.match(exportResponse.headers["content-disposition"] as string, /Exportable|exportable/);
    assert.equal(exportResponse.rawPayload.subarray(0, 2).toString("utf8"), "PK");

    const importResponse = await app.inject({
      method: "POST",
      url: "/sites/import",
      payload: {
        manifest: {
          schemaVersion: 1,
          site: { name: "Exportable", slug: "exportable", homePageId: null },
        },
        pages: [],
        files: [],
        assets: [],
      },
    });
    assert.equal(importResponse.statusCode, 201);
    assert.equal(importResponse.json().data.profileId, "profile_a");
    assert.notEqual(importResponse.json().data.id, site.id);
  });
});

function multipartPayload(filename: string, content: string) {
  const boundary = "----sailor-page-asset-test-boundary";
  const body = Buffer.from(
    [
      `--${boundary}`,
      `Content-Disposition: form-data; name="file"; filename="${filename}"`,
      "Content-Type: image/png",
      "",
      content,
      `--${boundary}--`,
      "",
    ].join("\r\n"),
  );

  return {
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
      "content-length": String(body.length),
    },
    payload: body,
  };
}
