import type { FastifyInstance } from "fastify";
import { listUtilityNodeCatalogItems } from "../utility-nodes/utility-node-catalog.ts";

export default async function workflowNodeCatalogRoutes(fastify: FastifyInstance) {
  fastify.get("/workflow-nodes/catalog", async () => ({
    status_code: 200,
    message: "Workflow node catalog fetched successfully",
    error: null,
    data: {
      nodes: listUtilityNodeCatalogItems(),
    },
  }));
}
