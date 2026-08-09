import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const main = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
const updates = await readFile(new URL('../src/updates.ts', import.meta.url), 'utf8');
const splash = await readFile(new URL('../src/splash.html', import.meta.url), 'utf8');
const copyAssets = await readFile(new URL('../scripts/copy-assets.mts', import.meta.url), 'utf8');
const renderizerConfig = await readFile(new URL('../../../renderizer.config.ts', import.meta.url), 'utf8');

test('desktop sends window shape state after load and ready-to-show', () => {
  assert.match(main, /did-finish-load", sendWindowState/);
  assert.match(main, /ready-to-show"[\s\S]*sendWindowState\(\)[\s\S]*window\.show\(\)/);
});

test('desktop keeps the main renderer active while minimized for child window portals', () => {
  assert.match(renderizerConfig, /electron:\s*\{/);
  assert.match(renderizerConfig, /disableBackgroundTimerThrottling:\s*true/);
  assert.match(renderizerConfig, /disableRendererBackgrounding:\s*true/);
  assert.match(renderizerConfig, /disableBackgroundingOccludedWindows:\s*true/);
  assert.match(renderizerConfig, /backgroundThrottling:\s*false/);
  assert.match(copyAssets, /renderizer-electron-config\.json/);
  assert.match(main, /applyRenderizerElectronConfig\(app, renderizerElectronConfig\)/);
  assert.match(main, /\.\.\.renderizerElectronConfig\.defaultWebPreferences/);
  assert.match(main, /function shouldKeepMainRendererVisible\(\)/);
  assert.match(main, /function parkMainWindow\(window/);
  assert.match(main, /setIgnoreMouseEvents\(true\)/);
  assert.match(main, /setOpacity\(0\.01\)/);
  assert.match(main, /restoreParkedMainWindow\(mainWindow\)/);
  assert.doesNotMatch(main, /appendSwitch\("disable-background-timer-throttling"\)/);
});

test('desktop update check treats unavailable GitHub releases as no update', () => {
  assert.match(updates, /fetchReleases\(\)\.catch\(\(\) => \[\]\)/);
  assert.match(updates, /return emptyUpdate\(currentVersion, channel\)/);
});

test('desktop splash uses a blurred dark card with rotating startup statuses', () => {
  assert.match(splash, /background:\s*rgba\(0,\s*0,\s*0,\s*0\.72\)/);
  assert.match(splash, /backdrop-filter:\s*blur\(22px\)/);
  assert.match(splash, /status-list/);
  assert.match(splash, /Starting local services/);
  assert.match(splash, /loading-bar/);
});
