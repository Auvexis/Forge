import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveGatewayRoute } from "./routing.js";

describe("gateway routing", () => {
  it("routes backend API and webhook paths to the API service", () => {
    for (const path of [
      "/app/info",
      "/workflows",
      "/webhook/orders",
      "/forms-api/contact",
      "/temporary-forms-api/waiting",
      "/plugins/slack/status",
      "/p/work/webhook/orders",
      "/p/work/forms-api/contact",
      "/p/work/plugin-events/wf/trigger/plugin/name",
    ]) {
      assert.equal(resolveGatewayRoute(path).target, "api", path);
    }
  });

  it("routes SPA and public form pages to the client service", () => {
    for (const path of [
      "/",
      "/home",
      "/forms/contact",
      "/temporary-forms/waiting",
      "/p/work/forms/contact",
      "/p/site-public-id/about",
    ]) {
      assert.equal(resolveGatewayRoute(path).target, "client", path);
    }
  });

  it("routes browser HTML navigation to the client when paths overlap API routes", () => {
    assert.equal(resolveGatewayRoute("/workflows/wf_123", { accept: "text/html" }).target, "client");
    assert.equal(resolveGatewayRoute("/workflows/wf_123").target, "api");
  });
});
