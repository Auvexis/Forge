#!/usr/bin/env node

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiEntry = path.join(rootDir, "apps", "api", "dist", "core", "server.js");
const gatewayEntry = path.join(rootDir, "apps", "gateway", "dist", "server.js");
const clientDir = path.join(rootDir, "apps", "client", "dist");
const clientEntry = path.join(rootDir, "scripts", "serve-client-dist.mjs");

const apiPort = process.env.FABRIC_API_PORT ?? "23801";
const clientPort = process.env.FABRIC_CLIENT_PORT ?? "23802";
const gatewayPort = process.env.FABRIC_GATEWAY_PORT ?? process.env.PORT ?? "23800";
const gatewayUrl = process.env.FABRIC_PUBLIC_URL ?? `http://localhost:${gatewayPort}`;

assertBuiltFile(apiEntry, "API build is missing. Run `npm run build` before starting Fabric.");
assertBuiltFile(gatewayEntry, "Gateway build is missing. Run `npm run build` before starting Fabric.");
assertBuiltFile(path.join(clientDir, "index.html"), "Client build is missing. Run `npm run build` before starting Fabric.");

const children = [
  start("api", process.execPath, [apiEntry], {
    PORT: apiPort,
    CLIENT_ORIGIN: gatewayUrl,
    FABRIC_PUBLIC_URL: process.env.FABRIC_PUBLIC_URL ?? gatewayUrl,
  }),
  start("client", process.execPath, [clientEntry], {
    FABRIC_CLIENT_DIST: clientDir,
    FABRIC_CLIENT_PORT: clientPort,
  }),
  start("gateway", process.execPath, [gatewayEntry], {
    FABRIC_GATEWAY_PORT: gatewayPort,
    FABRIC_API_ORIGIN: `http://localhost:${apiPort}`,
    FABRIC_CLIENT_ORIGIN: `http://localhost:${clientPort}`,
  }),
];

console.log(`[FABRIC | CLI]: Fabric is starting at ${gatewayUrl}`);
console.log("[FABRIC | CLI]: Press Ctrl+C to stop.");

let shuttingDown = false;

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => shutdown(signal));
}

function start(name, command, args, env) {
  const child = spawn(command, args, {
    cwd: rootDir,
    env: { ...process.env, NODE_ENV: "production", ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk) => writePrefixed(name, chunk));
  child.stderr.on("data", (chunk) => writePrefixed(name, chunk));
  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    console.error(`[FABRIC | CLI]: ${name} exited with ${signal ?? code}`);
    shutdown("SIGTERM", code === 0 ? 0 : 1);
  });

  return child;
}

function writePrefixed(name, chunk) {
  for (const line of chunk.toString().split(/\r?\n/)) {
    if (line.length > 0) console.log(`[${name}] ${line}`);
  }
}

function shutdown(signal, exitCode = 0) {
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill(signal);
  }
  setTimeout(() => process.exit(exitCode), 300).unref();
}

function assertBuiltFile(filePath, message) {
  if (!fs.existsSync(filePath)) {
    console.error(`[FABRIC | CLI]: ${message}`);
    process.exit(1);
  }
}
