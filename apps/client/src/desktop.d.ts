export {}

declare global {
  interface Window {
    fabricDesktop?: {
      isDesktop: boolean
      platform: string
      openExternal: (url: string) => Promise<void>
      restart: () => Promise<void>
      notify: (payload: { title?: string; body?: string; silent?: boolean }) => Promise<boolean>
      minimize: () => Promise<void>
      toggleMaximize: () => Promise<void>
      close: () => Promise<void>
      getWindowState: () => Promise<{ isMaximized: boolean }>
      getZoomFactor: () => Promise<number>
      setZoomFactor: (zoomFactor: number) => Promise<number>
      onZoomChange: (callback: (state: { zoomFactor: number }) => void) => () => void
      onWindowStateChange: (callback: (state: { isMaximized: boolean }) => void) => () => void
    }
  }
}
