import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import Fastify from "fastify";

import profilesRoutes from "./profiles.routes.ts";
import { ProfilePasswordService } from "../profiles/profile-password-service.ts";
import { ProfileStore } from "../profiles/profile-store.ts";

function createStore(): ProfileStore {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "fabric-profile-delete-"));
  const store = new ProfileStore({ fabricHome: home });
  store.ensureInitialized();
  return store;
}

describe("profile deletion scheduler integration", () => {
  it("removes scheduled jobs for the deleted profile", async () => {
    const store = createStore();
    store.createProfile({ id: "work", name: "Work", avatarEmoji: "💼" });
    const removedProfiles: string[] = [];
    const app = Fastify({ logger: false });

    await app.register(profilesRoutes, {
      store,
      passwordService: new ProfilePasswordService({ store }),
      scheduler: {
        unscheduleProfile: (profileId: string) => {
          removedProfiles.push(profileId);
        },
      },
    });

    const deleted = await app.inject({
      method: "DELETE",
      url: "/profiles/work",
    });

    assert.equal(deleted.statusCode, 200);
    assert.deepEqual(removedProfiles, ["work"]);
  });
});
