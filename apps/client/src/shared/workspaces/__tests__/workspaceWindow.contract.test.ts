import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (file: string) =>
  readFileSync(new URL(file, import.meta.url), "utf8");

test("workspace host delegates native windows to Renderizer", () => {
  const host = read("../BaseWorkspaceWindow.vue");
  const main = read("../../../main.ts");

  assert.match(host, /<RenderWindow/);
  assert.match(host, /<slot name="tabs"/);
  assert.match(host, /<slot \/>/);
  assert.match(host, /exclude-document-classes/);
  assert.match(main, /createRenderizer\(renderizerConfig\)/);
  assert.match(main, /window\.renderizer/);
});

test("workspace host uses the shared Fabric window controls", () => {
  const host = read("../BaseWorkspaceWindow.vue");
  const topbar = read("../../components/layout/AppTopbar.vue");

  assert.match(host, /<BaseWindowControls/);
  assert.match(topbar, /<BaseWindowControls/);
});
