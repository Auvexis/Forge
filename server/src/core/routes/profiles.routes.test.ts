import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import Fastify from "fastify";

import profilesRoutes from "./profiles.routes.ts";
import { ProfilePasswordService } from "../profiles/profile-password-service.ts";
import { ProfileStore } from "../profiles/profile-store.ts";
import type { ApiResponse } from "../../shared/models/api-response.model.ts";

function createStore(): ProfileStore {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-profile-routes-"));
  const store = new ProfileStore({ sailorHome: home });
  store.ensureInitialized();
  return store;
}

async function buildApp(store = createStore()) {
  const app = Fastify({ logger: false });
  const passwordService = new ProfilePasswordService({ store });
  await app.register(profilesRoutes, {
    store,
    passwordService,
    activeProfileService: {
      switchProfile: async (input: {
        profileId: string;
        password?: string;
      }) => {
        const manifest = store.getProfileManifest(input.profileId);
        if (!manifest) throw new Error("PROFILE_NOT_FOUND");
        if (manifest.password.enabled) {
          if (!input.password) throw new Error("PROFILE_PASSWORD_REQUIRED");
          if (
            !passwordService.verifyPassword({
              profileId: input.profileId,
              password: input.password,
            })
          ) {
            throw new Error("PROFILE_PASSWORD_INVALID");
          }
        }
        return store.setCurrentProfile(input.profileId);
      },
    },
  });
  return app;
}

describe("profiles routes", () => {
  it("lists and creates profiles without exposing password hashes", async () => {
    const app = await buildApp();

    const created = await app.inject({
      method: "POST",
      url: "/profiles",
      payload: {
        id: "work",
        name: "Work",
        avatarEmoji: "💼",
        email: "work@example.com",
      },
    });
    assert.equal(created.statusCode, 201);

    const response = await app.inject({ method: "GET", url: "/profiles" });
    const body = response.json() as ApiResponse<Array<Record<string, unknown>>>;

    assert.equal(response.statusCode, 200);
    assert.deepEqual(
      body.data?.map((profile) => profile.id),
      ["default", "work"],
    );
    assert.equal(JSON.stringify(body).includes("hash"), false);
  });

  it("sets, verifies, requires and removes profile passwords", async () => {
    const store = createStore();
    store.createProfile({ id: "work", name: "Work", avatarEmoji: "💼" });
    const app = await buildApp(store);

    const setPassword = await app.inject({
      method: "PUT",
      url: "/profiles/work/password",
      payload: { password: "secret" },
    });
    assert.equal(setPassword.statusCode, 200);

    const missingPasswordSwitch = await app.inject({
      method: "POST",
      url: "/profiles/work/switch",
      payload: {},
    });
    assert.equal(missingPasswordSwitch.statusCode, 401);
    assert.equal(
      (missingPasswordSwitch.json() as ApiResponse<null>).error,
      "PROFILE_PASSWORD_REQUIRED",
    );

    const wrongPassword = await app.inject({
      method: "POST",
      url: "/profiles/work/verify-password",
      payload: { password: "wrong" },
    });
    assert.equal(wrongPassword.statusCode, 401);

    const switched = await app.inject({
      method: "POST",
      url: "/profiles/work/switch",
      payload: { password: "secret" },
    });
    assert.equal(switched.statusCode, 200);
    assert.equal(store.getCurrentProfile()?.id, "work");

    const removePassword = await app.inject({
      method: "DELETE",
      url: "/profiles/work/password",
    });
    assert.equal(removePassword.statusCode, 200);
    assert.equal(store.getProfile("work")?.passwordProtected, false);
  });

  it("updates metadata and blocks default profile deletion", async () => {
    const store = createStore();
    store.createProfile({ id: "work", name: "Work", avatarEmoji: "💼" });
    const app = await buildApp(store);

    const update = await app.inject({
      method: "PATCH",
      url: "/profiles/work",
      payload: {
        name: "Client Work",
        avatarEmoji: "🧭",
        email: "client@example.com",
      },
    });
    assert.equal(update.statusCode, 200);
    assert.equal(store.getProfile("work")?.name, "Client Work");

    const deleteActive = await app.inject({
      method: "DELETE",
      url: "/profiles/default",
    });
    assert.equal(deleteActive.statusCode, 409);
    assert.equal(
      (deleteActive.json() as ApiResponse<null>).error,
      "PROFILE_DEFAULT_DELETE",
    );
  });
});
