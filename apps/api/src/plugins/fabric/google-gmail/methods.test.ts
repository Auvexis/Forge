import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeGmailAttachments } from "./methods.ts";

describe("google gmail methods", () => {
  it("normalizes canonical Buffer attachment content", async () => {
    const attachments = await normalizeGmailAttachments([
      {
        name: "curriculo.pdf",
        mimeType: "application/pdf",
        content: Buffer.from("pdf-content"),
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

  it("preserves the canonical Fabric file name", async () => {
    const attachments = await normalizeGmailAttachments([{
      name: "andresimoes-jr-backend.pdf",
      mimeType: "application/pdf",
      content: Buffer.from("pdf-content").toString("base64"),
    }]);

    assert.equal(attachments?.[0]?.filename, "andresimoes-jr-backend.pdf");
  });

  it("rejects attachment metadata without real content", async () => {
    await assert.rejects(
      () => normalizeGmailAttachments([
        {
          filename: "andresimoes-jr-backend.pdf",
          mimeType: "application/pdf",
          fileId: "drive_file_1",
        },
      ]),
      /content/i,
    );
  });

  it("ignores an unresolved optional attachment template", async () => {
    const attachments = await normalizeGmailAttachments([
      "{{ trigger.attachment }}",
    ]);

    assert.equal(attachments, undefined);
  });
});
