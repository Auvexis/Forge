import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import Database from "better-sqlite3";

import { createMigrationEngine } from "../../database/migration-engine.ts";
import {
  AppRepository,
  resetAppDatabaseProvider,
  setAppDatabaseProvider,
} from "../app/app-repository.ts";
import { Vault } from "./vault.ts";

async function createAppDb(): Promise<Database.Database> {
  const db = new Database(":memory:");
  await createMigrationEngine(db, "app").up();
  return db;
}

describe("Vault", () => {
  afterEach(() => {
    resetAppDatabaseProvider();
  });

  it("resolves BaseVariableInput variables from the active profile before plugin credentials are used", async () => {
    const profileA = await createAppDb();
    const profileB = await createAppDb();

    setAppDatabaseProvider(() => profileA);
    AppRepository.setGlobalVariable("TELEGRAM_BOT", "111:profile-a-token");

    setAppDatabaseProvider(() => profileB);
    AppRepository.setGlobalVariable("TELEGRAM_BOT", "222:profile-b-token");

    setAppDatabaseProvider(() => profileA);
    assert.deepEqual(
      Vault.resolveEnvExpressions({
        bot_token: "{{ variables.TELEGRAM_BOT }}",
      }),
      {
        bot_token: "111:profile-a-token",
      },
    );

    setAppDatabaseProvider(() => profileB);
    assert.deepEqual(
      Vault.resolveEnvExpressions({
        bot_token: "{{ variables.TELEGRAM_BOT }}",
      }),
      {
        bot_token: "222:profile-b-token",
      },
    );

    profileA.close();
    profileB.close();
  });

  it("keeps resolving legacy env expressions from global variables", async () => {
    const profile = await createAppDb();

    setAppDatabaseProvider(() => profile);
    AppRepository.setGlobalVariable("TELEGRAM_BOT", "333:legacy-token");

    assert.deepEqual(
      Vault.resolveEnvExpressions({
        bot_token: "{{ env.TELEGRAM_BOT }}",
      }),
      {
        bot_token: "333:legacy-token",
      },
    );

    profile.close();
  });
});
