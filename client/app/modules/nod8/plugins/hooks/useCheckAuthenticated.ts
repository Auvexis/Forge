import { API_BASE_URL } from "~/shared/constants";
import { handleApi } from "~/shared/helpers/apiHandler";
import type { PluginStatusResponse } from "../types/plugin";

export const checkPluginAuthenticated = async (
  pluginId: string,
): Promise<boolean> => {
  try {
    const data = await handleApi<PluginStatusResponse>(
      `${API_BASE_URL}/plugins/${pluginId}/status`,
    );

    return data?.status === "connected";
  } catch (error) {
    return false;
  }
};
