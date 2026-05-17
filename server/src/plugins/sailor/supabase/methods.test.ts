import assert from "node:assert/strict";
import { describe, it } from "node:test";

import plugin from "./index.ts";
import { applyFiltersToQuery, contentToBuffer, createSupabaseMethods } from "./methods.ts";

describe("supabase plugin", () => {
  it("exports default internal Sailor plugin", () => {
    assert.equal(plugin.id, "sailor-supabase");
    assert.equal(plugin.auth.type, "api_key");
    assert.equal(plugin.manifest.metadata.id, "sailor-supabase");
    assert.equal(typeof plugin.methods.testConnection, "function");
  });
});

describe("supabase helpers", () => {
  it("applies supported filters to query builders", () => {
    const calls: unknown[] = [];
    const query: any = {
      eq: (column: string, value: unknown) => {
        calls.push(["eq", column, value]);
        return query;
      },
      gt: (column: string, value: unknown) => {
        calls.push(["gt", column, value]);
        return query;
      },
      ilike: (column: string, value: unknown) => {
        calls.push(["ilike", column, value]);
        return query;
      },
    };

    applyFiltersToQuery(query, [
      { column: "status", operator: "eq", value: "open" },
      { column: "amount", operator: "gt", value: 10 },
      { column: "email", operator: "ilike", value: "%@example.com" },
    ]);

    assert.deepEqual(calls, [
      ["eq", "status", "open"],
      ["gt", "amount", 10],
      ["ilike", "email", "%@example.com"],
    ]);
  });

  it("rejects unsupported filters", () => {
    assert.throws(
      () => applyFiltersToQuery({} as any, [{ column: "status", operator: "contains", value: "open" }]),
      /Unsupported Supabase filter operator/,
    );
  });

  it("exposes database and rpc methods", () => {
    const methods = createSupabaseMethods();

    assert.equal(typeof methods.listTables, "function");
    assert.equal(typeof methods.selectRows, "function");
    assert.equal(typeof methods.insertRow, "function");
    assert.equal(typeof methods.updateRows, "function");
    assert.equal(typeof methods.deleteRows, "function");
    assert.equal(typeof methods.upsertRow, "function");
    assert.equal(typeof methods.callRpc, "function");
  });

  it("converts storage content to buffers", () => {
    assert.equal(contentToBuffer({ content: "hello", encoding: "text" }).toString("utf8"), "hello");
    assert.equal(
      contentToBuffer({ content: Buffer.from("hello").toString("base64"), encoding: "base64" }).toString("utf8"),
      "hello",
    );
    assert.throws(() => contentToBuffer({ content: "x", encoding: "zip" }), /Unsupported storage encoding/);
  });

  it("exposes storage methods", () => {
    const methods = createSupabaseMethods();

    assert.equal(typeof methods.uploadObject, "function");
    assert.equal(typeof methods.downloadObject, "function");
    assert.equal(typeof methods.deleteObject, "function");
    assert.equal(typeof methods.createSignedUrl, "function");
  });
});
