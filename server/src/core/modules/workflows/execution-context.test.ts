import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { sanitizeContextForLogging } from "./execution-context.ts";

describe("sanitizeContextForLogging", () => {
  it("compacts vectors and long arrays before sending execution payloads to the UI", () => {
    const sanitized = sanitizeContextForLogging({
      documents: Array.from({ length: 55 }, (_, index) => ({
        id: `doc-${index}`,
        text: `document ${index}`,
        vector: [0.1, 0.2, 0.3],
      })),
    });

    assert.equal(sanitized.documents.length, 21);
    assert.deepEqual(sanitized.documents[0].vector, {
      preview: "<vector length: 3>",
      length: 3,
    });
    assert.deepEqual(sanitized.documents[20], {
      preview: "<array truncated>",
      omitted: 35,
      total: 55,
    });
  });

  it("compacts file upload buffers without losing file metadata", () => {
    const sanitized = sanitizeContextForLogging({
      trigger: {
        file: {
          filename: "clientes.csv",
          mimeType: "text/csv",
          content: Buffer.from("id,nome\n1,Ana"),
        },
      },
    });

    assert.deepEqual(sanitized.trigger.file, {
      filename: "clientes.csv",
      mimeType: "text/csv",
      content: "<Buffer size: 13>",
    });
  });
});
