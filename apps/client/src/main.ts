import { createApp } from "vue";
import { createPinia } from "pinia";
import { createRenderizer } from "@renderizer/vue";

import App from "./app/App.vue";
import router from "./app/router";
import renderizerConfig from "./renderizer.config";
import { installGlobalErrorToasts } from "./shared/composables/globalErrorToasts";
import "./shared/composables/useTheme";

// Global CSS Import
import "./assets/styles/main.css";

// Vue Flow CSS (required for the graph editor)

if (window.fabricDesktop?.isDesktop) {
  window.renderizer ??= {
    isRenderizerHost: true,
    ready: window.fabricDesktop.workspaceReady,
    control: window.fabricDesktop.controlWorkspace,
    getState: window.fabricDesktop.getWorkspaceState,
    onStateChange: (callback) =>
      window.fabricDesktop!.onWorkspaceStateChange((state) => {
        callback({
          windowId: state.workspaceId,
          isMaximized: state.isMaximized,
          isFullScreen: state.isFullScreen,
        });
      }),
    onClosed: (callback) =>
      window.fabricDesktop!.onWorkspaceClosed((state) => {
        callback({ windowId: state.workspaceId });
      }),
  };
  document.documentElement.classList.add("fabric-desktop");
  const syncDesktopWindowShape = (state: {
    isMaximized: boolean;
    isFullScreen: boolean;
  }) => {
    document.documentElement.classList.toggle(
      "fabric-desktop-full-bleed",
      state.isMaximized || state.isFullScreen,
    );
  };
  void window.fabricDesktop.getWindowState().then(syncDesktopWindowShape);
  window.fabricDesktop.onWindowStateChange(syncDesktopWindowShape);
  window.addEventListener("keydown", (event) => {
    if ((!event.ctrlKey && !event.metaKey) || event.altKey) return;
    const key = event.key.toLowerCase();
    const code = event.code;
    const isZoomIn = key === "+" || key === "=" || code === "NumpadAdd";
    const isZoomOut = key === "-" || code === "NumpadSubtract";
    const isZoomReset = key === "0" || code === "Numpad0";
    if (!isZoomIn && !isZoomOut && !isZoomReset) return;

    event.preventDefault();
    void window.fabricDesktop?.getZoomFactor().then((zoomFactor) => {
      const nextZoomFactor = isZoomReset
        ? 1
        : zoomFactor + (isZoomIn ? 0.1 : -0.1);
      return window.fabricDesktop?.setZoomFactor(
        Number(nextZoomFactor.toFixed(2)),
      );
    });
  });
}

const app = createApp(App);
installGlobalErrorToasts(app);

app.use(createPinia());
app.use(router);
app.use(createRenderizer(renderizerConfig));

app.mount("#app");
