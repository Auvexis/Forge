import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createAuvexisAccountLinkService } from "./auvexis-account-link-service.ts";
import type { AuvexisProductSubject } from "@auvexis/accounts";

describe("Auvexis account link service", () => {
  it("creates an OAuth authorization for the active Sailor profile", async () => {
    const calls: unknown[] = [];
    const service = createAuvexisAccountLinkService({
      client: {
        createAuthorization: async (input: {
          productSubject?: AuvexisProductSubject;
        } = {}) => {
          calls.push(input);
          return {
            authorizationUrl: new URL(
              "https://accounts.auvexis.com/api/auth/oauth2/authorize?state=state-1",
            ),
            state: "state-1",
            nonce: "nonce-1",
            codeVerifier: "verifier-1",
            createdAt: 1_782_950_400_000,
          };
        },
      },
    });

    const result = await service.createAuthorization({
      profileId: "default",
    });

    assert.equal(
      result.authorizationUrl,
      "https://accounts.auvexis.com/api/auth/oauth2/authorize?state=state-1",
    );
    assert.equal(result.state, "state-1");
    assert.equal(result.createdAt, 1_782_950_400_000);
    assert.deepEqual(calls, [
      {
        productSubject: {
          type: "local_profile",
          id: "default",
        },
      },
    ]);
  });
});
