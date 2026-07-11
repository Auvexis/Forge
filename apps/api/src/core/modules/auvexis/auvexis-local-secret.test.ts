import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { loadOrCreateAuvexisLocalSecret } from "./auvexis-local-secret.ts";

describe("Auvexis local secret", () => {
  it("creates and reuses a local installation secret", () => {
    const fabricHome = fs.mkdtempSync(path.join(os.tmpdir(), "fabric-auvexis-home-"));

    const first = loadOrCreateAuvexisLocalSecret({ fabricHome });
    const second = loadOrCreateAuvexisLocalSecret({ fabricHome });

    assert.equal(first, second);
    assert.equal(Buffer.byteLength(first, "utf8") >= 32, true);

    const raw = fs.readFileSync(
      path.join(fabricHome, "global", "auvexis-account-secret"),
      "utf8",
    );
    assert.equal(raw.trim(), first);
  });
});
