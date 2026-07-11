import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { generatePluginInstallId } from "./plugin-install-id-generator.ts";

describe("generatePluginInstallId", () => {
  it("generates installId using pluginId plus lowercase hex32", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "fabric-install-id-"));

    const installId = generatePluginInstallId("github-tools", root);

    assert.match(installId, /^github-tools-[a-f0-9]{32}$/);
  });

  it("does not accept installId from the caller", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "fabric-install-id-"));

    const installId = generatePluginInstallId("github-tools", root, { requestedInstallId: "github-tools-bad" });

    assert.notEqual(installId, "github-tools-bad");
    assert.match(installId, /^github-tools-[a-f0-9]{32}$/);
  });

  it("retries when generated id already has a destination folder", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "fabric-install-id-"));
    const collidingHex = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const expectedHex = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    fs.mkdirSync(path.join(root, `github-tools-${collidingHex}`));

    let calls = 0;
    const installId = generatePluginInstallId("github-tools", root, {
      randomHex32: () => {
        calls += 1;
        return calls === 1 ? collidingHex : expectedHex;
      },
    });

    assert.equal(installId, `github-tools-${expectedHex}`);
  });
});
