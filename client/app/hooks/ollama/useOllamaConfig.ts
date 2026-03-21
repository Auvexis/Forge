import { useQuery } from "@tanstack/react-query";
import { API_BASE } from "~/constants";
import type { OllamaConfigModel } from "~/types/ollama-config";

export function useOllamaConfig() {
  return useQuery<OllamaConfigModel>({
    queryKey: ["ollama_config"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/ollama/config`);
      if (!response.ok) throw new Error("Failed to fetch Ollama config");
      return response.json().then((res) => {
        if (res.error) throw new Error(res.error);
        return res.data;
      });
    },
  });
}
