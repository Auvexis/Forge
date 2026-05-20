import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

import type { ProfilePaths } from "../../profiles/profile-paths.ts";
import { validatePluginCreatorId } from "./plugin-blueprint-validation.ts";
import { resolveBlueprintPaths } from "./plugin-creator-paths.ts";

export interface PluginExportServiceDependencies {
  profilePaths: ProfilePaths;
}

export interface PluginCreatorZipExport {
  zipPath: string;
  bytes: number;
}

export interface PluginCreatorFolderExport {
  destinationDir: string;
}

interface ZipEntry {
  relativePath: string;
  data: Buffer;
}

export class PluginExportService {
  private readonly profilePaths: ProfilePaths;

  constructor(dependencies: PluginExportServiceDependencies) {
    this.profilePaths = dependencies.profilePaths;
  }

  exportZip(blueprintId: string, version: string): PluginCreatorZipExport {
    const paths = resolveBlueprintPaths(this.profilePaths, validatePluginCreatorId(blueprintId));
    const validVersion = validateVersion(version);
    const releaseDir = paths.releaseDir(validVersion);
    assertExistingRelease(releaseDir);

    const zipPath = paths.exportZipPath(validVersion);
    fs.mkdirSync(path.dirname(zipPath), { recursive: true });
    const buffer = createZipBuffer(readZipEntries(releaseDir));
    fs.writeFileSync(zipPath, buffer);

    return {
      zipPath,
      bytes: buffer.byteLength,
    };
  }

  exportFolder(blueprintId: string, version: string, destinationDir: string): PluginCreatorFolderExport {
    const paths = resolveBlueprintPaths(this.profilePaths, validatePluginCreatorId(blueprintId));
    const validVersion = validateVersion(version);
    const releaseDir = paths.releaseDir(validVersion);
    assertExistingRelease(releaseDir);
    assertSafeDestination(destinationDir);

    if (fs.existsSync(destinationDir)) {
      throw new Error("export_destination_exists");
    }

    copyDirectory(releaseDir, destinationDir);
    return { destinationDir };
  }
}

function validateVersion(version: string): string {
  if (!/^[a-zA-Z0-9._-]+$/.test(version)) {
    throw new Error("Invalid plugin creator version");
  }
  return version;
}

function assertExistingRelease(releaseDir: string): void {
  if (!fs.existsSync(releaseDir) || !fs.statSync(releaseDir).isDirectory()) {
    throw new Error("release_not_found");
  }
}

function assertSafeDestination(destinationDir: string): void {
  if (!path.isAbsolute(destinationDir)) {
    throw new Error("Export destination must be absolute");
  }

  if (destinationDir.split(/[\\/]+/).includes("..")) {
    throw new Error("Export destination must stay inside its parent directory");
  }

  const parent = path.dirname(destinationDir);
  const normalized = path.resolve(destinationDir);
  const relative = path.relative(parent, normalized);
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Export destination must stay inside its parent directory");
  }
}

function copyDirectory(sourceDir: string, targetDir: string): void {
  fs.mkdirSync(targetDir, { recursive: true });
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
      continue;
    }
    fs.copyFileSync(sourcePath, targetPath);
  }
}

function readZipEntries(releaseDir: string): ZipEntry[] {
  const entries: ZipEntry[] = [];
  const walk = (currentDir: string) => {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(absolutePath);
        continue;
      }
      if (!entry.isFile()) continue;

      entries.push({
        relativePath: path.relative(releaseDir, absolutePath).replaceAll(path.sep, "/"),
        data: fs.readFileSync(absolutePath),
      });
    }
  };
  walk(releaseDir);
  return entries.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

function createZipBuffer(entries: ZipEntry[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.relativePath, "utf8");
    const compressed = zlib.deflateRawSync(entry.data);
    const crc = crc32(entry.data);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(8, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.byteLength, 18);
    localHeader.writeUInt32LE(entry.data.byteLength, 22);
    localHeader.writeUInt16LE(name.byteLength, 26);
    localHeader.writeUInt16LE(0, 28);
    localParts.push(localHeader, name, compressed);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressed.byteLength, 20);
    centralHeader.writeUInt32LE(entry.data.byteLength, 24);
    centralHeader.writeUInt16LE(name.byteLength, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, name);

    offset += localHeader.byteLength + name.byteLength + compressed.byteLength;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.byteLength, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, ...centralParts, end]);
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff]!;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const crcTable = Array.from({ length: 256 }, (_value, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = (crc & 1) === 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});
