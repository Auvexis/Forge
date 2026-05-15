import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface PrepareNd8DataDirectoryOptions {
  dataDir: string;
  legacyDataDir?: string;
}

export type PrepareNd8DataDirectoryResult =
  | { copied: true; files: string[] }
  | { copied: false; reason: "no-legacy-data" | "target-not-empty" | "no-legacy-databases" };

export function resolveLegacyDataDir(): string {
  return path.resolve(__dirname, "../../../../config/data");
}

function listDatabaseFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".db"))
    .map((entry) => entry.name);
}

export function prepareNd8DataDirectory(
  options: PrepareNd8DataDirectoryOptions,
): PrepareNd8DataDirectoryResult {
  fs.mkdirSync(options.dataDir, { recursive: true });

  if (listDatabaseFiles(options.dataDir).length > 0) {
    return { copied: false, reason: "target-not-empty" };
  }

  const legacyDataDir = options.legacyDataDir ?? resolveLegacyDataDir();
  if (!fs.existsSync(legacyDataDir)) {
    return { copied: false, reason: "no-legacy-data" };
  }

  const files = listDatabaseFiles(legacyDataDir);
  if (files.length === 0) {
    return { copied: false, reason: "no-legacy-databases" };
  }

  for (const file of files) {
    fs.copyFileSync(path.join(legacyDataDir, file), path.join(options.dataDir, file));
  }

  return { copied: true, files };
}
