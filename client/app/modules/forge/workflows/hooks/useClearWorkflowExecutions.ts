import { useState, useCallback } from "react";
import { handleApi } from "~/shared/helpers/apiHandler";
import { API_BASE_URL } from "~/shared/constants";

export const useClearWorkflowExecutions = () => {
  const [loading, setLoading] = useState(false);

  const clearExecutions = useCallback(async (workflowId: string) => {
    setLoading(true);
    try {
      await handleApi(`${API_BASE_URL}/workflows/${workflowId}/executions`, {
        method: "DELETE",
      });
      return true;
    } catch (e) {
      console.error(e);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { clearExecutions, loading };
};
