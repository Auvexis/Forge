import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve(import.meta.dirname, "plugins.routes.ts"), "utf8");

test("OAuth callback renders a recoverable completion page", () => {
  assert.match(source, /buildOAuthCallbackHtml/);
  assert.match(source, /window\.setTimeout\(\(\) => window\.close\(\), 1200\)/);
  assert.match(source, /onclick="window\.close\(\)"/);
  assert.match(source, /Tokens were saved/);
});
