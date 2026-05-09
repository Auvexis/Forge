import type { SplitInBatchesNode } from "../../../shared/models/workflow-types.ts";
import { evaluateExpression } from "../expression.ts";
import { createNodeHandler } from "../handler.ts";
import { executeBodySubgraph } from "../subgraph.ts";

export const splitInBatchesNodeHandler = createNodeHandler<SplitInBatchesNode>(
  "split-in-batches",
  async (input) => {
    const { node, context } = input;
    const collection = evaluateExpression(node.collection, context);

    if (!Array.isArray(collection)) {
      throw new Error(
        `Split In Batches: collection expression "${node.collection}" did not resolve to an array.`,
      );
    }

    const chunks = chunkCollection(collection, Math.max(1, node.batchSize), node.maxBatches ?? 100);

    for (let index = 0; index < chunks.length; index++) {
      const chunk = chunks[index];
      const batchContext = {
        ...context,
        steps: { ...context.steps },
        variables: {
          ...context.variables,
          $batch: chunk,
          $batchIndex: index,
          $batchTotal: chunks.length,
          $batchSize: chunk.length,
        },
      };

      await executeBodySubgraph({
        ownerNodeId: input.nodeId,
        bodyHandle: "batch-body",
        input,
        context: batchContext,
        onNodeResult: (nodeId) => {
          context.steps[nodeId] = batchContext.steps[nodeId];
        },
      });
    }

    delete context.variables.$batch;
    delete context.variables.$batchIndex;
    delete context.variables.$batchTotal;
    delete context.variables.$batchSize;

    return { batches: chunks.length, totalItems: collection.length };
  },
);

function chunkCollection(
  collection: unknown[],
  batchSize: number,
  maxBatches: number,
): unknown[][] {
  const chunks: unknown[][] = [];
  for (let index = 0; index < collection.length; index += batchSize) {
    chunks.push(collection.slice(index, index + batchSize));
    if (chunks.length >= maxBatches) break;
  }
  return chunks;
}
