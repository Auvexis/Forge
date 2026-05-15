import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { installPluginDependencies } from "./plugin-dependency-installer.ts";

describe("installPluginDependencies", () => {
  it("runs npm ci in the plugin folder with dev deps omitted and scripts ignored", () => {
    const pluginDir = fs.mkdtempSync(path.join(os.tmpdir(), "nd8-plugin-deps-"));
    fs.writeFileSync(path.join(pluginDir, "package-lock.json"), "{}");
    const logDir = fs.mkdtempSync(path.join(os.tmpdir(), "nd8-plugin-logs-"));
    const calls: any[] = [];

    installPluginDependencies(pluginDir, "install-id", logDir, {
      execFile: ((command: string, args: string[], options: { cwd: string; timeout: number }) => {
        calls.push({ command, args, cwd: options.cwd, timeout: options.timeout });
        return Buffer.from("ok");
      }) as any,
      timeoutMs: 1234,
    });

    assert.deepEqual(calls, [
      {
        command: "npm",
        args: ["ci", "--omit=dev", "--ignore-scripts"],
        cwd: pluginDir,
        timeout: 1234,
      },
    ]);
    assert.equal(fs.readFileSync(path.join(logDir, "install-id.log"), "utf8"), "ok");
  });

  it("requires package-lock.json before installing dependencies", () => {
    const pluginDir = fs.mkdtempSync(path.join(os.tmpdir(), "nd8-plugin-deps-"));
    const logDir = fs.mkdtempSync(path.join(os.tmpdir(), "nd8-plugin-logs-"));

    assert.throws(() => installPluginDependencies(pluginDir, "install-id", logDir), /package-lock\.json/);
  });
});
