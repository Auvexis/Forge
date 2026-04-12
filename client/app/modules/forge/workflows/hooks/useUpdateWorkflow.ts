import { useState } from "react";
import type { WorkflowItem } from "../types/workflow-types";
import { handleApi } from "~/shared/helpers/apiHandler";
import { API_BASE_URL } from "~/shared/constants";

export const useUpdateWorkflow = () => {
  const [loading, setLoading] = useState(false);

  const updateWorkflow = async (workflow: WorkflowItem) => {
    setLoading(true);

    const data = await handleApi<WorkflowItem>(
      `${API_BASE_URL}/workflows/${workflow.metadata.id}`,
      { method: "PUT" },
      workflow,
    );

    setLoading(false);
    return data;
  };

  return {
    loading,
    updateWorkflow,
  };
};
