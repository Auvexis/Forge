import { useState } from "react";
import type { Plugin } from "../types/plugin";
import { API_BASE_URL } from "~/shared/constants";
import { handleApi } from "~/shared/helpers/apiHandler";

export const useGetPlugin = () => {
  const [plugin, setPlugin] = useState<Plugin | null>(null);
  const [loading, setLoading] = useState(false);

  const getPlugin = async (id: string) => {
    setLoading(true);
    const data = await handleApi<Plugin>(`${API_BASE_URL}/plugins/${id}`);

    setPlugin(data);
    setLoading(false);
  };

  return { plugin, loading, getPlugin };
};
