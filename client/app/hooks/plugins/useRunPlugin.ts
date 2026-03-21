import { useMutation } from "@tanstack/react-query";
import { API_BASE } from "~/constants";

export function useRunPlugin() {
  return useMutation({
    mutationFn: async ({
      pluginId,
      method,
      params,
    }: {
      pluginId: string;
      method: string;
      params: any;
    }) => {
      const response = await fetch(`${API_BASE}/plugins/${pluginId}/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          method,
          params,
        }),
      });
      if (!response.ok) throw new Error("Failed to run plugin");
      return response.json().then((res) => {
        if (res.error) throw new Error(res.error);
        return res.data;
      });
    },
  });
}
