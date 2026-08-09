import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("fabricDesktop", {
  isDesktop: true,
  platform: process.platform,
  openExternal: (url: string) =>
    ipcRenderer.invoke("fabric-desktop-open-external", url),
  restart: () => ipcRenderer.invoke("fabric-desktop-restart"),
  notify: (payload: { title?: string; body?: string; silent?: boolean }) =>
    ipcRenderer.invoke("fabric-desktop-notify", payload),
  setPreferences: (preferences: {
    minimizeToTray?: boolean;
    closeToTray?: boolean;
    openAtLogin?: boolean;
  }) => ipcRenderer.invoke("fabric-desktop-preferences-set", preferences),
  checkForUpdates: (channel: "safe" | "stable" | "beta" | "alpha" = "safe") =>
    ipcRenderer.invoke("fabric-desktop-update-check", channel),
  minimize: () => ipcRenderer.invoke("fabric-desktop-window-minimize"),
  toggleMaximize: () =>
    ipcRenderer.invoke("fabric-desktop-window-toggle-maximize"),
  close: () => ipcRenderer.invoke("fabric-desktop-window-close"),
  workspaceReady: (workspaceId: string) =>
    ipcRenderer.invoke("fabric-desktop-workspace-ready", workspaceId),
  controlWorkspace: (
    workspaceId: string,
    action: "minimize" | "toggle-maximize" | "close" | "focus",
  ) =>
    ipcRenderer.invoke("fabric-desktop-workspace-control", workspaceId, action),
  getWorkspaceState: (workspaceId: string) =>
    ipcRenderer.invoke("fabric-desktop-workspace-state", workspaceId),
  getWindowState: () => ipcRenderer.invoke("fabric-desktop-window-state"),
  getZoomFactor: () => ipcRenderer.invoke("fabric-desktop-zoom-get"),
  setZoomFactor: (zoomFactor: number) =>
    ipcRenderer.invoke("fabric-desktop-zoom-set", zoomFactor),
  onZoomChange: (callback: (state: { zoomFactor: number }) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      state: { zoomFactor: number },
    ) => {
      callback(state);
    };
    ipcRenderer.on("fabric-desktop-zoom-change", listener);
    return () =>
      ipcRenderer.removeListener("fabric-desktop-zoom-change", listener);
  },
  onWindowStateChange: (
    callback: (state: { isMaximized: boolean; isFullScreen: boolean }) => void,
  ) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      state: { isMaximized: boolean; isFullScreen: boolean },
    ) => {
      callback(state);
    };
    ipcRenderer.on("fabric-desktop-window-state", listener);
    return () =>
      ipcRenderer.removeListener("fabric-desktop-window-state", listener);
  },
  onWorkspaceStateChange: (
    callback: (state: {
      workspaceId: string;
      isMaximized: boolean;
      isFullScreen: boolean;
    }) => void,
  ) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      state: {
        workspaceId: string;
        isMaximized: boolean;
        isFullScreen: boolean;
      },
    ) => callback(state);
    ipcRenderer.on("fabric-desktop-workspace-state", listener);
    return () =>
      ipcRenderer.removeListener("fabric-desktop-workspace-state", listener);
  },
  onWorkspaceClosed: (callback: (state: { workspaceId: string }) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      state: { workspaceId: string },
    ) => callback(state);
    ipcRenderer.on("fabric-desktop-workspace-closed", listener);
    return () =>
      ipcRenderer.removeListener("fabric-desktop-workspace-closed", listener);
  },
});
