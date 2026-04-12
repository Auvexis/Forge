import { useState } from "react";
import type { WorkflowItem } from "../types/workflow-types";
import { handleApi } from "~/shared/helpers/apiHandler";
import { API_BASE_URL } from "~/shared/constants";

export const useExecuteWorkflow = () => {
  const [loading, setLoading] = useState(false);

  const executeWorkflow = async (
    id: string,
    payload: Record<string, unknown>,
  ) => {
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
        } else {
          formData.append(key, String(value));
        }
      }

      const data = await handleApi<WorkflowItem>(
        `${API_BASE_URL}/workflows/${id}/execute`,
        { method: "POST" },
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
