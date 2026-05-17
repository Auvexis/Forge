import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { applyPluginProfileScope } from "./plugin-profile-scope-service.ts";
import { readProfilePluginSettings } from "../../../runtime/profile-plugin-settings.ts";

describe("applyPluginProfileScope", () => {
  it("enables the install id in the current default profile", () => {
    const profilesDir = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-profiles-"));
    const defaultProfileDir = path.join(profilesDir, "default");

    applyPluginProfileScope({
      profilesDir,
      defaultProfileDir,
      scope: "current_profile",
      reference: { id: "github-tools-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", source: "external", version: "1.0.0" },
    });

    assert.deepEqual(readProfilePluginSettings(defaultProfileDir).enabledPlugins, [
      { id: "github-tools-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", source: "external", version: "1.0.0" },
    ]);
  });

  it("enables the install id in all existing profiles without duplicates", () => {
    const profilesDir = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-profiles-"));
    const defaultProfileDir = path.join(profilesDir, "default");
    const teamProfileDir = path.join(profilesDir, "team");
    fs.mkdirSync(defaultProfileDir, { recursive: true });
    fs.mkdirSync(teamProfileDir, { recursive: true });

    const reference = { id: "github-tools-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", source: "external" as const, version: "1.0.0" };
    applyPluginProfileScope({ profilesDir, defaultProfileDir, scope: "all_profiles", reference });
    applyPluginProfileScope({ profilesDir, defaultProfileDir, scope: "all_profiles", reference });

    assert.deepEqual(readProfilePluginSettings(defaultProfileDir).enabledPlugins, [reference]);
    assert.deepEqual(readProfilePluginSettings(teamProfileDir).enabledPlugins, [reference]);
  });
});
