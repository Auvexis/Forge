import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatRuntimeDiagnostics } from "./runtime-diagnostics.ts";

describe("formatRuntimeDiagnostics", () => {
  it("returns safe startup lines without secrets", () => {
    const lines = formatRuntimeDiagnostics({
      home: "C:/fabric",
      dataDir: "C:/fabric/data",
      globalPluginsDir: "C:/fabric/global/plugins",
      defaultProfileDir: "C:/fabric/profiles/default",
    });

    assert.deepEqual(lines, [
      "[FABRIC | RUNTIME]: FABRIC_HOME C:/fabric",
      "[FABRIC | RUNTIME]: Data directory C:/fabric/data",
      "[FABRIC | RUNTIME]: External plugins directory C:/fabric/global/plugins",
      "[FABRIC | RUNTIME]: Default profile directory C:/fabric/profiles/default",
    ]);
    assert.equal(lines.join("\n").includes("token"), false);
    assert.equal(lines.join("\n").includes("secret"), false);
  });
});
