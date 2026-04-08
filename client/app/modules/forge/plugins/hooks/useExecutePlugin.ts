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

    const hasFile = Object.values(params).some((v) => v instanceof File);
    let body: any;

    if (hasFile) {
      body = new FormData();
      body.append("method", method);
      Object.entries(params).forEach(([key, value]) => {
        if (value instanceof File) {
          body.append(key, value);
        } else if (typeof value === "object") {
          body.append(key, JSON.stringify(value));
        } else {
          body.append(key, String(value));
        }
      });
    } else {
      body = { method, params };
    }

    const data = await handleApi<T>(
      `${API_BASE_URL}/plugins/${id}/execute`,
      { method: "POST" },
      body
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
