import { copyFile, cp, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import renderizerConfig from "../../../renderizer.config.ts";

const resolvedRenderizerConfig =
  "default" in renderizerConfig
    ? (renderizerConfig.default as typeof renderizerConfig)
    : renderizerConfig;
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = path.join(rootDir, "src");
const assetsDir = path.join(rootDir, "assets");
const distDir = path.join(rootDir, "dist");

await mkdir(distDir, { recursive: true });
await copyFile(path.join(srcDir, "splash.html"), path.join(distDir, "splash.html"));
await cp(assetsDir, path.join(distDir, "assets"), { recursive: true });
await writeFile(
  path.join(distDir, "renderizer-electron-config.json"),
  JSON.stringify(resolvedRenderizerConfig.electron ?? {}, null, 2),
);
