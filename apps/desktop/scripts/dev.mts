import { spawn } from "node:child_process";
import electron from "electron";

const child = spawn(String(electron), ["."], {
  cwd: new URL("..", import.meta.url),
  stdio: "inherit",
  env: {
    ...process.env,
    FABRIC_DESKTOP_DEV: "true",
    FABRIC_DESKTOP_URL: process.env.FABRIC_DESKTOP_URL ?? "http://127.0.0.1:23800",
  },
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
