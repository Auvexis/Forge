import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import png2icons from "png2icons";
import sharp from "sharp";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assetsDir = path.join(rootDir, "assets");
const sourceSvg = path.join(assetsDir, "icon.svg");

await mkdir(assetsDir, { recursive: true });

const png1024 = await sharp(sourceSvg).resize(1024, 1024).png().toBuffer();
const png512 = await sharp(sourceSvg).resize(512, 512).png().toBuffer();
const png256 = await sharp(sourceSvg).resize(256, 256).png().toBuffer();

await writeFile(path.join(assetsDir, "icon.png"), png512);
await writeFile(path.join(assetsDir, "icon-1024.png"), png1024);

const ico = png2icons.createICO(png256, png2icons.BILINEAR, 0);
if (!ico) {
  throw new Error("Could not generate Windows icon");
}
await writeFile(path.join(assetsDir, "icon.ico"), ico);

const icns = png2icons.createICNS(png1024, png2icons.BILINEAR, 0);
if (!icns) {
  throw new Error("Could not generate macOS icon");
}
await writeFile(path.join(assetsDir, "icon.icns"), icns);
