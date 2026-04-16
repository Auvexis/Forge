import { useState } from "react";
import type { WorkflowItem } from "../types/workflow-types";
import { handleApi } from "~/shared/helpers/apiHandler";
import { API_BASE_URL } from "~/shared/constants";

export const useGetWorkflows = () => {
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [loading, setLoading] = useState(false);

  const getWorkflows = async () => {
    setLoading(true);

    const data = await handleApi<WorkflowItem[]>(`${API_BASE_URL}/workflows`);

    setWorkflows(data || []);
    setLoading(false);
  };

  return {
    workflows,
    loading,
    getWorkflows,
  };
};
