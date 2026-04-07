import { useState } from "react";
import { API_BASE_URL } from "~/shared/constants";
import { handleApi } from "~/shared/helpers/apiHandler";
import { base64ToFile } from "~/shared/utils/base64ToFile";
import { downloadFile } from "~/shared/utils/downloadFile";

export const useExecutePlugin = <T = any>() => {
  const [loading, setLoading] = useState<boolean>(false);

  const executePlugin = async (
    id: string,
    method: string,
    params: Record<string, any>,
  ): Promise<T> => {
    setLoading(true);

    const data = await handleApi<T>(
      `${API_BASE_URL}/plugins/${id}/execute`,
      { method: "POST" },
      { method, params }
    );

    if ((data as any)?.download) {
      downloadFile({
        base64: (data as any).download.base64,
        fileName: (data as any).download.fileName,
        mimeType: (data as any).download.mimeType,
      });

      setLoading(false);

      return (data as any).download as T;
    }

    setLoading(false);

    return data;
  };

  return { executePlugin, loading };
};
