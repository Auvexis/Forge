import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { resolveProfilePaths } from "../../profiles/profile-paths.ts";
import { savePluginIconAsset } from "./plugin-icon-asset-service.ts";

function createProfilePaths() {
  const sailorHome = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-plugin-icon-assets-"));
  return resolveProfilePaths({ sailorHome, profileId: "default" });
}

describe("savePluginIconAsset", () => {
  for (const filename of ["logo.svg", "logo.png", "logo.webp", "logo.jpg", "logo.jpeg"]) {
    it(`saves ${filename} under blueprint assets/icons and returns a manifest-safe path`, () => {
      const profilePaths = createProfilePaths();

      const result = savePluginIconAsset({
        profilePaths,
        blueprintId: "bp_my_crm",
        slot: "iconDark",
        filename,
        buffer: Buffer.from("icon"),
      });

      assert.equal(result, `assets/icons/iconDark${path.extname(filename).toLowerCase()}`);
      assert.equal(
        fs.readFileSync(
          path.join(
            profilePaths.profileDir,
            "plugin-creator",
            "blueprints",
            "bp_my_crm",
            "assets",
            "icons",
            `iconDark${path.extname(filename).toLowerCase()}`,
          ),
          "utf8",
        ),
        "icon",
      );
    });
  }

  for (const filename of [
    "C:/Users/dev/icon.svg",
    "/Users/dev/icon.svg",
    "file:///Users/dev/icon.svg",
    "../outside.svg",
    "..\\outside.svg",
    "icon.txt",
  ]) {
    it(`rejects unsafe icon filename ${filename}`, () => {
      assert.throws(
        () =>
          savePluginIconAsset({
            profilePaths: createProfilePaths(),
            blueprintId: "bp_my_crm",
            slot: "icon",
            filename,
            buffer: Buffer.from("icon"),
          }),
        /Invalid plugin icon asset/,
      );
    });
  }
});
