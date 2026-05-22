import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { assertSafePluginCreatorCodeBlock } from "./plugin-code-block-safety.ts";

describe("assertSafePluginCreatorCodeBlock", () => {
  it("rejects code blocks that try to import modules or access process", () => {
    for (const source of [
      "import fs from 'node:fs'",
      "const fs = require('fs')",
      "return process.env",
      "return eval('1 + 1')",
      "return Function('return process')()",
    ]) {
      assert.throws(() => assertSafePluginCreatorCodeBlock(source), /not allowed/);
    }
  });

  it("allows plain transformations using params context and previous", () => {
    assert.doesNotThrow(() =>
      assertSafePluginCreatorCodeBlock("return { name: params.name, previous };"),
    );
  });
});
