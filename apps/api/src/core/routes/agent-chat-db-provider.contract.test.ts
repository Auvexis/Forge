import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../../..");

function read(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), "utf8");
}

test("agent chat routes use workflow repository database by default", () => {
  const source = read("src/core/routes/agent-chat.routes.ts");

  assert.match(source, /WorkflowRepository/);
  assert.match(source, /options\.db \?\? WorkflowRepository\.database\(\)/);
  assert.doesNotMatch(source, /options\.db \?\? DatabaseManager\.workflows/);
});
