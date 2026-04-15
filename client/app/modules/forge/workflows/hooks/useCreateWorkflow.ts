import { useState } from "react";
import type { WorkflowItem } from "../types/workflow-types";
import { handleApi } from "~/shared/helpers/apiHandler";
import { API_BASE_URL } from "~/shared/constants";

export const useCreateWorkflow = () => {
  const [loading, setLoading] = useState(false);

  const createWorkflow = async (workflow: WorkflowItem) => {
    setLoading(true);

    try {
      const data = await handleApi<WorkflowItem>(
        `${API_BASE_URL}/workflows`,
        { method: "POST" },
        workflow,
      );
      return data;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    createWorkflow,
  };
};
