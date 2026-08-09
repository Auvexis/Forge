import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const main = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
const updates = await readFile(new URL('../src/updates.ts', import.meta.url), 'utf8');
const splash = await readFile(new URL('../src/splash.html', import.meta.url), 'utf8');

test('desktop sends window shape state after load and ready-to-show', () => {
  assert.match(main, /did-finish-load", sendWindowState/);
  assert.match(main, /ready-to-show"[\s\S]*sendWindowState\(\)[\s\S]*window\.show\(\)/);
});

test('desktop keeps the main renderer active while minimized for child window portals', () => {
  assert.match(main, /backgroundThrottling: false/);
  assert.match(main, /appendSwitch\("disable-background-timer-throttling"\)/);
  assert.match(main, /appendSwitch\("disable-renderer-backgrounding"\)/);
  assert.match(main, /appendSwitch\("disable-backgrounding-occluded-windows"\)/);
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
