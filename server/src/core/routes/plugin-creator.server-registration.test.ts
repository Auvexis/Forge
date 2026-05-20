import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("plugin creator server registration", () => {
  it("registers plugin creator routes in the server bootstrap", () => {
    const serverSource = fs.readFileSync(path.join(__dirname, "..", "server.ts"), "utf8");

    assert.match(serverSource, /import pluginCreatorRoutes from "\.\/routes\/plugin-creator\.routes\.ts";/);
    assert.match(serverSource, /fastify\.register\(pluginCreatorRoutes\);/);
  });
});
