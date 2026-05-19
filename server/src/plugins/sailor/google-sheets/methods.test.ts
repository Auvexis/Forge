import assert from "node:assert/strict";
import { describe, it } from "node:test";
import plugin from "./index.ts";
import { findHeaderIndex, parseJsonArray, rowsToObjects } from "./methods.ts";

describe("google-sheets plugin", () => {
  it("exports expanded Sailor plugin contract", () => {
    const methodNames = [
      "listSpreadsheets",
      "listSheets",
      "readRows",
      "appendRow",
      "appendRows",
      "updateRange",
      "clearRange",
      "createSheet",
      "deleteSheet",
      "findRows",
      "upsertRowByKey",
    ];

    assert.equal(plugin.id, "google-sheets");
    assert.equal(plugin.manifest.metadata.id, "google-sheets");

    for (const methodName of methodNames) {
      assert.equal(typeof plugin.methods[methodName], "function");
      assert.ok(plugin.manifest.methods[methodName], `${methodName} must be declared in manifest`);
    }
  });

  it("parses JSON arrays and rejects non-arrays", () => {
    assert.deepEqual(parseJsonArray("[1,2]", "values"), [1, 2]);
    assert.deepEqual(parseJsonArray(["a"], "values"), ["a"]);
    assert.throws(() => parseJsonArray("{\"a\":1}", "values"), /must evaluate to a JSON array/);
  });

  it("maps rows to objects using the first row as headers", () => {
    assert.deepEqual(rowsToObjects([["id", "name"], ["1", "Ada"], ["2"]]), [
      { id: "1", name: "Ada" },
      { id: "2", name: null },
    ]);
  });

  it("finds header index by name", () => {
    assert.equal(findHeaderIndex(["ID", "Name"], "name"), 1);
    assert.throws(() => findHeaderIndex(["ID"], "email"), /keyColumn/);
  });

  it("requires explicit confirmation before clearing ranges and deleting sheets", async () => {
    const context = { credentials: { client_id: "client", client_secret: "secret" }, tokens: { access_token: "access" } };

    await assert.rejects(
      plugin.methods.clearRange({ spreadsheetId: "s1", range: "Sheet1!A1:B2", confirm: false }, context),
      /confirm/,
    );
    await assert.rejects(
      plugin.methods.deleteSheet({ spreadsheetId: "s1", sheetId: 123, confirm: false }, context),
      /confirm/,
    );
  });
});
