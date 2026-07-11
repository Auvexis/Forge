import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMethods } from "./methods.ts";

describe("fabric file plugin methods", () => {
  it("converts standard file objects by reading their content field", async () => {
    const file = Buffer.from("pdf");

    const result = await createMethods().convertFile({
      input: {
        filename: "curriculo.pdf",
        mimeType: "application/pdf",
        content: file,
      },
      fromFormat: "buffer",
      toFormat: "base64",
    });

    assert.deepEqual(result, {
      result: file.toString("base64"),
      sizeBytes: file.length,
      format: "base64",
    });
  });

  it("converts nested download file objects by reading their content field", async () => {
    const file = Buffer.from("pdf");

    const result = await createMethods().convertFile({
      input: {
        download: {
          fileName: "andresimoes-curriculo-estagio.pdf",
          mimeType: "application/pdf",
          content: file,
        },
      },
      fromFormat: "buffer",
      toFormat: "base64",
    });

    assert.deepEqual(result, {
      result: file.toString("base64"),
      sizeBytes: file.length,
      format: "base64",
    });
  });
});
