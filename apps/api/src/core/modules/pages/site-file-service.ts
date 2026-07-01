import path from "node:path";

import type { SailorSite, SiteFile, SiteFileKind } from "./site-types.ts";

const allowedRoots = new Set(["pages", "assets", "js", "css"]);
const allowedFileExtensions = new Set([
  ".css",
  ".js",
  ".html",
  ".json",
  ".txt",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".svg",
]);

export interface CreateSiteFileInput {
  path: string;
  kind: SiteFileKind;
  content?: string;
  mimeType?: string;
  size?: number;
  url?: string;
}

export function validateSiteProjectPath(value: string): string {
  const normalized = value.trim().replaceAll("\\", "/").replace(/^\/+/, "");
  if (
    !normalized ||
    normalized.startsWith("file://") ||
    normalized.split("/").includes("..") ||
    path.isAbsolute(value) ||
    /^[a-zA-Z]:[\\/]/.test(value)
  ) {
    throw new Error("Invalid site file path");
  }

  const [root] = normalized.split("/");
  if (!root || !allowedRoots.has(root)) {
    throw new Error("Invalid site file root");
  }

  const extension = path.posix.extname(normalized).toLowerCase();
  if (extension && !allowedFileExtensions.has(extension)) {
    throw new Error("Invalid site file extension");
  }

  return normalized.replace(/\/+/g, "/").replace(/\/$/, "");
}

export function createSiteFile(site: SailorSite, input: CreateSiteFileInput): SailorSite {
  const file = normalizeSiteFile(input);
  if (site.files.some((item) => item.path === file.path)) {
    throw new Error(`Site file already exists: ${file.path}`);
  }

  return {
    ...site,
    files: [...site.files, file],
    updatedAt: new Date().toISOString(),
  };
}

export function updateSiteFile(site: SailorSite, filePath: string, content: string): SailorSite {
  const normalizedPath = validateSiteProjectPath(filePath);
  let found = false;
  const files = site.files.map((file) => {
    if (file.path !== normalizedPath || file.kind === "folder") return file;
    found = true;
    return { ...file, content, updatedAt: new Date().toISOString() };
  });
  if (!found) throw new Error(`Site file not found: ${normalizedPath}`);
  return { ...site, files, updatedAt: new Date().toISOString() };
}

export function deleteSiteFile(site: SailorSite, filePath: string): SailorSite {
  const normalizedPath = validateSiteProjectPath(filePath);
  const files = site.files.filter((file) => file.path !== normalizedPath);
  if (files.length === site.files.length) throw new Error(`Site file not found: ${normalizedPath}`);
  return { ...site, files, updatedAt: new Date().toISOString() };
}

function normalizeSiteFile(input: CreateSiteFileInput): SiteFile {
  const filePath = validateSiteProjectPath(input.path);
  if (input.kind !== "folder" && !path.posix.extname(filePath)) {
    throw new Error("Site file extension is required");
  }

  return {
    path: filePath,
    kind: input.kind,
    content: input.kind === "file" ? input.content ?? "" : input.content,
    mimeType: input.mimeType,
    size: input.size,
    url: input.url,
    updatedAt: new Date().toISOString(),
  };
}
