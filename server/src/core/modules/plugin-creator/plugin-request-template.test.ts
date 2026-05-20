import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { renderPluginRequestTemplate } from "./plugin-request-template.ts";
import type { PluginBlueprintRequest } from "./plugin-blueprint-types.ts";

function createRequest(overrides: Partial<PluginBlueprintRequest> = {}): PluginBlueprintRequest {
  return {
    method: "POST",
    url: "https://api.example.com/users/{{ params.userId }}",
    headers: [{ name: "Authorization", value: "Bearer {{ credentials.apiKey }}" }],
    query: [{ name: "source", value: "{{ params.source }}" }],
    body: {
      type: "json",
      value: {
        email: "{{ params.email }}",
        nested: { active: "{{ params.active }}" },
      },
    },
    ...overrides,
  };
}

describe("renderPluginRequestTemplate", () => {
  it("renders params and credentials into URL, headers, query and JSON body", () => {
    const rendered = renderPluginRequestTemplate({
      request: createRequest(),
      params: {
        userId: "user_123",
        source: "sailor",
        email: "lead@example.com",
        active: true,
      },
      credentials: { apiKey: "secret-token" },
    });

    assert.equal(rendered.request.url, "https://api.example.com/users/user_123");
    assert.equal(rendered.request.headers.Authorization, "Bearer secret-token");
    assert.equal(rendered.request.query.source, "sailor");
    assert.deepEqual(rendered.request.body, {
      email: "lead@example.com",
      nested: { active: true },
    });
  });

  it("returns a masked preview without leaking credentials", () => {
    const rendered = renderPluginRequestTemplate({
      request: createRequest(),
      params: {
        userId: "user_123",
        source: "sailor",
        email: "lead@example.com",
        active: true,
      },
      credentials: { apiKey: "secret-token" },
    });

    assert.equal(rendered.preview.headers.Authorization, "Bearer ********");
    assert.equal(JSON.stringify(rendered.preview).includes("secret-token"), false);
  });

  it("throws when a required param is missing", () => {
    assert.throws(
      () =>
        renderPluginRequestTemplate({
          request: createRequest(),
          params: { userId: "user_123", source: "sailor", active: true },
          credentials: { apiKey: "secret-token" },
        }),
      /Missing template value: params\.email/,
    );
  });

  it("rejects template paths outside params and credentials", () => {
    assert.throws(
      () =>
        renderPluginRequestTemplate({
          request: createRequest({ url: "https://api.example.com/{{ process.env.SECRET }}" }),
          params: {},
          credentials: {},
        }),
      /Unsupported template root: process/,
    );
  });

  it("rejects unsafe template path segments", () => {
    assert.throws(
      () =>
        renderPluginRequestTemplate({
          request: createRequest({ url: "https://api.example.com/{{ params.constructor.constructor }}" }),
          params: {},
          credentials: {},
        }),
      /Unsafe template path/,
    );
  });
});
