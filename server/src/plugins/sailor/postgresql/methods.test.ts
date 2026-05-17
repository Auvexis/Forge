import assert from "node:assert/strict";
import { describe, it } from "node:test";

import plugin from "./index.ts";
import { createPostgresqlMethods, normalizeLimit, quoteIdentifier } from "./methods.ts";

describe("postgresql plugin", () => {
  it("exports default internal Sailor plugin", () => {
    assert.equal(plugin.id, "sailor-postgresql");
    assert.equal(plugin.auth.type, "api_key");
    assert.equal(plugin.manifest.metadata.id, "sailor-postgresql");
    assert.equal(typeof plugin.methods.testConnection, "function");
  });
});

describe("postgresql helpers", () => {
  it("quotes identifiers safely", () => {
    assert.equal(quoteIdentifier("users"), "\"users\"");
    assert.equal(quoteIdentifier("order_items"), "\"order_items\"");
    assert.throws(() => quoteIdentifier("bad\"name"), /Invalid SQL identifier/);
    assert.throws(() => quoteIdentifier(""), /Invalid SQL identifier/);
  });

  it("normalizes limits", () => {
    assert.equal(normalizeLimit(undefined), 100);
    assert.equal(normalizeLimit(5), 5);
    assert.equal(normalizeLimit(10000), 1000);
    assert.equal(normalizeLimit(0), 100);
  });

  it("exposes introspection methods", () => {
    const methods = createPostgresqlMethods();

    assert.equal(typeof methods.listSchemas, "function");
    assert.equal(typeof methods.listTables, "function");
    assert.equal(typeof methods.describeTable, "function");
  });
});
