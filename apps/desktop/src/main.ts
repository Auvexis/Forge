import { app, BrowserWindow, ipcMain, nativeImage, Notification as NativeNotification, shell, Menu, Tray } from "electron";
import type { Event as ElectronEvent, NativeImage, Rectangle } from "electron";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import path from "node:path";
import { applyRenderizerElectronConfig, type RenderizerElectronConfig } from "@renderizer/vue/electron";
import { checkDesktopUpdate, type DesktopUpdateChannel } from "./updates.js";
import { WorkspaceWindowManager, type WorkspaceWindowAction } from "./workspace-window-manager.js";

const desktopUrl = process.env.FABRIC_DESKTOP_URL ?? "http://127.0.0.1:23800";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const splashMinMs = 1400;
const appIconPath = path.join(__dirname, "assets", "icon.svg");
const trayIconSize = process.platform === "win32" ? 16 : 22;
const desktopAppId = "com.auvexis.fabric";
const renderizerElectronConfig = readRenderizerElectronConfig();

applyRenderizerElectronConfig(app, renderizerElectronConfig);

if (process.platform === "win32") {
  app.setAppUserModelId(desktopAppId);
}

let splashWindow: BrowserWindow | null = null;
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let workspaceWindowManager: WorkspaceWindowManager | null = null;
let parkedMainWindowBounds: Rectangle | null = null;
let isMainWindowParked = false;

interface DesktopPreferences {
  minimizeToTray: boolean;
  closeToTray: boolean;
  openAtLogin: boolean;
}

const desktopPreferences: DesktopPreferences = {
  minimizeToTray: true,
  closeToTray: true,
  openAtLogin: false,
};

function readRenderizerElectronConfig(): RenderizerElectronConfig {
  try {
    return JSON.parse(
      readFileSync(path.join(__dirname, "renderizer-electron-config.json"), "utf8"),
    ) as RenderizerElectronConfig;
  } catch {
    return {};
  }
}

function createAppIcon(): NativeImage {
  const icon = nativeImage.createFromPath(appIconPath);
  if (icon.isEmpty()) return icon;
  return icon;
}

function applyWindowsAppIdentity(window: BrowserWindow): void {
  if (process.platform === "win32") {
    window.setAppDetails({ appId: desktopAppId });
  }
}

function shouldKeepMainRendererVisible(): boolean {
  return workspaceWindowManager?.hasOpenWindows() === true;
}

function parkMainWindow(window: BrowserWindow): void {
  if (isMainWindowParked) return;
  parkedMainWindowBounds = window.getBounds();
  isMainWindowParked = true;
  window.setSkipTaskbar(true);
  window.setIgnoreMouseEvents(true);
  window.setFocusable(false);
  window.setOpacity(0.01);
}

function restoreParkedMainWindow(window: BrowserWindow): void {
  if (!isMainWindowParked) return;
  isMainWindowParked = false;
  window.setOpacity(1);
  window.setFocusable(true);
  window.setIgnoreMouseEvents(false);
  window.setSkipTaskbar(false);
  if (parkedMainWindowBounds) {
    window.setBounds(parkedMainWindowBounds);
    parkedMainWindowBounds = null;
  }
}

function createTrayIcon(): NativeImage {
  const icon = createAppIcon();
  if (icon.isEmpty()) return icon;
  const resized = icon.resize({ width: trayIconSize, height: trayIconSize });
  resized.setTemplateImage(process.platform === "darwin");
  return resized;
}

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
    icon: createAppIcon(),
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
    },
  });

  applyWindowsAppIdentity(window);

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
    frame: false,
    show: false,
    icon: createAppIcon(),
    backgroundColor: "#111318",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      ...renderizerElectronConfig.defaultWebPreferences,
    },
  });

  applyWindowsAppIdentity(window);

  const sendWindowState = () => {
    window.webContents.send("fabric-desktop-window-state", {
      isMaximized: window.isMaximized(),
      isFullScreen: window.isFullScreen(),
    });
  };

  window.on("maximize", sendWindowState);
  window.on("unmaximize", sendWindowState);
  window.on("restore", sendWindowState);
  window.on("enter-full-screen", sendWindowState);
  window.on("leave-full-screen", sendWindowState);
  window.webContents.once("did-finish-load", sendWindowState);
  window.on("minimize" as never, (event: ElectronEvent) => {
    if (!desktopPreferences.minimizeToTray) return;
    event.preventDefault();
    if (shouldKeepMainRendererVisible()) {
      parkMainWindow(window);
      return;
    }
    window.hide();
  });
  window.on("close", (event) => {
    if (isQuitting || !desktopPreferences.closeToTray) return;
    event.preventDefault();
    if (shouldKeepMainRendererVisible()) {
      parkMainWindow(window);
      return;
    }
    window.hide();
  });
  window.once("ready-to-show", () => {
    sendWindowState();
    window.show();
  });
  workspaceWindowManager = new WorkspaceWindowManager(
    path.join(__dirname, "preload.js"),
    createAppIcon(),
    openExternalUrl,
    desktopAppId,
    renderizerElectronConfig,
  );
  workspaceWindowManager.attachTo(window);
  void window.loadURL(desktopUrl);

  return window;
}

function showMainWindow(): void {
  if (!mainWindow) {
    mainWindow = createMainWindow();
  }

  restoreParkedMainWindow(mainWindow);
  mainWindow.show();
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.focus();
}

function getFocusedMainWindow(): BrowserWindow | null {
  return BrowserWindow.getFocusedWindow() ?? mainWindow;
}

ipcMain.handle("fabric-desktop-window-minimize", () => {
  getFocusedMainWindow()?.minimize();
});

ipcMain.handle("fabric-desktop-window-toggle-maximize", () => {
  const window = getFocusedMainWindow();
  if (!window) return;
  if (window.isMaximized()) {
    window.unmaximize();
  } else {
    window.maximize();
  }
});

ipcMain.handle("fabric-desktop-window-close", () => {
  getFocusedMainWindow()?.close();
});

ipcMain.handle("fabric-desktop-workspace-ready", (event, workspaceId: string) => {
  workspaceWindowManager?.show(event, workspaceId);
});

ipcMain.handle(
  "fabric-desktop-workspace-control",
  (event, workspaceId: string, action: WorkspaceWindowAction) => {
    workspaceWindowManager?.control(event, workspaceId, action);
  },
);

ipcMain.handle("fabric-desktop-workspace-state", (event, workspaceId: string) =>
  workspaceWindowManager?.getState(event, workspaceId) ?? {
    isMaximized: false,
    isFullScreen: false,
  },
);

ipcMain.handle("fabric-desktop-preferences-set", (_event, preferences: Partial<DesktopPreferences>) => {
  applyDesktopPreferences(preferences);
});

ipcMain.handle("fabric-desktop-update-check", async (_event, channel: DesktopUpdateChannel = "safe") =>
  checkDesktopUpdate(app.getVersion(), channel),
);

ipcMain.handle("fabric-desktop-open-external", async (_event, url: string) => {
  await openExternalUrl(url);
});

ipcMain.handle("fabric-desktop-restart", () => {
  app.relaunch();
  app.exit(0);
});

async function openExternalUrl(url: string): Promise<void> {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Only HTTP(S) URLs can be opened externally");
  }
  await shell.openExternal(parsed.toString());
}

ipcMain.handle(
  "fabric-desktop-notify",
  (_event, payload: { title?: string; body?: string; silent?: boolean }) => {
    const title = sanitizeNotificationText(payload?.title, "Fabric");
    const body = sanitizeNotificationText(payload?.body, "");
    const window = mainWindow;

    if (!NativeNotification.isSupported() || window?.isFocused()) {
      return false;
    }

    const notification = new NativeNotification({
      title,
      body,
      silent: payload?.silent === true,
      icon: createAppIcon(),
    });

    notification.on("click", () => {
      mainWindow?.show();
      mainWindow?.focus();
    });
    notification.show();
    return true;
  },
);

function sanitizeNotificationText(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  return value.replace(/\s+/g, " ").trim().slice(0, 240) || fallback;
}

function createTray(): void {
  if (tray) return;

  tray = new Tray(createTrayIcon());
  tray.setToolTip("Fabric");
  tray.on("click", showMainWindow);
  updateTrayMenu();
}

function updateTrayMenu(): void {
  if (!tray) return;

  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Open Fabric", click: showMainWindow },
    { type: "separator" },
    {
      label: "Quit Fabric",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]));
}

function applyDesktopPreferences(preferences: Partial<DesktopPreferences>): void {
  desktopPreferences.minimizeToTray = preferences.minimizeToTray !== false;
  desktopPreferences.closeToTray = preferences.closeToTray !== false;
  desktopPreferences.openAtLogin = preferences.openAtLogin === true;

  app.setLoginItemSettings({
    openAtLogin: desktopPreferences.openAtLogin,
  });

  createTray();
  updateTrayMenu();
}

ipcMain.handle("fabric-desktop-window-state", () => ({
  isMaximized: getFocusedMainWindow()?.isMaximized() ?? false,
  isFullScreen: getFocusedMainWindow()?.isFullScreen() ?? false,
}));

function clampZoomFactor(zoomFactor: number): number {
  return Math.min(1.5, Math.max(0.75, zoomFactor));
}

ipcMain.handle("fabric-desktop-zoom-get", () => getFocusedMainWindow()?.webContents.getZoomFactor() ?? 1);

ipcMain.handle("fabric-desktop-zoom-set", (_event, zoomFactor: number) => {
  const window = getFocusedMainWindow();
  if (!window || !Number.isFinite(zoomFactor)) return 1;
  const nextZoomFactor = clampZoomFactor(zoomFactor);
  window.webContents.setZoomFactor(nextZoomFactor);
  window.webContents.send("fabric-desktop-zoom-change", { zoomFactor: nextZoomFactor });
  return nextZoomFactor;
});

app.whenReady().then(async () => {
  const splashStartedAt = Date.now();
  createTray();
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

app.on("before-quit", () => {
  workspaceWindowManager?.closeAll();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createMainWindow();
  }
});
