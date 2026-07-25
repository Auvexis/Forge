import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(root, "apps", "api", "src", "plugins");
const targetRoot = path.join(root, "apps", "api", "dist", "plugins");
const ignoredExtensions = new Set([".ts", ".map"]);

function copyAssets(sourceDir, targetDir) {
  if (!fs.existsSync(sourceDir)) return;

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      copyAssets(sourcePath, targetPath);
      continue;
    }

    if (!entry.isFile() || ignoredExtensions.has(path.extname(entry.name))) continue;

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(sourcePath, targetPath);
  }
}

copyAssets(sourceRoot, targetRoot);
