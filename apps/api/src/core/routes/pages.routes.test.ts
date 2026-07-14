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
import type { FabricPage } from "../modules/pages/page-types.ts";
import pagesRoutes, { type PagesRoutesOptions } from "./pages.routes.ts";

async function buildApp(actionService: PagesRoutesOptions["actionService"] = {
  submitAction: async () => ({ ok: true, statusCode: 202, executionId: "exec_page" }),
  submitPreviewAction: async () => ({ ok: true, statusCode: 202, executionId: "exec_preview" }),
}) {
  const db = new Database(":memory:");
  const assetStorageRoot = fs.mkdtempSync(path.join(os.tmpdir(), "fabric-page-assets-route-"));
  PageRepository.setDatabaseProvider(() => db);
  SiteRepository.setDatabaseProvider(() => db);
  PageRepository.ensureSchema();
  const app = Fastify({ logger: false });
  await app.register(multipart);
  await app.register(pagesRoutes, {
    getActiveProfileId: () => "profile_a",
    assetStorageRoot,
    actionService,
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
    const created = createResponse.json() as ApiResponse<FabricPage>;

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
    assert.equal((updateResponse.json() as ApiResponse<FabricPage>).data?.slug, "home");

    const deleteResponse = await app.inject({ method: "DELETE", url: `/pages/${created.data?.id}` });
    assert.equal(deleteResponse.statusCode, 200);
  });

  it("preview returns HTML with text/html", async () => {
    const app = await buildApp();
    const createResponse = await app.inject({ method: "POST", url: "/pages", payload: { title: "Landing Page" } });
    const page = (createResponse.json() as ApiResponse<FabricPage>).data!;

    const response = await app.inject({ method: "GET", url: `/pages/${page.id}/preview` });

    assert.equal(response.statusCode, 200);
    assert.match(response.headers["content-type"] ?? "", /text\/html/);
    assert.match(response.body, /Landing Page/);
  });

  it("published page returns HTML with text/html", async () => {
    const app = await buildApp();
    const createResponse = await app.inject({ method: "POST", url: "/pages", payload: { title: "Landing Page" } });
    const page = (createResponse.json() as ApiResponse<FabricPage>).data!;
    await app.inject({ method: "POST", url: `/pages/${page.id}/publish` });

    const response = await app.inject({ method: "GET", url: `/p/${page.siteId}/landing-page` });
    const listResponse = await app.inject({ method: "GET", url: "/pages" });

    assert.equal(response.statusCode, 200);
    assert.match(response.headers["content-type"] ?? "", /text\/html/);
    assert.equal(typeof (listResponse.json() as ApiResponse<Array<{ publishedAt: string }>>).data?.[0]?.publishedAt, "string");
  });

  it("published page supports nested public paths scoped by site id", async () => {
    const app = await buildApp();
    const createResponse = await app.inject({ method: "POST", url: "/pages", payload: { title: "Signup", publicPath: "/meusite/signup" } });
    const page = (createResponse.json() as ApiResponse<FabricPage>).data!;
    await app.inject({ method: "POST", url: `/pages/${page.id}/publish` });

    const response = await app.inject({ method: "GET", url: `/p/${page.siteId}/meusite/signup` });

    assert.equal(response.statusCode, 200);
    assert.match(response.body, /Signup/);
  });

  it("unpublish removes live page and clears list status", async () => {
    const app = await buildApp();
    const createResponse = await app.inject({ method: "POST", url: "/pages", payload: { title: "Landing Page" } });
    const page = (createResponse.json() as ApiResponse<FabricPage>).data!;
    await app.inject({ method: "POST", url: `/pages/${page.id}/publish` });

    const unpublishResponse = await app.inject({ method: "POST", url: `/pages/${page.id}/unpublish` });
    const liveResponse = await app.inject({ method: "GET", url: `/p/${page.siteId}/landing-page` });
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
      url: "/p/site_default_profile_a/actions/action_submit/landing-page",
      payload: { email: "ada@example.com" },
    });

    assert.equal(response.statusCode, 202);
    assert.equal(response.json().data.executionId, "exec_page");
  });

  it("published action submits with the project id from the URL", async () => {
    let submittedSiteId = "";
    const app = await buildApp({
      submitAction: async (_profileId, _slug, _actionId, _req, options) => {
        submittedSiteId = options?.siteId ?? "";
        return { ok: true, statusCode: 202, executionId: "exec_page" };
      },
      submitPreviewAction: async () => ({ ok: true, statusCode: 202, executionId: "exec_preview" }),
    });

    const response = await app.inject({
      method: "POST",
      url: "/p/public_marketing/actions/action_submit/landing-page",
      payload: { email: "ada@example.com" },
    });

    assert.equal(response.statusCode, 202);
    assert.equal(submittedSiteId, "public_marketing");
  });

  it("preview action submits against the draft page id", async () => {
    let submittedPageId = "";
    const app = await buildApp({
      submitAction: async () => ({ ok: true, statusCode: 202, executionId: "exec_page" }),
      submitPreviewAction: async (_profileId, pageId) => {
        submittedPageId = pageId;
        return { ok: true, statusCode: 202, executionId: "exec_preview" };
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/pages/page_contact/actions/action_submit",
      payload: { email: "ada@example.com" },
    });

    assert.equal(response.statusCode, 202);
    assert.equal(response.json().data.executionId, "exec_preview");
    assert.equal(submittedPageId, "page_contact");
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
    assert.match(site.publicId, /^[A-Za-z0-9_-]{10}$/);
    assert.deepEqual(site.files.map((file: { path: string }) => file.path), ["pages", "assets"]);

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

  it("published page resolves by the stable project public id", async () => {
    const app = await buildApp();
    const site = (await app.inject({ method: "POST", url: "/sites", payload: { name: "Marketing Site" } })).json().data;
    const createPageResponse = await app.inject({
      method: "POST",
      url: `/sites/${site.id}/pages`,
      payload: { title: "Home" },
    });
    const page = (createPageResponse.json() as ApiResponse<FabricPage>).data!;
    await app.inject({ method: "POST", url: `/pages/${page.id}/publish` });

    const response = await app.inject({ method: "GET", url: `/p/${site.publicId}/home` });

    assert.equal(response.statusCode, 200);
    assert.match(response.body, /Home/);
  });

  it("published pages with slash-prefixed urls resolve by project public id", async () => {
    const app = await buildApp();
    const site = (await app.inject({ method: "POST", url: "/sites", payload: { name: "Auth Site" } })).json().data;
    const login = (await app.inject({
      method: "POST",
      url: `/sites/${site.id}/pages`,
      payload: { title: "Login" },
    })).json().data as FabricPage;
    const register = (await app.inject({
      method: "POST",
      url: `/sites/${site.id}/pages`,
      payload: { title: "Register" },
    })).json().data as FabricPage;
    await app.inject({ method: "PUT", url: `/pages/${login.id}`, payload: { publicPath: "/login" } });
    await app.inject({ method: "PUT", url: `/pages/${register.id}`, payload: { publicPath: "/register" } });
    await app.inject({ method: "POST", url: `/pages/${login.id}/publish` });
    await app.inject({ method: "POST", url: `/pages/${register.id}/publish` });

    const loginResponse = await app.inject({ method: "GET", url: `/p/${site.publicId}/login` });
    const registerResponse = await app.inject({ method: "GET", url: `/p/${site.publicId}/register` });

    assert.equal(loginResponse.statusCode, 200);
    assert.match(loginResponse.body, /Login/);
    assert.equal(registerResponse.statusCode, 200);
    assert.match(registerResponse.body, /Register/);
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
      ...multipartPayload("exportable.fabric-site.zip", exportResponse.rawPayload, "application/zip"),
    });
    assert.equal(importResponse.statusCode, 201);
    assert.equal(importResponse.json().data.profileId, "profile_a");
    assert.notEqual(importResponse.json().data.id, site.id);
  });
});

function multipartPayload(filename: string, content: string | Buffer, contentType = "image/png") {
  const boundary = "----fabric-page-asset-test-boundary";
  const header = Buffer.from(
    [
      `--${boundary}`,
      `Content-Disposition: form-data; name="file"; filename="${filename}"`,
      `Content-Type: ${contentType}`,
      "",
      "",
    ].join("\r\n"),
  );
  const footer = Buffer.from(
    [
      "",
      `--${boundary}--`,
      "",
    ].join("\r\n"),
  );
  const body = Buffer.concat([
    header,
    Buffer.isBuffer(content) ? content : Buffer.from(content),
    footer,
  ]);

  return {
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
      "content-length": String(body.length),
    },
    payload: body,
  };
}
