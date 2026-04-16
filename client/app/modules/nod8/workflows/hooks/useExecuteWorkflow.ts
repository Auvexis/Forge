import { useState } from "react";
import { handleApi } from "~/shared/helpers/apiHandler";
import { API_BASE_URL } from "~/shared/constants";

export interface ExecuteWorkflowResult {
  executionId: string;
}

export const useExecuteWorkflow = () => {
  const [loading, setLoading] = useState(false);

  const executeWorkflow = async (
    id: string,
    payload: Record<string, unknown>,
    /** When set, server uses this id so the client can open SSE before the multipart body finishes uploading. */
    clientExecutionId?: string,
  ): Promise<ExecuteWorkflowResult | null> => {
    setLoading(true);
    try {
      const formData = new FormData();

      for (const [key, value] of Object.entries(payload)) {
        if (value instanceof File || value instanceof Blob) {
          formData.append(key, value);
        } else if (Array.isArray(value)) {
          value.forEach((item) => {
            if (item instanceof File || item instanceof Blob) {
              formData.append(key, item);
            } else {
              formData.append(key, String(item));
            }
          });
        } else if (value !== null && value !== undefined) {
          formData.append(key, String(value));
        }
      }

      // Backend returns 202 Accepted with { executionId }
      const data = await handleApi<ExecuteWorkflowResult>(
        `${API_BASE_URL}/workflows/${id}/execute`,
        {
          method: "POST",
          ...(clientExecutionId
            ? { headers: { "X-Nod8-Execution-Id": clientExecutionId } }
            : {}),
        },
        formData,
      );
      return data;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    executeWorkflow,
  };
};
