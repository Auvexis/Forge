import { useState } from "react";
import { API_BASE_URL } from "~/shared/constants";
import type { OllamaConfig } from "../types/ollamaConfig";
import { handleApi } from "~/shared/helpers/apiHandler";

export const useGetOllamaConfig = () => {
  const [ollamaConfig, setOllamaConfig] = useState<OllamaConfig | null>(null);

  const getOllamaConfig = async () => {
    const data = await handleApi<OllamaConfig | null>(
      `${API_BASE_URL}/ollama/config`,
      { method: "GET" },
    );

    setOllamaConfig(data);
  };

  return {
    ollamaConfig,
    setOllamaConfig,
    getOllamaConfig,
  };
};
