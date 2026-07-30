import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("fabricDesktop", {
  isDesktop: true,
  platform: process.platform,
  openExternal: (url: string) => ipcRenderer.invoke("fabric-desktop-open-external", url),
});
