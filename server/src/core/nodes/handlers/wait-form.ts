import type { WaitFormNode } from "../../../shared/models/workflow-types.ts";
import { createTemporaryFormSession } from "../../modules/forms/temporary-form-session.ts";
import { createNodeHandler } from "../handler.ts";

const DEFAULT_EXPIRATION_SECONDS = 15 * 60;
const MAX_EXPIRATION_SECONDS = 24 * 60 * 60;

function resolvePublicOrigin(): string {
  return (
    process.env.SERVER_PUBLIC_ORIGIN ||
    process.env.API_PUBLIC_ORIGIN ||
    `http://localhost:${process.env.PORT || 23801}`
  ).replace(/\/$/, "");
}

export const waitFormNodeHandler = createNodeHandler<WaitFormNode>(
  "wait-form",
  async ({ node, workflow, nodeId, executionId, services }) => {
    const expiresInSeconds = Math.min(
      MAX_EXPIRATION_SECONDS,
      Math.max(1, node.expiresInSeconds ?? DEFAULT_EXPIRATION_SECONDS),
    );

    const session = createTemporaryFormSession({
      workflowId: workflow.metadata.id,
      executionId,
      nodeId,
      title: node.title?.trim() || node.name,
      description: node.description,
      fields: node.fields,
      theme: node.theme,
      expiresInSeconds,
    });
    const formUrl = `${resolvePublicOrigin()}/temporary-forms/${session.id}`;

    services.emitWorkflowEvent?.({
      executionId,
      workflowId: workflow.metadata.id,
      nodeId,
      type: "temporary-form:created",
      timestamp: Date.now(),
      data: {
        formId: session.id,
        formUrl,
        expiresAt: session.expiresAt,
      },
    });

    const submission = await session.result;
    return {
      ...submission,
      formUrl,
      expiresAt: session.expiresAt,
    };
  },
  {
    description: "Creates a temporary form and pauses execution until it is submitted or expires.",
    execution: "long-running",
    sideEffects: ["network"],
    outputs: [{ id: "default", label: "Submitted Fields" }],
    errors: ["Temporary form expired", "Temporary form submission failed"],
  },
);
