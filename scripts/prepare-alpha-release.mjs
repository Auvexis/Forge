#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const nextVersion = process.argv[2]?.trim();
const alphaVersionPattern = /^\d+\.\d+\.\d+-alpha\.\d+$/;

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), "utf8"));
}

function writeJson(relativePath, value) {
  fs.writeFileSync(
    path.join(rootDir, relativePath),
    `${JSON.stringify(value, null, 2)}\n`,
  );
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function writeText(relativePath, value) {
  fs.writeFileSync(path.join(rootDir, relativePath), value);
}

function parseAlphaVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)-alpha\.(\d+)$/.exec(version);
  if (!match) {
    return null;
  }

  return match.slice(1).map(Number);
}

function compareAlphaVersions(left, right) {
  const leftParts = parseAlphaVersion(left);
  const rightParts = parseAlphaVersion(right);
  if (!leftParts || !rightParts) {
    fail("Both current and next versions must match X.Y.Z-alpha.N.");
  }

  for (let index = 0; index < leftParts.length; index += 1) {
    if (leftParts[index] > rightParts[index]) return 1;
    if (leftParts[index] < rightParts[index]) return -1;
  }

  return 0;
}

function ensureTagDoesNotExist(version) {
  const tagName = `v${version}`;

  try {
    execFileSync(
      "git",
      ["ls-remote", "--exit-code", "--tags", "origin", `refs/tags/${tagName}`],
      { cwd: rootDir, stdio: "ignore" },
    );
    fail(`Tag ${tagName} already exists on origin.`);
  } catch (error) {
    if (error.status === 2) {
      return;
    }

    throw error;
  }
}

function replaceAll(relativePath, replacements) {
  let text = readText(relativePath);
  for (const [from, to] of replacements) {
    text = text.split(from).join(to);
  }
  writeText(relativePath, text);
}

if (!nextVersion) {
  fail("Usage: npm run release:alpha:prepare -- 0.1.0-alpha.6");
}

if (!alphaVersionPattern.test(nextVersion)) {
  fail("Version must match X.Y.Z-alpha.N.");
}

const packageJson = readJson("package.json");
const currentVersion = packageJson.version;

if (!alphaVersionPattern.test(currentVersion)) {
  fail(`Current package.json version is not alpha: ${currentVersion}`);
}

if (compareAlphaVersions(nextVersion, currentVersion) <= 0) {
  fail(`Next version must be greater than current version ${currentVersion}.`);
}

ensureTagDoesNotExist(nextVersion);

packageJson.version = nextVersion;
writeJson("package.json", packageJson);

const packageLockJson = readJson("package-lock.json");
packageLockJson.version = nextVersion;
if (packageLockJson.packages?.[""]) {
  packageLockJson.packages[""].version = nextVersion;
}
writeJson("package-lock.json", packageLockJson);

const replacements = [
  [currentVersion, nextVersion],
  [`v${currentVersion}`, `v${nextVersion}`],
];

replaceAll("docker-compose.prod.yml", replacements);
replaceAll("docs/release-docker.md", replacements);
replaceAll("docs/release-npm.md", replacements);
replaceAll("README.md", replacements);
replaceAll("CHANGELOG.md", replacements);

console.log(`Prepared Fabric alpha release ${nextVersion}.`);
