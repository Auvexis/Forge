import { describe, expect, it } from "vitest";
import { materializePluginData, projectPluginSchemaForAgent } from "./fabric-file-contract.ts";

const fileSchema = {
  type: "object",
  "x-fabric-value-type": "file",
  "x-fabric-binary-encoding": "base64",
  properties: { name: { type: "string" }, mimeType: { type: "string" }, content: { type: "string" } },
  required: ["name", "mimeType", "content"],
};

describe("Fabric file contract", () => {
  it("hides binary content from the agent projection", () => {
    const projected = projectPluginSchemaForAgent({ type: "array", items: fileSchema });
    expect(projected.items.properties).toHaveProperty("ref");
    expect(projected.items.properties).not.toHaveProperty("content");
    expect(projected.items.required).toBeUndefined();
  });

  it("converts Buffer content to the declared Base64 encoding", () => {
    expect(materializePluginData({ name: "cv.pdf", mimeType: "application/pdf", content: Buffer.from("pdf") }, fileSchema))
      .toEqual({ name: "cv.pdf", mimeType: "application/pdf", content: "cGRm" });
  });

  it("rejects unsupported binary representations", () => {
    expect(() => materializePluginData({ name: "cv.pdf", mimeType: "application/pdf", content: { pipe() {} } }, fileSchema))
      .toThrow(/Buffer or valid Base64/);
  });
});
