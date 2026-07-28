import { defineConfig, devices } from "@playwright/test";
import os from "node:os";
import path from "node:path";

const gatewayPort = process.env.FABRIC_E2E_GATEWAY_PORT ?? "24800";
const apiPort = process.env.FABRIC_E2E_API_PORT ?? "24801";
const clientPort = process.env.FABRIC_E2E_CLIENT_PORT ?? "24802";
const baseURL = `http://127.0.0.1:${gatewayPort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm start",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      FABRIC_HOME:
        process.env.FABRIC_E2E_HOME ??
        path.join(os.tmpdir(), `fabric-e2e-${process.pid}`),
      FABRIC_GATEWAY_PORT: gatewayPort,
      FABRIC_API_PORT: apiPort,
      FABRIC_CLIENT_PORT: clientPort,
      FABRIC_PUBLIC_URL: baseURL,
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
