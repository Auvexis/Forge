import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { installPluginDependencies } from "./plugin-dependency-installer.ts";

describe("installPluginDependencies", () => {
  it("runs npm ci in the plugin folder with dev deps omitted and scripts ignored", () => {
    const pluginDir = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-plugin-deps-"));
    fs.writeFileSync(path.join(pluginDir, "package-lock.json"), "{}");
    const logDir = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-plugin-logs-"));
    const calls: any[] = [];

    installPluginDependencies(pluginDir, "install-id", logDir, {
      execFile: ((command: string, args: string[], options: { cwd: string; shell: boolean; timeout: number }) => {
        calls.push({ command, args, cwd: options.cwd, shell: options.shell, timeout: options.timeout });
        return Buffer.from("ok");
      }) as any,
      timeoutMs: 1234,
    });

    assert.deepEqual(calls, [
      {
        command: process.platform === "win32" ? "npm.cmd" : "npm",
        args: ["ci", "--omit=dev", "--ignore-scripts"],
        cwd: pluginDir,
        shell: process.platform === "win32",
        timeout: 1234,
      },
    ]);
    assert.equal(fs.readFileSync(path.join(logDir, "install-id.log"), "utf8"), "ok");
  });

  it("uses npm.cmd on Windows", () => {
    const pluginDir = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-plugin-deps-"));
    fs.writeFileSync(path.join(pluginDir, "package-lock.json"), "{}");
    const logDir = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-plugin-logs-"));
    const calls: any[] = [];

    installPluginDependencies(pluginDir, "install-id", logDir, {
      platform: "win32",
      execFile: ((command: string, args: string[], options: { shell: boolean }) => {
        calls.push({ command, args, shell: options.shell });
        return Buffer.from("ok");
      }) as any,
    });

    assert.equal(calls[0].command, "npm.cmd");
    assert.equal(calls[0].shell, true);
  });

  it("requires package-lock.json before installing dependencies", () => {
    const pluginDir = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-plugin-deps-"));
    const logDir = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-plugin-logs-"));

    assert.throws(() => installPluginDependencies(pluginDir, "install-id", logDir), /package-lock\.json/);
  });
});
