import type { LoopNode } from "../../../shared/models/workflow-types.ts";
import { resolvePath } from "../../modules/workflows/parser.ts";
import { createNodeHandler } from "../registry.ts";
import { executeBodySubgraph } from "../subgraph.ts";

export const loopNodeHandler = createNodeHandler<LoopNode>("loop", async (input) => {
  const { node, context } = input;
  const collection = resolveLoopCollection(node.collection, context);

  if (!Array.isArray(collection)) {
    throw new Error(
      `Loop node collection is not an array. Resolved value: ${typeof collection}`,
    );
  }

  const maxIterations = node.maxIterations || 1000;
  const iterations = Math.min(collection.length, maxIterations);
  const results: any[] = [];

  for (let index = 0; index < iterations; index++) {
    context.variables.$item = collection[index];
    context.variables.$index = index;
    context.variables.$total = collection.length;

    const iterationResults = await executeBodySubgraph({
      ownerNodeId: input.nodeId,
      bodyHandle: "loop-body",
      input,
      context,
    });
    results.push(...iterationResults);
  }

  delete context.variables.$item;
  delete context.variables.$index;
  delete context.variables.$total;

  return { iterations, results };
});

function resolveLoopCollection(collectionExpression: string, context: any): unknown {
  const collectionExpr = collectionExpression.trim();
  const templateMatch = /^{{\s*([a-zA-Z0-9_.\[\]]+)\s*}}$/.exec(collectionExpr);
  return templateMatch
    ? resolvePath(context, templateMatch[1])
    : resolvePath(context, collectionExpr);
}
