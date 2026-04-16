import { useState } from "react";
import type { Plugin } from "../types/plugin";
import { API_BASE_URL } from "~/shared/constants";
import { handleApi } from "~/shared/helpers/apiHandler";

export const useGetPlugins = () => {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const getPlugins = async () => {
    setLoading(true);

    const data = await handleApi<Plugin[]>(`${API_BASE_URL}/plugins`);

    setPlugins(data || []);

    setLoading(false);
  };

  return { plugins, getPlugins, loading };
};
