import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateOAuth2AuthorizationUrl } from "./oauth2-authorization-url.ts";

describe("validateOAuth2AuthorizationUrl", () => {
  it("keeps absolute provider authorization URLs", () => {
    assert.equal(
      validateOAuth2AuthorizationUrl("https://accounts.example/oauth?client_id=abc"),
      "https://accounts.example/oauth?client_id=abc",
    );
  });

  it("rejects relative and non-HTTP URLs", () => {
    assert.throws(() => validateOAuth2AuthorizationUrl("/plugins/oauth"));
    assert.throws(() => validateOAuth2AuthorizationUrl("javascript:alert(1)"));
  });
});
