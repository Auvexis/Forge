import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("fabricDesktop", {
  isDesktop: true,
  platform: process.platform,
  openExternal: (url: string) => ipcRenderer.invoke("fabric-desktop-open-external", url),
  restart: () => ipcRenderer.invoke("fabric-desktop-restart"),
  notify: (payload: { title?: string; body?: string; silent?: boolean }) =>
    ipcRenderer.invoke("fabric-desktop-notify", payload),
  minimize: () => ipcRenderer.invoke("fabric-desktop-window-minimize"),
  toggleMaximize: () => ipcRenderer.invoke("fabric-desktop-window-toggle-maximize"),
  close: () => ipcRenderer.invoke("fabric-desktop-window-close"),
  getWindowState: () => ipcRenderer.invoke("fabric-desktop-window-state"),
  getZoomFactor: () => ipcRenderer.invoke("fabric-desktop-zoom-get"),
  setZoomFactor: (zoomFactor: number) => ipcRenderer.invoke("fabric-desktop-zoom-set", zoomFactor),
  onZoomChange: (callback: (state: { zoomFactor: number }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: { zoomFactor: number }) => {
      callback(state);
    };
    ipcRenderer.on("fabric-desktop-zoom-change", listener);
    return () => ipcRenderer.removeListener("fabric-desktop-zoom-change", listener);
  },
  onWindowStateChange: (callback: (state: { isMaximized: boolean }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: { isMaximized: boolean }) => {
      callback(state);
    };
    ipcRenderer.on("fabric-desktop-window-state", listener);
    return () => ipcRenderer.removeListener("fabric-desktop-window-state", listener);
  },
});
