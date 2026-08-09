import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const source = await readFile(
  new URL("../src/workspace-window-manager.ts", import.meta.url),
  "utf8",
);
const mainSource = await readFile(new URL("../src/main.ts", import.meta.url), "utf8");

test("workspace windows only allow trusted internal frame names and about:blank", () => {
  assert.match(source, /fabric-workspace:/);
  assert.match(source, /url !== "about:blank"/);
  assert.match(source, /contextIsolation: true/);
  assert.match(source, /nodeIntegration: false/);
});

test("workspace controls resolve windows owned by the main renderer", () => {
  assert.match(source, /event\.sender !== this\.opener/);
  assert.match(source, /"minimize"\s*\|\s*"toggle-maximize"\s*\|\s*"close"\s*\|\s*"focus"/);
});

test("workspace windows share the Fabric taskbar application identity", () => {
  assert.match(mainSource, /app\.setAppUserModelId\(desktopAppId\)/);
  assert.match(mainSource, /applyWindowsAppIdentity\(window\)/);
  assert.match(source, /window\.setAppDetails\(\{ appId: this\.appId \}\)/);
});

test("workspace windows honor Renderizer window open features", () => {
  assert.match(source, /parseWindowFeatures\(features\)/);
  assert.match(source, /readNumberFeature\(windowFeatures, "width", 1180\)/);
  assert.match(source, /readNumberFeature\(windowFeatures, "height", 780\)/);
  assert.match(source, /readBooleanFeature\(windowFeatures, "resizable", true\)/);
  assert.match(source, /resizable,/);
});

test("workspace windows keep portals responsive while the opener is minimized", () => {
  assert.match(source, /RenderizerElectronConfig/);
  assert.match(source, /renderizerElectronConfig: RenderizerElectronConfig/);
  assert.match(source, /\.\.\.this\.renderizerElectronConfig\.defaultWebPreferences/);
});
