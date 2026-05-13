import type { WaitFormNode } from "../../../shared/models/workflow-types.ts";
import { createTemporaryFormSession } from "../../modules/forms/temporary-form-session.ts";
import { WorkflowParser } from "../../modules/workflows/parser.ts";
import { createNodeHandler } from "../handler.ts";

const DEFAULT_EXPIRATION_SECONDS = 15 * 60;
const MAX_EXPIRATION_SECONDS = 24 * 60 * 60;

function normalizeExpirationSeconds(value: unknown): number {
  const parsed = Number(value ?? DEFAULT_EXPIRATION_SECONDS);
  const safeValue = Number.isFinite(parsed) ? parsed : DEFAULT_EXPIRATION_SECONDS;
  return Math.min(MAX_EXPIRATION_SECONDS, Math.max(1, safeValue));
}

function resolvePublicOrigin(): string {
  return (
    process.env.SERVER_PUBLIC_ORIGIN ||
    process.env.API_PUBLIC_ORIGIN ||
    `http://localhost:${process.env.PORT || 23801}`
  ).replace(/\/$/, "");
}

export const waitFormNodeHandler = createNodeHandler<WaitFormNode>(
  "wait-form",
  async ({ node, workflow, nodeId, executionId, context, services }) => {
    const resolvedConfig = WorkflowParser.evalParams(
      {
        title: node.title,
        description: node.description ?? "",
        publicSlug: node.publicSlug ?? "",
        expiresInSeconds: node.expiresInSeconds ?? DEFAULT_EXPIRATION_SECONDS,
      },
      context,
    );
    const expiresInSeconds = normalizeExpirationSeconds(resolvedConfig.expiresInSeconds);

    const session = createTemporaryFormSession({
      workflowId: workflow.metadata.id,
      executionId,
      nodeId,
      title: String(resolvedConfig.title || node.name).trim(),
      description: String(resolvedConfig.description || ""),
      fields: node.fields,
      theme: node.theme,
      publicSlug: String(resolvedConfig.publicSlug || ""),
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
