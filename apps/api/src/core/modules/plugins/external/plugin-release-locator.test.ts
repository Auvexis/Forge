import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { locatePluginRelease } from "./plugin-release-locator.ts";

const requiredFiles = ["manifest.json", "index.js", "methods.js", "package.json", "package-lock.json"];

function makeTempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "fabric-release-locator-"));
}

function writeRelease(root: string, files = requiredFiles): string {
  const releaseDir = path.join(root, "release");
  fs.mkdirSync(releaseDir, { recursive: true });
  for (const file of files) {
    fs.writeFileSync(path.join(releaseDir, file), file === "manifest.json" ? "{}" : "");
  }
  return releaseDir;
}

function writeReleaseFiles(dir: string, files = requiredFiles): string {
  fs.mkdirSync(dir, { recursive: true });
  for (const file of files) {
    fs.writeFileSync(path.join(dir, file), file === "manifest.json" ? "{}" : "");
  }
  return dir;
}

describe("locatePluginRelease", () => {
  it("fails when release directory does not exist", () => {
    assert.throws(() => locatePluginRelease(makeTempRoot()), /release directory was not found/i);
  });

  it("fails when manifest.json is missing", () => {
    const root = makeTempRoot();
    writeRelease(root, requiredFiles.filter((file) => file !== "manifest.json"));

    assert.throws(() => locatePluginRelease(root), /manifest\.json/);
  });

  it("fails when package-lock.json is missing", () => {
    const root = makeTempRoot();
    writeRelease(root, requiredFiles.filter((file) => file !== "package-lock.json"));

    assert.throws(() => locatePluginRelease(root), /package-lock\.json/);
  });

  it("returns required paths for a valid release", () => {
    const root = makeTempRoot();
    const releaseDir = writeRelease(root);

    const result = locatePluginRelease(root);

    assert.equal(result.releaseDir, releaseDir);
    assert.equal(result.manifestPath, path.join(releaseDir, "manifest.json"));
    assert.equal(result.entrypointPath, path.join(releaseDir, "index.js"));
    assert.equal(result.methodsPath, path.join(releaseDir, "methods.js"));
    assert.equal(result.packageJsonPath, path.join(releaseDir, "package.json"));
    assert.equal(result.packageLockPath, path.join(releaseDir, "package-lock.json"));
  });

  it("accepts the release directory itself as the selected folder", () => {
    const releaseDir = writeReleaseFiles(makeTempRoot());

    const result = locatePluginRelease(releaseDir);

    assert.equal(result.releaseDir, releaseDir);
    assert.equal(result.manifestPath, path.join(releaseDir, "manifest.json"));
  });

  it("accepts a versioned release folder inside release", () => {
    const root = makeTempRoot();
    const versionedReleaseDir = writeReleaseFiles(path.join(root, "release", "demo-plugin-1.0.1"));

    const result = locatePluginRelease(root);

    assert.equal(result.releaseDir, versionedReleaseDir);
    assert.equal(result.manifestPath, path.join(versionedReleaseDir, "manifest.json"));
  });
});
