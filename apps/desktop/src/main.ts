import { app, BrowserWindow, ipcMain, shell } from "electron";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const desktopUrl = process.env.FABRIC_DESKTOP_URL ?? "http://127.0.0.1:23800";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const splashMinMs = 1400;

let splashWindow: BrowserWindow | null = null;
let mainWindow: BrowserWindow | null = null;

function resolveUrl(pathname: string): string {
  return new URL(pathname, desktopUrl).toString();
}

async function waitForApi(timeoutMs = 45000): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(resolveUrl("/profiles"), {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const contentType = response.headers.get("content-type") ?? "";
      if (response.ok && contentType.includes("application/json")) {
        return;
      }
    } catch {
      // The dev API/gateway may still be starting.
    }

    await sleep(500);
  }

  throw new Error(`Fabric API did not become ready at ${resolveUrl("/profiles")}`);
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
  window.webContents.setWindowOpenHandler(({ url }) => {
    void openExternalUrl(url);
    return { action: "deny" };
  });
  void window.loadURL(desktopUrl);

  return window;
}

ipcMain.handle("fabric-desktop-open-external", async (_event, url: string) => {
  await openExternalUrl(url);
});

async function openExternalUrl(url: string): Promise<void> {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Only HTTP(S) URLs can be opened externally");
  }
  await shell.openExternal(parsed.toString());
}

app.whenReady().then(async () => {
  const splashStartedAt = Date.now();
  splashWindow = createSplashWindow();

  try {
    await waitForApi();
    const remainingSplashMs = splashMinMs - (Date.now() - splashStartedAt);
    if (remainingSplashMs > 0) {
      await sleep(remainingSplashMs);
    }
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
