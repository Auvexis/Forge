import { readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const testFiles = [];

function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(path);
      continue;
    }
    if (entry.name.endsWith(".test.ts") && !entry.name.endsWith(".vitest.test.ts")) {
      testFiles.push(path);
    }
  }
}

walk(join(root, "src"));

if (testFiles.length === 0) {
  console.log("No node:test files found.");
  process.exit(0);
}

const result = spawnSync(process.execPath, ["--import", "tsx", "--test", ...testFiles], {
  cwd: root,
  stdio: "inherit",
  shell: false,
});

process.exit(result.status ?? 1);
