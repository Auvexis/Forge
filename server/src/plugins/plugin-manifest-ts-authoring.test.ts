import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const pluginsDir = dirname(fileURLToPath(import.meta.url));

function findManifestJsonFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return findManifestJsonFiles(fullPath);
    return entry.isFile() && entry.name === "manifest.json" ? [fullPath] : [];
  });
}

describe("plugin manifest.ts authoring", () => {
  it("keeps a typed manifest.ts source next to every internal manifest.json artifact", () => {
    const manifestJsonFiles = findManifestJsonFiles(pluginsDir);

    assert.ok(manifestJsonFiles.length > 0);
    for (const manifestJsonPath of manifestJsonFiles) {
      const manifestTsPath = manifestJsonPath.replace(/manifest\.json$/, "manifest.ts");
      assert.equal(existsSync(manifestTsPath), true, `${manifestTsPath} is missing`);

      const source = readFileSync(manifestTsPath, "utf8");
      assert.match(source, /definePluginManifest/);
    }
  });
});
