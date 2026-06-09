import type { FastifyInstance } from "fastify";
import { listUtilityNodeCatalogItems } from "../utility-nodes/utility-node-catalog.ts";

export default async function workflowNodeCatalogRoutes(fastify: FastifyInstance) {
  fastify.get("/workflow-nodes/catalog", async () => ({
    nodes: listUtilityNodeCatalogItems(),
  }));
}
