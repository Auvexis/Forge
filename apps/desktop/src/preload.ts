import { contextBridge, shell } from "electron";

contextBridge.exposeInMainWorld("fabricDesktop", {
  isDesktop: true,
  platform: process.platform,
  openExternal: (url: string) => shell.openExternal(url),
});
