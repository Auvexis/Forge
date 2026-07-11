import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { copyExtractedFolderToCache } from "./plugin-install-source-resolver.ts";

function makeTempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "fabric-folder-source-"));
}

function writeValidRelease(root: string): void {
  const releaseDir = path.join(root, "release");
  fs.mkdirSync(releaseDir, { recursive: true });
  for (const file of ["manifest.json", "index.js", "methods.js", "package.json", "package-lock.json"]) {
    fs.writeFileSync(path.join(releaseDir, file), file);
  }
}

describe("copyExtractedFolderToCache", () => {
  it("blocks absolute paths inside the submitted relative file list", () => {
    const source = makeTempRoot();
    writeValidRelease(source);
    const cache = makeTempRoot();

    assert.throws(
      () => copyExtractedFolderToCache(source, cache, { allowedRelativePaths: [path.resolve(source, "release", "manifest.json")] }),
      /absolute paths are not allowed/i,
    );
  });

  it("blocks path traversal inside the submitted relative file list", () => {
    const source = makeTempRoot();
    writeValidRelease(source);
    const cache = makeTempRoot();

    assert.throws(
      () => copyExtractedFolderToCache(source, cache, { allowedRelativePaths: ["../outside.txt"] }),
      /path traversal/i,
    );
  });

  it("blocks symlinks that escape the selected folder", { skip: process.platform === "win32" }, () => {
    const parent = makeTempRoot();
    const source = path.join(parent, "source");
    const cache = makeTempRoot();
    fs.mkdirSync(source);
    writeValidRelease(source);
    fs.writeFileSync(path.join(parent, "outside.txt"), "outside");
    fs.symlinkSync(path.join(parent, "outside.txt"), path.join(source, "release", "outside-link"));

    assert.throws(() => copyExtractedFolderToCache(source, cache), /symlink escapes/i);
  });

  it("limits total copied size", () => {
    const source = makeTempRoot();
    writeValidRelease(source);
    const cache = makeTempRoot();

    assert.throws(() => copyExtractedFolderToCache(source, cache, { maxBytes: 4 }), /size limit/i);
  });

  it("limits copied file count", () => {
    const source = makeTempRoot();
    writeValidRelease(source);
    const cache = makeTempRoot();

    assert.throws(() => copyExtractedFolderToCache(source, cache, { maxFiles: 1 }), /file count limit/i);
  });

  it("copies a valid folder into a unique cache folder", () => {
    const source = makeTempRoot();
    writeValidRelease(source);
    const cache = makeTempRoot();

    const result = copyExtractedFolderToCache(source, cache);

    assert.equal(result.sourceType, "extracted_folder");
    assert.equal(fs.existsSync(path.join(result.localPath, "release", "manifest.json")), true);
    assert.notEqual(result.localPath, source);
  });
});
