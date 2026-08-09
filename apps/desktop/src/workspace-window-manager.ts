import { BrowserWindow } from "electron";
import type { IpcMainInvokeEvent, NativeImage, WebContents } from "electron";
import path from "node:path";

export interface WorkspaceWindowState {
  isMaximized: boolean;
  isFullScreen: boolean;
}

export type WorkspaceWindowAction =
  | "minimize"
  | "toggle-maximize"
  | "close"
  | "focus";

const workspaceFramePrefix = "fabric-workspace:";
const workspaceIdPattern = /^[a-z0-9][a-z0-9:_-]{0,127}$/;

type WindowFeatures = Record<string, string>;

function parseWindowFeatures(features: string): WindowFeatures {
  return features
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce<WindowFeatures>((parsed, item) => {
      const [rawKey, ...rawValue] = item.split("=");
      const key = rawKey.trim().toLowerCase();
      if (!key) return parsed;
      parsed[key] = rawValue.join("=").trim();
      return parsed;
    }, {});
}

function readNumberFeature(
  features: WindowFeatures,
  key: string,
  fallback: number,
): number {
  const value = Number(features[key.toLowerCase()]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function readBooleanFeature(
  features: WindowFeatures,
  key: string,
  fallback: boolean,
): boolean {
  const value = features[key.toLowerCase()];
  if (value === undefined || value === "") return fallback;
  if (["1", "true", "yes"].includes(value.toLowerCase())) return true;
  if (["0", "false", "no"].includes(value.toLowerCase())) return false;
  return fallback;
}

export function workspaceIdFromFrameName(frameName: string): string | null {
  if (!frameName.startsWith(workspaceFramePrefix)) return null;
  const workspaceId = frameName.slice(workspaceFramePrefix.length);
  return workspaceIdPattern.test(workspaceId) ? workspaceId : null;
}

export class WorkspaceWindowManager {
  private readonly windows = new Map<string, BrowserWindow>();
  private opener: WebContents | null = null;

  constructor(
    private readonly preloadPath: string,
    private readonly icon: NativeImage,
    private readonly openExternal: (url: string) => Promise<void>,
    private readonly appId: string,
  ) {}

  attachTo(opener: BrowserWindow): void {
    this.opener = opener.webContents;
    opener.webContents.setWindowOpenHandler(({ url, frameName, features }) => {
      const workspaceId = workspaceIdFromFrameName(frameName);
      if (url !== "about:blank" || !workspaceId) {
        if (url.startsWith("https://") || url.startsWith("http://")) {
          void this.openExternal(url);
        }
        return { action: "deny" };
      }

      const windowFeatures = parseWindowFeatures(features);
      const width = readNumberFeature(windowFeatures, "width", 1180);
      const height = readNumberFeature(windowFeatures, "height", 780);
      const minWidth = readNumberFeature(windowFeatures, "minwidth", 720);
      const minHeight = readNumberFeature(windowFeatures, "minheight", 480);
      const resizable = readBooleanFeature(windowFeatures, "resizable", true);

      return {
        action: "allow",
        overrideBrowserWindowOptions: {
          width,
          height,
          minWidth,
          minHeight,
          resizable,
          frame: false,
          show: false,
          backgroundColor: "#111318",
          icon: this.icon,
          webPreferences: {
            preload: path.resolve(this.preloadPath),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            backgroundThrottling: false,
          },
        },
      };
    });

    opener.webContents.on("did-create-window", (window, details) => {
      const workspaceId = workspaceIdFromFrameName(details.frameName);
      if (!workspaceId) {
        window.destroy();
        return;
      }
      this.register(workspaceId, window);
    });
  }

  show(event: IpcMainInvokeEvent, workspaceId: string): void {
    const window = this.resolveOwnedWindow(event, workspaceId);
    window?.show();
    window?.focus();
  }

  control(
    event: IpcMainInvokeEvent,
    workspaceId: string,
    action: WorkspaceWindowAction,
  ): void {
    const window = this.resolveOwnedWindow(event, workspaceId);
    if (!window) return;

    if (action === "minimize") window.minimize();
    if (action === "focus") window.focus();
    if (action === "toggle-maximize") {
      if (window.isMaximized()) window.unmaximize();
      else window.maximize();
    }
    if (action === "close") window.close();
  }

  getState(
    event: IpcMainInvokeEvent,
    workspaceId: string,
  ): WorkspaceWindowState {
    const window = this.resolveOwnedWindow(event, workspaceId);
    return this.readState(window);
  }

  closeAll(): void {
    for (const window of this.windows.values()) {
      if (!window.isDestroyed()) window.destroy();
    }
    this.windows.clear();
  }

  private register(workspaceId: string, window: BrowserWindow): void {
    const previous = this.windows.get(workspaceId);
    if (previous && previous !== window && !previous.isDestroyed())
      previous.destroy();
    this.windows.set(workspaceId, window);
    if (process.platform === "win32") {
      window.setAppDetails({ appId: this.appId });
    }

    const sendState = () => {
      this.opener?.send("fabric-desktop-workspace-state", {
        workspaceId,
        ...this.readState(window),
      });
    };

    window.on("maximize", sendState);
    window.on("unmaximize", sendState);
    window.on("enter-full-screen", sendState);
    window.on("leave-full-screen", sendState);
    window.on("closed", () => {
      if (this.windows.get(workspaceId) === window)
        this.windows.delete(workspaceId);
      this.opener?.send("fabric-desktop-workspace-closed", { workspaceId });
    });
  }

  private resolveOwnedWindow(
    event: IpcMainInvokeEvent,
    workspaceId: string,
  ): BrowserWindow | null {
    if (event.sender !== this.opener || !workspaceIdPattern.test(workspaceId))
      return null;
    const window = this.windows.get(workspaceId);
    return window && !window.isDestroyed() ? window : null;
  }

  private readState(
    window: BrowserWindow | null | undefined,
  ): WorkspaceWindowState {
    return {
      isMaximized: window?.isMaximized() ?? false,
      isFullScreen: window?.isFullScreen() ?? false,
    };
  }
}
