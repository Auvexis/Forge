import { useState } from "react";
import type { WorkflowItem } from "../types/workflow-types";
import { handleApi } from "~/shared/helpers/apiHandler";
import { API_BASE_URL } from "~/shared/constants";

export const useDeleteWorkflow = () => {
  const [loading, setLoading] = useState(false);

  const deleteWorkflow = async (id: string) => {
    setLoading(true);
    try {
      const data = await handleApi<WorkflowItem>(
        `${API_BASE_URL}/workflows/${id}`,
        { method: "DELETE" },
      );
      return data;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    deleteWorkflow,
  };
};