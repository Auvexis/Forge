import { useQuery } from "@tanstack/react-query";
import { API_BASE } from "~/constants";
import type { PluginModel } from "~/types/plugin";

export function usePlugins() {
  return useQuery<PluginModel[]>({
    queryKey: ["installed_plugins"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/plugins`);
      if (!response.ok) throw new Error("Failed to fetch installed plugins");
      return response.json().then((res) => {
        if (res.error) throw new Error(res.error);
        return res.data;
      });
    },
  });
}
