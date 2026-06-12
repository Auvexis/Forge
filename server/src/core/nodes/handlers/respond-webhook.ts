import type { RespondToWebhookNode } from "../../../shared/models/workflow-types.ts";
import { WorkflowParser } from "../../modules/workflows/parser.ts";
import { createNodeHandler } from "../handler.ts";

export const respondWebhookNodeHandler = createNodeHandler<RespondToWebhookNode>(
  "respond-webhook",
  ({ node, context, services }) => {
    const resolvedParams = WorkflowParser.evalParams({ body: node.body }, context);
    let responseBody: unknown = resolvedParams.body;

    if (typeof responseBody === "string") {
      try {
        responseBody = JSON.parse(responseBody);
      } catch {
        // Keep plain text responses as-is.
      }
    }

    const correlationId = context._webhookCorrelationId;
    const statusCode = node.statusCode ?? 200;
    const resolved = correlationId
      ? services.resolvePendingWebhookResponse(correlationId, {
          statusCode,
          body: responseBody,
          headers: node.headers,
        })
      : false;

    if (!resolved && correlationId) {
      console.warn(
        `[SAILOR | RESPOND-WEBHOOK]: correlationId "${correlationId}" not found - ` +
          "webhook caller may have already timed out.",
      );
    }

    return { statusCode, body: responseBody, resolved };
  },
  {
    description: "Resolves a pending webhook response for synchronous webhook workflows.",
    execution: "stateless",
    sideEffects: ["webhook-response"],
    outputs: [{ id: "default", label: "Response" }],
    errors: ["Invalid response body template"],
  },
);
