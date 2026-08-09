import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const hintDir = resolve(currentDir, "..");

function read(relativePath: string): string {
  return readFileSync(resolve(hintDir, relativePath), "utf8");
}

describe("AppHint contract", () => {
  it("defines reusable hint types", () => {
    const types = read("AppHint.types.ts");

    assert.match(
      types,
      /export type HintPosition = 'left' \| 'top' \| 'right' \| 'bottom'/,
    );
    assert.match(types, /export interface AppHintContent/);
    assert.match(types, /title: string/);
    assert.match(types, /description: string/);
    assert.match(types, /image\?: string/);
    assert.match(types, /gif\?: string/);
  });

  it("teleports hover content and keeps position reactive", () => {
    const source = read("AppHint.vue");

    assert.match(source, /RenderPortal/);
    assert.doesNotMatch(source, /useOverlayTarget/);
    assert.match(source, /ResizeObserver/);
    assert.match(source, /ownerWindow\.addEventListener\('resize'/);
    assert.match(source, /ownerWindow\.addEventListener\('scroll'/);
    assert.match(source, /position/);
  });

  it("renders gif before image and wraps arbitrary slot content", () => {
    const source = read("AppHint.vue");

    assert.match(source, /<slot \/>/);
    assert.match(source, /hint\.gif/);
    assert.match(source, /hint\.image/);
  });
});
