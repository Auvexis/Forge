import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Readable } from "node:stream";
import { createGoogleDriveMethods, normalizeDriveListQuery } from "./methods.ts";

describe("google drive methods", () => {
  it("turns natural file search text into a valid Drive query", () => {
    assert.equal(
      normalizeDriveListQuery("curriculo de backend"),
      "(name contains 'curriculo' or name contains 'backend')",
    );
  });

  it("keeps explicit Drive API queries unchanged", () => {
    assert.equal(
      normalizeDriveListQuery("name contains 'curriculo' and trashed = false"),
      "name contains 'curriculo' and trashed = false",
    );
  });

  it("downloads binary Drive files with alt media", async () => {
    const calls: string[] = [];
    const methods = createGoogleDriveMethods({
      driveClient: {
        files: {
          get: async (params: any, options?: any) => {
            if (params.fields) {
              calls.push("metadata");
              return { data: { name: "resume.pdf", mimeType: "application/pdf" } };
            }
            calls.push(`download:${params.alt}:${options?.responseType}`);
            return { data: Readable.from(Buffer.from("pdf")) };
          },
        },
      },
    });

    const result = await methods.downloadFile({ fileId: "file_pdf" }, fakeContext());

    assert.deepEqual(calls, ["metadata", "download:media:stream"]);
    assert.equal(result.name, "resume.pdf");
    assert.equal(result.mimeType, "application/pdf");
    assert.equal(result.content.toString("utf8"), "pdf");
  });

  it("exports Google Docs editor files instead of downloading alt media", async () => {
    const calls: string[] = [];
    const methods = createGoogleDriveMethods({
      driveClient: {
        files: {
          get: async (params: any) => {
            calls.push(`metadata:${params.fields}`);
            return { data: { name: "Andresimoes Analista", mimeType: "application/vnd.google-apps.document" } };
          },
          export: async (params: any, options?: any) => {
            calls.push(`export:${params.mimeType}:${options?.responseType}`);
            return { data: Readable.from(Buffer.from("exported-pdf")) };
          },
        },
      },
    });

    const result = await methods.downloadFile({ fileId: "file_doc" }, fakeContext());

    assert.deepEqual(calls, ["metadata:name, mimeType", "export:application/pdf:stream"]);
    assert.equal(result.name, "Andresimoes Analista.pdf");
    assert.equal(result.mimeType, "application/pdf");
    assert.equal(result.content.toString("utf8"), "exported-pdf");
  });
});

function fakeContext(): any {
  return {
    credentials: { client_id: "client", client_secret: "secret" },
    tokens: { access_token: "token" },
  };
}
