import assert from "node:assert/strict";
import { describe, it } from "node:test";

import plugin from "./index.ts";
import {
  assertUnsafeSqlAllowed,
  buildOrderClause,
  buildWhereClause,
  createPostgresqlMethods,
  normalizeLimit,
  quoteIdentifier,
} from "./methods.ts";

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

  it("builds simple where clauses with parameterized values", () => {
    assert.deepEqual(buildWhereClause({ id: 1, status: "open" }), {
      sql: " where \"id\" = $1 and \"status\" = $2",
      values: [1, "open"],
    });
  });

  it("builds order clauses from safe identifiers and directions", () => {
    assert.equal(buildOrderClause({ column: "created_at", direction: "desc" }), " order by \"created_at\" desc");
    assert.throws(() => buildOrderClause({ column: "created_at", direction: "sideways" }), /Invalid order direction/);
  });

  it("blocks unsafe sql unless explicitly allowed", () => {
    assert.throws(() => assertUnsafeSqlAllowed({ credentials: {} } as any), /Unsafe SQL is disabled/);
    assert.doesNotThrow(() =>
      assertUnsafeSqlAllowed({ credentials: { allowUnsafeSql: "I_UNDERSTAND_SQL_RISK" } } as any),
    );
  });

  it("exposes crud and guarded sql methods", () => {
    const methods = createPostgresqlMethods();

    assert.equal(typeof methods.selectRows, "function");
    assert.equal(typeof methods.insertRow, "function");
    assert.equal(typeof methods.updateRows, "function");
    assert.equal(typeof methods.deleteRows, "function");
    assert.equal(typeof methods.executeQuery, "function");
    assert.equal(typeof methods.transaction, "function");
  });
});
