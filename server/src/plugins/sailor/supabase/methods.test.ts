import assert from "node:assert/strict";
import { describe, it } from "node:test";

import plugin from "./index.ts";

describe("supabase plugin", () => {
  it("exports default internal Sailor plugin", () => {
    assert.equal(plugin.id, "sailor-supabase");
    assert.equal(plugin.auth.type, "api_key");
    assert.equal(plugin.manifest.metadata.id, "sailor-supabase");
    assert.equal(typeof plugin.methods.testConnection, "function");
  });
});
