import { useQuery } from "@tanstack/react-query";
import { API_BASE } from "~/constants";
import type { PluginModel } from "~/types/plugin";

export function usePlugin(id: string) {
  return useQuery<PluginModel>({
    queryKey: ["plugin", id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/plugins/${id}`);
      if (!response.ok) throw new Error("Failed to fetch plugin");
      return response.json().then((res) => {
        if (res.error) throw new Error(res.error);
        return res.data;
      });
    },
    enabled: !!id,
  });
}
