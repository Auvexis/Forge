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
