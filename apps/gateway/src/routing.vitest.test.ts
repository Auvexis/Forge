import { describe, expect, it } from "vitest";

import { resolveGatewayRoute } from "./routing.js";

describe("resolveGatewayRoute", () => {
  it("routes API and profile-scoped API paths to the backend", () => {
    expect(resolveGatewayRoute("/workflows").target).toBe("api");
    expect(resolveGatewayRoute("/p/main/webhook/orders").target).toBe("api");
    expect(resolveGatewayRoute("/p/main/forms-api/contact").target).toBe("api");
  });

  it("routes browser navigations and SPA paths to the client", () => {
    expect(resolveGatewayRoute("/workflows/123", { accept: "text/html" }).target).toBe("client");
    expect(resolveGatewayRoute("/home").target).toBe("client");
  });
});
