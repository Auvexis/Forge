import { useState, useCallback } from "react";
import { handleApi } from "~/shared/helpers/apiHandler";
import { API_BASE_URL } from "~/shared/constants";

export const useGetWorkflowExecutions = () => {
  const [loading, setLoading] = useState(false);
  const [executions, setExecutions] = useState<any[]>([]);

  const getExecutions = useCallback(async (workflowId: string) => {
    setLoading(true);
    try {
      const res = await handleApi(`${API_BASE_URL}/workflows/${workflowId}/executions`);
      setExecutions(res as any);
      return res;
    } catch (e) {
      console.error(e);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return { getExecutions, executions, loading };
};
