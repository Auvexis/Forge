import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import Fastify from "fastify";

import appRoutes from "./app.routes.ts";
import profilesRoutes from "./profiles.routes.ts";
import { initializeProfileDatabases } from "../database/index.ts";
import { ActiveProfileService } from "../profiles/active-profile-service.ts";
import { ProfileDatabaseManager } from "../profiles/profile-database-manager.ts";
import { ProfilePasswordService } from "../profiles/profile-password-service.ts";
import { ProfileStore } from "../profiles/profile-store.ts";
import { resetAppDatabaseProvider } from "../modules/app/app-repository.ts";
import { resetWorkflowDatabaseProvider } from "../modules/workflows/repository.ts";
import { resetPluginRegistryDatabaseProvider } from "../modules/plugins/plugin-registry.ts";
import { resetCredentialsDatabaseProvider } from "../modules/plugins/credential-store.ts";
import { resetOAuth2SessionDatabaseProvider } from "../modules/plugins/auth/oauth2-session-store.ts";
import type { ApiResponse } from "../../shared/models/api-response.model.ts";

describe("profile switch route integration", () => {
  afterEach(() => {
    resetAppDatabaseProvider();
    resetWorkflowDatabaseProvider();
    resetPluginRegistryDatabaseProvider();
    resetCredentialsDatabaseProvider();
    resetOAuth2SessionDatabaseProvider();
  });

  it("routes app settings through the active profile database after switching", async () => {
    const fabricHome = fs.mkdtempSync(path.join(os.tmpdir(), "fabric-profile-switch-"));
    const store = new ProfileStore({ fabricHome });
    store.ensureInitialized();
    store.createProfile({ id: "work", name: "Work", avatarEmoji: "💼" });
    const passwordService = new ProfilePasswordService({ store });
    const databaseManager = new ProfileDatabaseManager();
    const activeProfileService = new ActiveProfileService({
      fabricHome,
      store,
      passwordService,
      databaseManager,
      migrate: async () => initializeProfileDatabases(databaseManager),
      loadProfilePluginSettings: async () => {},
      loadPlugins: async () => {},
      scheduler: { resync: () => {} },
    });
    await activeProfileService.start();

    const app = Fastify({ logger: false });
    await app.register(appRoutes, { profileStore: store });
    await app.register(profilesRoutes, { store, passwordService, activeProfileService });

    await app.inject({
      method: "PUT",
      url: "/app/settings/theme",
      payload: { value: "default-theme" },
    });

    const infoBefore = (await app.inject({ method: "GET", url: "/app/info" })).json() as ApiResponse<{
      currentProfile: { id: string };
    }>;
    assert.equal(infoBefore.data?.currentProfile.id, "default");

    await app.inject({
      method: "POST",
      url: "/profiles/work/switch",
      payload: {},
    });
    const workSettings = (await app.inject({ method: "GET", url: "/app/settings" })).json() as ApiResponse<Record<string, unknown>>;
    assert.equal(workSettings.data?.theme, undefined);

    await app.inject({
      method: "PUT",
      url: "/app/settings/theme",
      payload: { value: "work-theme" },
    });

    await app.inject({
      method: "POST",
      url: "/profiles/default/switch",
      payload: {},
    });
    const defaultSettings = (await app.inject({ method: "GET", url: "/app/settings" })).json() as ApiResponse<Record<string, unknown>>;
    assert.equal(defaultSettings.data?.theme, "default-theme");

    await app.close();
    databaseManager.close();
  });
});
