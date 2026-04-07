import { API_BASE_URL } from "~/shared/constants";
import { handleApi } from "~/shared/helpers/apiHandler";
import type { DomChatRequest } from "../types/domChatRequest";

export const useSendMessage = () => {
  const sendMessage = async (data: DomChatRequest) => {
    const response = await handleApi<string>(
      `${API_BASE_URL}/ai/chat`,
      { method: "POST" },
      data,
    );

    return response;
  };

  return {
    sendMessage,
  };
};
