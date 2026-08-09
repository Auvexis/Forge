export {};

declare global {
  interface Window {
    fabricDesktop?: {
      isDesktop: boolean;
      platform: string;
      openExternal: (url: string) => Promise<void>;
      restart: () => Promise<void>;
      notify: (payload: {
        title?: string;
        body?: string;
        silent?: boolean;
      }) => Promise<boolean>;
      setPreferences: (preferences: {
        minimizeToTray?: boolean;
        closeToTray?: boolean;
        openAtLogin?: boolean;
      }) => Promise<void>;
      checkForUpdates: (
        channel?: "safe" | "stable" | "beta" | "alpha",
      ) => Promise<{
        currentVersion: string;
        updateAvailable: boolean;
        channel: "safe" | "stable" | "beta" | "alpha";
        version: string | null;
        title: string | null;
        notes: string | null;
        url: string | null;
        publishedAt: string | null;
      }>;
      minimize: () => Promise<void>;
      toggleMaximize: () => Promise<void>;
      close: () => Promise<void>;
      workspaceReady: (workspaceId: string) => Promise<void>;
      controlWorkspace: (
        workspaceId: string,
        action: "minimize" | "toggle-maximize" | "close" | "focus",
      ) => Promise<void>;
      getWorkspaceState: (
        workspaceId: string,
      ) => Promise<{ isMaximized: boolean; isFullScreen: boolean }>;
      getWindowState: () => Promise<{
        isMaximized: boolean;
        isFullScreen: boolean;
      }>;
      getZoomFactor: () => Promise<number>;
      setZoomFactor: (zoomFactor: number) => Promise<number>;
      onZoomChange: (
        callback: (state: { zoomFactor: number }) => void,
      ) => () => void;
      onWindowStateChange: (
        callback: (state: {
          isMaximized: boolean;
          isFullScreen: boolean;
        }) => void,
      ) => () => void;
      onWorkspaceStateChange: (
        callback: (state: {
          workspaceId: string;
          isMaximized: boolean;
          isFullScreen: boolean;
        }) => void,
      ) => () => void;
      onWorkspaceClosed: (
        callback: (state: { workspaceId: string }) => void,
      ) => () => void;
    };
  }
}
