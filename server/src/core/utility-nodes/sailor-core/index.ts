import type { NodeHandler } from "../../nodes/types.ts";
import { aiAgentNodeHandler } from "../../nodes/handlers/ai-agent.ts";
import { aiMemoryNodeHandler } from "../../nodes/handlers/ai-memory.ts";
import { aiModelNodeHandler } from "../../nodes/handlers/ai-model.ts";
import { aiToolNodeHandler } from "../../nodes/handlers/ai-tool.ts";
import { codeNodeHandler } from "../../nodes/handlers/code.ts";
import { eventListenerNodeHandler } from "../../nodes/handlers/event-listener.ts";
import { eventNodeHandler } from "../../nodes/handlers/event.ts";
import { httpNodeHandler } from "../../nodes/handlers/http.ts";
import { ifNodeHandler } from "../../nodes/handlers/if.ts";
import { loopNodeHandler } from "../../nodes/handlers/loop.ts";
import { mergeNodeHandler } from "../../nodes/handlers/merge.ts";
import { respondWebhookNodeHandler } from "../../nodes/handlers/respond-webhook.ts";
import {
  databaseDatasetNodeHandler,
  embeddingsNodeHandler,
  fileDatasetNodeHandler,
  retrieverNodeHandler,
  textDatasetNodeHandler,
  vectorStoreNodeHandler,
} from "../../nodes/handlers/retrieval.ts";
import { setNodeHandler } from "../../nodes/handlers/set.ts";
import { splitInBatchesNodeHandler } from "../../nodes/handlers/split-in-batches.ts";
import { subWorkflowNodeHandler } from "../../nodes/handlers/subworkflow.ts";
import { switchNodeHandler } from "../../nodes/handlers/switch.ts";
import { triggerNodeHandler } from "../../nodes/handlers/trigger.ts";
import { waitFormNodeHandler } from "../../nodes/handlers/wait-form.ts";
import { basicLlmChainNodeHandler } from "../../nodes/handlers/basic-llm-chain.ts";
import { structuredJsonParserNodeHandler } from "../../nodes/handlers/output-parser.ts";
import { questionAnswerChainNodeHandler } from "../../nodes/handlers/question-answer-chain.ts";
import { vectorStoreRetrieverNodeHandler } from "../../nodes/handlers/vector-store-retriever.ts";
import { vectorStoreToolNodeHandler } from "../../nodes/handlers/vector-store-tool.ts";
import type { UtilityNodeManifestEntry } from "../utility-node-pack.types.ts";
import { sailorCoreUtilityNodePack } from "./manifest.ts";

export interface SailorCoreUtilityNode {
  manifest: UtilityNodeManifestEntry;
  handler: NodeHandler;
}

const handlers: NodeHandler[] = [
  triggerNodeHandler,
  codeNodeHandler,
  httpNodeHandler,
  ifNodeHandler,
  switchNodeHandler,
  loopNodeHandler,
  mergeNodeHandler,
  splitInBatchesNodeHandler,
  setNodeHandler,
  eventNodeHandler,
  eventListenerNodeHandler,
  subWorkflowNodeHandler,
  respondWebhookNodeHandler,
  waitFormNodeHandler,
  aiAgentNodeHandler,
  aiModelNodeHandler,
  aiMemoryNodeHandler,
  aiToolNodeHandler,
  textDatasetNodeHandler,
  fileDatasetNodeHandler,
  databaseDatasetNodeHandler,
  embeddingsNodeHandler,
  vectorStoreNodeHandler,
  retrieverNodeHandler,
  basicLlmChainNodeHandler,
  structuredJsonParserNodeHandler,
  vectorStoreRetrieverNodeHandler,
  questionAnswerChainNodeHandler,
  vectorStoreToolNodeHandler,
];

export const sailorCoreUtilityNodes: SailorCoreUtilityNode[] = handlers.map((handler) => {
  const manifest = sailorCoreUtilityNodePack.nodes[handler.type as keyof typeof sailorCoreUtilityNodePack.nodes];
  if (!manifest) {
    throw new Error(`Missing Sailor Core utility node manifest for "${handler.type}"`);
  }

  return {
    manifest,
    handler: {
      ...handler,
      metadata: {
        ...handler.metadata,
        description: manifest.description,
      },
    },
  };
});
