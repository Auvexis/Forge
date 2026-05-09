import type { SwitchNode } from "../../../shared/models/workflow-types.ts";
import { evaluateExpression } from "../expression.ts";
import { createNodeHandler } from "../handler.ts";

export const switchNodeHandler = createNodeHandler<SwitchNode>(
  "switch",
  ({ node, context }) => {
    const value = String(evaluateExpression(node.inputExpression, context));

    for (const switchCase of node.cases) {
      if (String(switchCase.value) === value) {
        return { activeHandle: switchCase.handleId };
      }
    }

    return { activeHandle: node.fallbackHandleId ?? "" };
  },
);
