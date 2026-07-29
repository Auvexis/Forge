import { app, BrowserWindow } from "electron";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const desktopUrl = process.env.FABRIC_DESKTOP_URL ?? "http://127.0.0.1:23800";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

let splashWindow: BrowserWindow | null = null;
let mainWindow: BrowserWindow | null = null;

async function waitForGateway(url: string, timeoutMs = 30000): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { method: "GET" });
      if (response.ok) {
        return;
      }
    } catch {
      // The dev gateway may still be starting.
    }

    await sleep(500);
  }

  throw new Error(`Fabric gateway did not become ready at ${url}`);
}

function createSplashWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 360,
    height: 280,
    resizable: false,
    frame: false,
    transparent: true,
    show: false,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
    },
  });

  window.once("ready-to-show", () => window.show());
  void window.loadFile(path.join(__dirname, "splash.html"));

  return window;
}

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    show: false,
    backgroundColor: "#111318",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  window.once("ready-to-show", () => window.show());
  void window.loadURL(desktopUrl);

  return window;
}

app.whenReady().then(async () => {
  splashWindow = createSplashWindow();

  try {
    await waitForGateway(desktopUrl);
    mainWindow = createMainWindow();
    splashWindow.close();
    splashWindow = null;
  } catch (error) {
    console.error(error);
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createMainWindow();
  }
});
