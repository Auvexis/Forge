import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import {
  readProfilePluginSettings,
  writeProfilePluginSettings,
} from "./profile-plugin-settings.ts";

describe("profile plugin settings", () => {
  it("returns empty enabledPlugins when settings file is missing", () => {
    const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-profile-"));

    const settings = readProfilePluginSettings(profileDir);

    assert.deepEqual(settings, { enabledPlugins: [] });
  });

  it("writes and reads enabled plugin references", () => {
    const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-profile-"));

    writeProfilePluginSettings(profileDir, {
      enabledPlugins: [{ id: "telegram", source: "external", version: "1.0.0" }],
    });

    assert.deepEqual(readProfilePluginSettings(profileDir), {
      enabledPlugins: [{ id: "telegram", source: "external", version: "1.0.0" }],
    });
  });
});
