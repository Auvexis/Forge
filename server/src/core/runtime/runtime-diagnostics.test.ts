import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatRuntimeDiagnostics } from "./runtime-diagnostics.ts";

describe("formatRuntimeDiagnostics", () => {
  it("returns safe startup lines without secrets", () => {
    const lines = formatRuntimeDiagnostics({
      home: "C:/nd8",
      dataDir: "C:/nd8/data",
      globalPluginsDir: "C:/nd8/global/plugins",
      defaultProfileDir: "C:/nd8/profiles/default",
    });

    assert.deepEqual(lines, [
      "[NOD8 | RUNTIME]: ND8_HOME C:/nd8",
      "[NOD8 | RUNTIME]: Data directory C:/nd8/data",
      "[NOD8 | RUNTIME]: External plugins directory C:/nd8/global/plugins",
      "[NOD8 | RUNTIME]: Default profile directory C:/nd8/profiles/default",
    ]);
    assert.equal(lines.join("\n").includes("token"), false);
    assert.equal(lines.join("\n").includes("secret"), false);
  });
});
