#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const nextVersion = process.argv[2]?.trim();
const versionPattern = /^(\d+)\.(\d+)\.(\d+)(?:-(alpha|beta)\.(\d+))?$/;
const channelRank = { alpha: 0, beta: 1, stable: 2 };

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

function parseVersion(version) {
  const match = versionPattern.exec(version);
  if (!match) {
    return null;
  }

  const [, major, minor, patch, channel, prerelease] = match;
  return {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
    channel: channel ?? "stable",
    prerelease: prerelease === undefined ? null : Number(prerelease),
  };
}

function compareVersions(left, right) {
  const fields = ["major", "minor", "patch"];
  for (const field of fields) {
    if (left[field] > right[field]) return 1;
    if (left[field] < right[field]) return -1;
  }

  const leftRank = channelRank[left.channel];
  const rightRank = channelRank[right.channel];
  if (leftRank > rightRank) return 1;
  if (leftRank < rightRank) return -1;

  if (left.prerelease === null && right.prerelease === null) return 0;
  if (left.prerelease === null) return 1;
  if (right.prerelease === null) return -1;
  if (left.prerelease > right.prerelease) return 1;
  if (left.prerelease < right.prerelease) return -1;
  return 0;
}

function formatKind(version) {
  if (version.channel === "stable") return "stable";
  return version.channel;
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
  fail("Usage: npm run release:prepare -- 0.1.0-alpha.6");
}

const parsedNextVersion = parseVersion(nextVersion);
if (!parsedNextVersion) {
  fail("Version must match X.Y.Z, X.Y.Z-alpha.N, or X.Y.Z-beta.N.");
}

const packageJson = readJson("package.json");
const currentVersion = packageJson.version;
const parsedCurrentVersion = parseVersion(currentVersion);

if (!parsedCurrentVersion) {
  fail(`Current package.json version is invalid: ${currentVersion}`);
}

if (compareVersions(parsedNextVersion, parsedCurrentVersion) <= 0) {
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

console.log(`Prepared Fabric ${formatKind(parsedNextVersion)} release ${nextVersion}.`);
