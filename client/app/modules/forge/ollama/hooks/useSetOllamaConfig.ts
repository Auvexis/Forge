import { useState } from "react";
import { API_BASE_URL } from "~/shared/constants";
import type { OllamaConfig } from "../types/ollamaConfig";
import { handleApi } from "~/shared/helpers/apiHandler";
import { useGetOllamaConfig } from "./useGetOllamaConfig";

export const useSetOllamaConfig = () => {
  const { setOllamaConfig: setConfigState } = useGetOllamaConfig();

  const setOllamaConfig = async (
    config: OllamaConfig,
    additionalOptions?: Record<string, unknown>,
  ) => {
    const data = await handleApi<OllamaConfig | null>(
      `${API_BASE_URL}/ollama/config`,
      { method: "POST" },
      {
        model: config.model,
        host: config.host,
        options: {
          ...config.options,
          ...additionalOptions,
        },
      },
    );

    setConfigState(data);
  };

  return {
    setOllamaConfig,
  };
};
