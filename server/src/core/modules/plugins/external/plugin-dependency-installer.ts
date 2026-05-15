import childProcess from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export interface InstallPluginDependenciesOptions {
  execFile?: typeof childProcess.execFileSync;
  timeoutMs?: number;
}

export function installPluginDependencies(
  pluginDir: string,
  installId: string,
  logsDir: string,
  options: InstallPluginDependenciesOptions = {},
): void {
  if (!fs.existsSync(path.join(pluginDir, "package-lock.json"))) {
    throw new Error("Plugin dependency install requires package-lock.json");
  }

  fs.mkdirSync(logsDir, { recursive: true });
  const execFile = options.execFile ?? childProcess.execFileSync;

  try {
    const output = execFile("npm", ["ci", "--omit=dev", "--ignore-scripts"], {
      cwd: pluginDir,
      stdio: "pipe",
      timeout: options.timeoutMs ?? 60_000,
    });
    fs.writeFileSync(path.join(logsDir, `${installId}.log`), output.toString(), "utf8");
  } catch (error) {
    const output = error instanceof Error && "stdout" in error ? String((error as any).stdout ?? "") : "";
    const stderr = error instanceof Error && "stderr" in error ? String((error as any).stderr ?? "") : "";
    fs.writeFileSync(path.join(logsDir, `${installId}.log`), `${output}${stderr}`.slice(0, 200_000), "utf8");
    throw error;
  }
}
