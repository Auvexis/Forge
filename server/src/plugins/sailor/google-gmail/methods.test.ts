import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Readable } from "node:stream";
import { normalizeGmailAttachments } from "./methods.ts";

describe("google gmail methods", () => {
  it("normalizes readable attachment content from Drive downloads", async () => {
    const attachments = await normalizeGmailAttachments([
      {
        filename: "curriculo.pdf",
        mimeType: "application/pdf",
        content: Readable.from(Buffer.from("pdf-content")),
      },
    ]);

    assert.deepEqual(attachments, [
      {
        filename: "curriculo.pdf",
        mimeType: "application/pdf",
        contentBase64: Buffer.from("pdf-content").toString("base64"),
      },
    ]);
  });
});
