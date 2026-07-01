import fs from "node:fs";
import path from "node:path";
import { randomInt } from "node:crypto";

import { PageRepository } from "./page-repository.ts";
import { validateSiteProjectPath } from "./site-file-service.ts";
import { SiteRepository } from "./site-repository.ts";
import type { PageBlockStyles, SailorPage } from "./page-types.ts";
import type { SailorSite, SiteFile } from "./site-types.ts";

export interface SiteProjectArchive {
  manifest: {
    schemaVersion: 1;
    site: {
      name: string;
      slug: string;
      homePageId: string | null;
    };
  };
  pages: Array<{
    id: string;
    title: string;
    slug: string;
    bodyStyles?: PageBlockStyles;
    blocks: SailorPage["blocks"];
  }>;
  files: SiteFile[];
  assets: Array<{
    path: string;
    mimeType?: string;
    base64: string;
  }>;
}

export class SiteProjectArchiveService {
  private readonly assetStorageRoot: string;

  constructor(options: { assetStorageRoot: string }) {
    this.assetStorageRoot = options.assetStorageRoot;
  }

  exportSite(profileId: string, siteId: string): SiteProjectArchive {
    const site = SiteRepository.getSite(profileId, siteId);
    if (!site) throw new Error("Site not found.");
    const pages = PageRepository.listPages(profileId, siteId);

    return {
      manifest: {
        schemaVersion: 1,
        site: {
          name: site.name,
          slug: site.slug,
          homePageId: site.homePageId,
        },
      },
      pages: pages.map((page) => ({
        id: page.id,
        title: page.title,
        slug: page.slug,
        bodyStyles: page.bodyStyles,
        blocks: page.blocks,
      })),
      files: site.files.map((file) => ({ ...file })),
      assets: site.files
        .filter((file) => file.kind === "asset")
        .map((file) => ({
          path: file.path,
          mimeType: file.mimeType,
          base64: this.readAssetBase64(profileId, siteId, file.path),
        })),
    };
  }

  exportSiteZip(profileId: string, siteId: string): Buffer {
    const archive = this.exportSite(profileId, siteId);
    const files = [
      {
        path: "sailor-project.json",
        content: Buffer.from(JSON.stringify(archive, null, 2), "utf8"),
      },
      ...archive.assets.map((asset) => ({
        path: asset.path,
        content: Buffer.from(asset.base64, "base64"),
      })),
    ];
    return createZip(files);
  }

  archiveFromUpload(filename: string, buffer: Buffer): SiteProjectArchive {
    const normalizedName = filename.toLowerCase();
    if (normalizedName.endsWith(".json")) {
      return JSON.parse(buffer.toString("utf8")) as SiteProjectArchive;
    }
    if (!normalizedName.endsWith(".zip")) throw new Error("Site project import must be a .zip or .json file.");
    const projectJson = readZipFile(buffer, "sailor-project.json");
    if (!projectJson) throw new Error("Missing sailor-project.json in site project zip.");
    return JSON.parse(projectJson.toString("utf8")) as SiteProjectArchive;
  }

  importSite(profileId: string, archive: SiteProjectArchive): SailorSite {
    this.validateArchive(archive);
    const now = new Date().toISOString();
    const siteId = createSiteId();
    const site: SailorSite = {
      id: siteId,
      publicId: createProjectPublicId(),
      profileId,
      name: archive.manifest.site.name,
      slug: this.uniqueSiteSlug(profileId, archive.manifest.site.slug),
      homePageId: null,
      files: archive.files.map((file) => ({ ...file, updatedAt: file.updatedAt ?? now })),
      createdAt: now,
      updatedAt: now,
    };

    const savedSite = SiteRepository.saveSite(site);
    const pageIdMap = new Map<string, string>();
    for (const page of archive.pages) {
      const nextId = createPageId();
      pageIdMap.set(page.id, nextId);
      PageRepository.savePage({
        id: nextId,
        profileId,
        siteId,
        title: page.title,
        slug: this.uniquePageSlug(profileId, siteId, page.slug),
        bodyStyles: page.bodyStyles,
        blocks: page.blocks,
        createdAt: now,
        updatedAt: now,
      });
    }

    for (const asset of archive.assets) {
      this.writeAsset(profileId, siteId, asset.path, Buffer.from(asset.base64, "base64"));
    }

    const mappedHomePageId = archive.manifest.site.homePageId ? pageIdMap.get(archive.manifest.site.homePageId) ?? null : null;
    return SiteRepository.saveSite({ ...savedSite, homePageId: mappedHomePageId, updatedAt: now });
  }

  private validateArchive(archive: SiteProjectArchive): void {
    if (archive.manifest?.schemaVersion !== 1) throw new Error("Invalid site archive schema.");
    if (!archive.manifest.site.name.trim()) throw new Error("Site archive name is required.");
    for (const file of archive.files) validateSiteProjectPath(file.path);
    for (const asset of archive.assets) validateSiteProjectPath(asset.path);
  }

  private readAssetBase64(profileId: string, siteId: string, filePath: string): string {
    const targetPath = this.assetPath(profileId, siteId, filePath);
    if (!fs.existsSync(targetPath)) return "";
    return fs.readFileSync(targetPath).toString("base64");
  }

  private writeAsset(profileId: string, siteId: string, filePath: string, buffer: Buffer): void {
    const targetPath = this.assetPath(profileId, siteId, filePath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, buffer);
  }

  private assetPath(profileId: string, siteId: string, filePath: string): string {
    const normalized = validateSiteProjectPath(filePath);
    return path.join(this.assetStorageRoot, profileId, siteId, normalized);
  }

  private uniqueSiteSlug(profileId: string, slug: string): string {
    const baseSlug = slug || "site";
    let candidate = baseSlug;
    let suffix = 2;
    while (SiteRepository.getSiteBySlug(profileId, candidate)) {
      candidate = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  private uniquePageSlug(profileId: string, siteId: string, slug: string): string {
    const baseSlug = slug || "page";
    let candidate = baseSlug;
    let suffix = 2;
    while (PageRepository.getPageBySlug(profileId, candidate, siteId)) {
      candidate = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }
}

function createZip(files: Array<{ path: string; content: Buffer }>): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file.path.replaceAll("\\", "/"), "utf8");
    const crc = crc32(file.content);
    const local = Buffer.concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(file.content.length),
      u32(file.content.length),
      u16(name.length),
      u16(0),
      name,
      file.content,
    ]);
    const central = Buffer.concat([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(file.content.length),
      u32(file.content.length),
      u16(name.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      name,
    ]);
    localParts.push(local);
    centralParts.push(central);
    offset += local.length;
  }

  const central = Buffer.concat(centralParts);
  const end = Buffer.concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(central.length),
    u32(offset),
    u16(0),
  ]);

  return Buffer.concat([...localParts, central, end]);
}

function readZipFile(zip: Buffer, targetPath: string): Buffer | null {
  let offset = 0;
  const normalizedTarget = targetPath.replaceAll("\\", "/");

  while (offset + 30 <= zip.length) {
    const signature = zip.readUInt32LE(offset);
    if (signature !== 0x04034b50) break;

    const flags = zip.readUInt16LE(offset + 6);
    const method = zip.readUInt16LE(offset + 8);
    const compressedSize = zip.readUInt32LE(offset + 18);
    const uncompressedSize = zip.readUInt32LE(offset + 22);
    const nameLength = zip.readUInt16LE(offset + 26);
    const extraLength = zip.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const dataEnd = dataStart + compressedSize;
    const name = zip.subarray(nameStart, nameStart + nameLength).toString("utf8").replaceAll("\\", "/");

    if (dataEnd > zip.length) throw new Error("Invalid site project zip.");
    if (flags & 0x08) throw new Error("Unsupported site project zip format.");
    if (name === normalizedTarget) {
      if (method !== 0) throw new Error("Compressed site project zips are not supported yet.");
      const content = zip.subarray(dataStart, dataEnd);
      if (content.length !== uncompressedSize) throw new Error("Invalid site project zip entry.");
      return content;
    }

    offset = dataEnd;
  }

  return null;
}

function u16(value: number): Buffer {
  const buffer = Buffer.allocUnsafe(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function u32(value: number): Buffer {
  const buffer = Buffer.allocUnsafe(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createSiteId(): string {
  return `site_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createProjectPublicId(): string {
  const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-";
  return Array.from({ length: 10 }, () => alphabet[randomInt(alphabet.length)]).join("");
}

function createPageId(): string {
  return `page_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
