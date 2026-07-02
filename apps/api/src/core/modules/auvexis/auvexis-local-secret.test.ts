import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { loadOrCreateAuvexisLocalSecret } from "./auvexis-local-secret.ts";

describe("Auvexis local secret", () => {
  it("creates and reuses a local installation secret", () => {
    const sailorHome = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-auvexis-home-"));

    const first = loadOrCreateAuvexisLocalSecret({ sailorHome });
    const second = loadOrCreateAuvexisLocalSecret({ sailorHome });

    assert.equal(first, second);
    assert.equal(Buffer.byteLength(first, "utf8") >= 32, true);

    const raw = fs.readFileSync(
      path.join(sailorHome, "global", "auvexis-account-secret"),
      "utf8",
    );
    assert.equal(raw.trim(), first);
  });
});
