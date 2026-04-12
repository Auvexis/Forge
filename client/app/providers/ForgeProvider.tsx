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
} from "../modules/forge/plugins/types/plugin";
import { API_BASE_URL } from "../shared/constants";
import { handleApi } from "../shared/helpers/apiHandler";

export enum GlobalViews {
  EXPLORER = "explorer",
  WORKFLOWS = "workflows",
}

interface ForgeContextType {
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

  // OAuth Flow
  authLoading: boolean;
  startOAuthFlow: (pluginId: string, authUrl: string) => Promise<void>;
}

const ForgeContext = createContext<ForgeContextType | undefined>(undefined);

export const ForgeProvider = ({ children }: { children: ReactNode }) => {
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
        "ForgeAuth",
        `width=${width},height=${height},left=${left},top=${top}`,
      );

      const apiOrigin = new URL(API_BASE_URL).origin;

      return new Promise<void>((resolve, reject) => {
        const cleanup = () => {
          window.removeEventListener("message", messageListener);
          clearInterval(checkPopup);
          setAuthLoading(false);
        };

        const messageListener = async (event: MessageEvent) => {
          if (event.origin !== apiOrigin) return;

          if (
            event.data?.type === "oauth-success" &&
            event.data?.plugin === pluginId
          ) {
            await refreshActivePluginStatus(pluginId);
            cleanup();
            resolve();
          }

          if (
            event.data?.type === "oauth-error" &&
            event.data?.plugin === pluginId
          ) {
            cleanup();
            reject(new Error(event.data.error || "OAuth failed"));
          }
        };

        const checkPopup = setInterval(() => {
          if (popup?.closed) {
            cleanup();
            resolve(); // Resolve anyway when closed, status refresh will handle the rest
          }
        }, 1000);

        window.addEventListener("message", messageListener);
      });
    },
    [refreshActivePluginStatus],
  );

  return (
    <ForgeContext.Provider
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
      }}
    >
      {children}
    </ForgeContext.Provider>
  );
};

export const useForge = () => {
  const context = useContext(ForgeContext);
  if (context === undefined) {
    throw new Error("useForge must be used within a ForgeProvider");
  }
  return context;
};
