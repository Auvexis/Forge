import { useMutation, useQueryClient } from "@tanstack/react-query";
import { API_BASE } from "~/constants";
import type { OllamaConfigModel } from "~/types/ollama-config";

export function useUpdateOllamaConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: OllamaConfigModel) => {
      const response = await fetch(`${API_BASE}/ollama/config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });
      if (!response.ok) throw new Error("Failed to update Ollama config");
      return response.json().then((res) => {
        if (res.error) throw new Error(res.error);
        return res.data;
      });
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["ollama_config"],
      });
    },
  });
}
