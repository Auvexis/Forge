import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeDriveListQuery } from "./methods.ts";

describe("google drive methods", () => {
  it("turns natural file search text into a valid Drive query", () => {
    assert.equal(
      normalizeDriveListQuery("andre curriculo fullstack"),
      "name contains 'andre' and name contains 'curriculo' and name contains 'fullstack'",
    );
  });

  it("keeps explicit Drive API queries unchanged", () => {
    assert.equal(
      normalizeDriveListQuery("name contains 'curriculo' and trashed = false"),
      "name contains 'curriculo' and trashed = false",
    );
  });
});
