import type { WorkflowItem } from "../../../shared/models/workflow-types.ts";

export function createDraftWorkflow(name = "Untitled Workflow"): WorkflowItem {
  const now = new Date().toISOString();
  const id = `wf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  return {
    metadata: {
      id,
      name,
      version: "1.0.0",
      isActive: false,
      isDraft: true,
      public: false,
      createdAt: now,
      updatedAt: now,
      publishedAt: null,
    },
    trigger: {
      type: "manual",
    },
    nodes: {},
    edges: [],
    variables: [],
  };
}
