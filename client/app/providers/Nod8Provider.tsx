import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useParams, useNavigate } from "react-router";
import type {
  Plugin,
  PluginStatusResponse,
} from "../modules/nod8/plugins/types/plugin";
import { API_BASE_URL } from "../shared/constants";
import { handleApi } from "../shared/helpers/apiHandler";
import { toast } from "../shared/helpers/toast";

export enum GlobalViews {
  EXPLORER = "explorer",
  WORKFLOWS = "workflows",
}

interface Nod8ContextType {
  // Global View
  view: GlobalViews;
  setView: (view: GlobalViews) => void;

  // Plugins Cache
  plugins: Plugin[];
  getPlugins: () => Promise<void>;
  pluginsLoading: boolean;

  // Individual Plugin State
  activePlugin: Plugin | null;
  activePluginStatus: PluginStatusResponse | null;
  fetchActivePluginData: (pluginId: string) => Promise<void>;
  refreshActivePluginStatus: (pluginId: string) => Promise<void>;
  activePluginLoading: boolean;

  // Workflows
  selectedWorkflowId: string | null;
  setSelectedWorkflowId: (id: string | null) => void;
  activeSubSidebar: string | null;
  setActiveSubSidebar: (id: string | null) => void;

  // OAuth Flow
  authLoading: boolean;
  startOAuthFlow: (pluginId: string, authUrl: string) => Promise<void>;
}

const Nod8Context = createContext<Nod8ContextType | undefined>(undefined);

export const Nod8Provider = ({ children }: { children: ReactNode }) => {
  const { view: urlView } = useParams();
  const navigate = useNavigate();

  const view = useMemo(() => {
    if (
      urlView &&
      Object.values(GlobalViews).includes(urlView as GlobalViews)
    ) {
      return urlView as GlobalViews;
    }
    return GlobalViews.EXPLORER;
  }, [urlView]);

  const setView = useCallback(
    (newView: GlobalViews) => {
      if (newView !== view) {
        navigate(`/${newView}`, { replace: true });
      }
    },
    [navigate, view],
  );

  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [pluginsLoading, setPluginsLoading] = useState(false);

  const [activePlugin, setActivePlugin] = useState<Plugin | null>(null);
  const [activePluginStatus, setActivePluginStatus] =
    useState<PluginStatusResponse | null>(null);
  const [activePluginLoading, setActivePluginLoading] = useState(false);

  const [authLoading, setAuthLoading] = useState(false);

  const getPlugins = useCallback(async () => {
    setPluginsLoading(true);
    try {
      const data = await handleApi<Plugin[]>(`${API_BASE_URL}/plugins`);
      setPlugins(data || []);
    } finally {
      setPluginsLoading(false);
    }
  }, []);

  const fetchActivePluginData = useCallback(async (pluginId: string) => {
    setActivePluginLoading(true);
    try {
      const [pluginData, statusData] = await Promise.all([
        handleApi<Plugin>(`${API_BASE_URL}/plugins/${pluginId}`),
        handleApi<PluginStatusResponse>(
          `${API_BASE_URL}/plugins/${pluginId}/status`,
        ),
      ]);
      setActivePlugin(pluginData);
      setActivePluginStatus(statusData);
    } finally {
      setActivePluginLoading(false);
    }
  }, []);

  const refreshActivePluginStatus = useCallback(async (pluginId: string) => {
    const statusData = await handleApi<PluginStatusResponse>(
      `${API_BASE_URL}/plugins/${pluginId}/status`,
    );
    setActivePluginStatus(statusData);
  }, []);

  const startOAuthFlow = useCallback(
    async (pluginId: string, authUrl: string) => {
      setAuthLoading(true);

      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        authUrl,
        "Nod8Auth",
        `width=${width},height=${height},left=${left},top=${top}`,
      );

      const apiOrigin = new URL(API_BASE_URL).origin;

      return new Promise<void>((resolve, reject) => {
        // Track whether a postMessage arrived so the popup-closed fallback
        // knows not to interfere (avoids the interval racing the message).
        let messageReceived = false;

        const cleanup = () => {
          window.removeEventListener("message", messageListener);
          clearInterval(checkPopup);
          setAuthLoading(false);
        };

        const messageListener = async (event: MessageEvent) => {
          // Accept messages from the server (the callback page origin)
          if (event.origin !== apiOrigin) return;

          if (
            event.data?.type === "oauth-success" &&
            event.data?.plugin === pluginId
          ) {
            messageReceived = true;
            cleanup();
            // Refresh status AFTER cleanup so we don't call it twice
            await refreshActivePluginStatus(pluginId);
            toast.success("Account connected", {
              description: `OAuth2 authentication completed successfully.`,
            });
            resolve();
          }

          if (
            event.data?.type === "oauth-error" &&
            event.data?.plugin === pluginId
          ) {
            messageReceived = true;
            cleanup();
            const errMsg = event.data.error || "OAuth failed";
            toast.error("OAuth Connection Failed", {
              description: errMsg,
            });
            reject(new Error(errMsg));
          }
        };

        // Poll for popup closure. When the popup closes:
        //   - If we already got a message → already resolved/rejected, do nothing.
        //   - If no message yet → wait briefly for a late postMessage, then
        //     refresh status and resolve (user may have completed or cancelled).
        const checkPopup = setInterval(() => {
          if (!popup?.closed) return;

          clearInterval(checkPopup);

          if (messageReceived) return; // Already handled

          // Give the callback page 600ms to fire its postMessage before we
          // give up and treat the closure as a manual cancel.
          setTimeout(async () => {
            cleanup();
            // Best-effort status refresh (handles the case where token was
            // saved but the postMessage was missed)
            await refreshActivePluginStatus(pluginId).catch(() => {});
            resolve();
          }, 600);
        }, 500);

        window.addEventListener("message", messageListener);
      });
    },
    [refreshActivePluginStatus],
  );

  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(
    null,
  );
  const [activeSubSidebar, setActiveSubSidebar] = useState<string | null>(null);

  return (
    <Nod8Context.Provider
      value={{
        view,
        setView,
        plugins,
        getPlugins,
        pluginsLoading,
        activePlugin,
        activePluginStatus,
        fetchActivePluginData,
        refreshActivePluginStatus,
        activePluginLoading,
        authLoading,
        startOAuthFlow,
        selectedWorkflowId,
        setSelectedWorkflowId,
        activeSubSidebar,
        setActiveSubSidebar,
      }}
    >
      {children}
    </Nod8Context.Provider>
  );
};

export const useNod8 = () => {
  const context = useContext(Nod8Context);
  if (context === undefined) {
    throw new Error("useNod8 must be used within a Nod8Provider");
  }
  return context;
};
