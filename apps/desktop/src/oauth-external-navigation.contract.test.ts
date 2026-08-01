import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("desktop OAuth external navigation", () => {
  it("uses validated main-process shell navigation and denies child windows", () => {
    const main = readFileSync(new URL("./main.ts", import.meta.url), "utf8");
    const preload = readFileSync(new URL("./preload.ts", import.meta.url), "utf8");

    assert.match(preload, /ipcRenderer\.invoke\("fabric-desktop-open-external", url\)/);
    assert.doesNotMatch(preload, /shell\.openExternal/);
    assert.match(main, /setWindowOpenHandler/);
    assert.match(main, /return \{ action: "deny" \}/);
    assert.match(main, /await shell\.openExternal/);
    assert.match(main, /parsed\.protocol !== "https:"/);
  });
});

describe("desktop OS integrations", () => {
  it("exposes a native restart IPC handler", () => {
    const main = readFileSync(new URL("./main.ts", import.meta.url), "utf8");
    const preload = readFileSync(new URL("./preload.ts", import.meta.url), "utf8");

    assert.match(preload, /ipcRenderer\.invoke\("fabric-desktop-restart"\)/);
    assert.match(main, /ipcMain\.handle\("fabric-desktop-restart"/);
    assert.match(main, /app\.relaunch\(\)/);
    assert.match(main, /app\.exit\(0\)/);
  });

  it("uses native notifications only through the main process", () => {
    const main = readFileSync(new URL("./main.ts", import.meta.url), "utf8");
    const preload = readFileSync(new URL("./preload.ts", import.meta.url), "utf8");

    assert.match(preload, /ipcRenderer\.invoke\("fabric-desktop-notify", payload\)/);
    assert.match(main, /ipcMain\.handle\(\s*"fabric-desktop-notify"/);
    assert.match(main, /window\?\.isFocused\(\)/);
    assert.match(main, /new NativeNotification/);
  });

  it("supports tray behavior and desktop preference updates", () => {
    const main = readFileSync(new URL("./main.ts", import.meta.url), "utf8");
    const preload = readFileSync(new URL("./preload.ts", import.meta.url), "utf8");

    assert.match(main, /new Tray/);
    assert.match(main, /setContextMenu/);
    assert.match(main, /fabric-desktop-preferences-set/);
    assert.match(main, /app\.setLoginItemSettings/);
    assert.match(main, /desktopPreferences\.minimizeToTray/);
    assert.match(main, /desktopPreferences\.closeToTray/);
    assert.match(preload, /fabric-desktop-preferences-set/);
  });

  it("exposes safe desktop update checks through the main process", () => {
    const main = readFileSync(new URL("./main.ts", import.meta.url), "utf8");
    const preload = readFileSync(new URL("./preload.ts", import.meta.url), "utf8");
    const updates = readFileSync(new URL("./updates.ts", import.meta.url), "utf8");

    assert.match(main, /checkDesktopUpdate\(app\.getVersion\(\), channel\)/);
    assert.match(main, /ipcMain\.handle\("fabric-desktop-update-check"/);
    assert.match(preload, /checkForUpdates/);
    assert.match(preload, /ipcRenderer\.invoke\("fabric-desktop-update-check", channel\)/);
    assert.match(updates, /DesktopUpdateChannel = "safe" \| "stable" \| "beta" \| "alpha"/);
    assert.match(updates, /searchable\.includes\("safe"\)/);
    assert.match(updates, /compareVersions\(version, currentVersion\) > 0/);
  });
});
