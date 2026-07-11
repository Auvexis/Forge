import assert from "node:assert/strict";
import { describe, it } from "node:test";

import plugin from "./index.ts";
import {
  assertUnsafeSqlAllowed,
  buildOrderClause,
  buildWhereClause,
  createPostgresqlMethods,
  normalizeLimit,
  putAgentMemoryWithDb,
  quoteIdentifier,
  searchAgentMemoryWithDb,
} from "./methods.ts";

describe("postgresql plugin", () => {
  it("exports default internal Fabric plugin", () => {
    assert.equal(plugin.id, "fabric-postgresql");
    assert.equal(plugin.auth.type, "api_key");
    assert.equal(plugin.manifest.metadata.id, "fabric-postgresql");
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

  it("stores and searches agent memory records with parameterized PostgreSQL queries", async () => {
    const queries: Array<{ sql: string; values?: unknown[] }> = [];
    const db = {
      async query<T extends Record<string, unknown> = Record<string, unknown>>(sql: string, values?: unknown[]) {
        queries.push({ sql, values });
        if (sql.includes("select memory_key")) {
          return {
            rowCount: 1,
            rows: [{ key: "tone", value: { style: "concise" } } as unknown as T],
          };
        }
        return { rowCount: 1, rows: [] as T[] };
      },
    };

    await putAgentMemoryWithDb(db, {
      id: "memory_1",
      profileId: "profile_1",
      namespace: "profile:profile_1",
      key: "agent:agent_1:last-output",
      value: "hello",
      source: "workflow:wf_1",
    });
    const rows = await searchAgentMemoryWithDb(db, {
      profileId: "profile_1",
      namespace: "profile:profile_1",
      limit: 4,
    });

    assert.deepEqual(rows, [{ key: "tone", value: { style: "concise" } }]);
    assert.match(queries[0].sql, /create table if not exists fabric_agent_memories/i);
    assert.match(queries[2].sql, /insert into fabric_agent_memories/i);
    assert.deepEqual(queries[2].values?.slice(0, 4), [
      "memory_1",
      "profile_1",
      "profile:profile_1",
      "agent:agent_1:last-output",
    ]);
    assert.match(queries[5].sql, /where profile_id = \$1 and namespace = \$2/i);
    assert.deepEqual(queries[5].values, ["profile_1", "profile:profile_1", 4]);
  });
});
