import { useState } from "react";
import { API_BASE_URL } from "~/shared/constants";
import type { PluginStatusResponse } from "../types/plugin";
import { handleApi } from "~/shared/helpers/apiHandler";

export const useGetPluginStatus = () => {
  const [pluginStatus, setPluginStatus] =
    useState<PluginStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const getPluginStatus = async (pluginId: string) => {
    setLoading(true);
    try {
      const data = await handleApi<PluginStatusResponse>(
        `${API_BASE_URL}/plugins/${pluginId}/status`,
      );

      setPluginStatus(data);
      return data;
    } finally {
      setLoading(false);
    }
  };

  return { pluginStatus, loading, getPluginStatus };
};
