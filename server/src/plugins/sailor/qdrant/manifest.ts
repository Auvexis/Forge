import { definePluginManifest } from "@auvexis/sailor-sdk";

export default definePluginManifest({
  metadata: {
    id: "sailor-qdrant",
    name: "Qdrant",
    description: "Use Qdrant Local, Qdrant Cloud, or self-hosted Qdrant as a vector store provider.",
    icon: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/qdrant.svg",
    categories: ["AI", "Data transformation"],
    author: "Sailor",
    version: "1.0.0",
    repository: "https://github.com/Auvexis/sailor",
  },
  methods: {
    ensureCollection: {
      metadata: {
        label: "Ensure Collection",
        description: "Creates or updates a Qdrant collection if needed.",
      },
      parameters: { type: "object", properties: {}, required: [] },
      responseSchema: { type: "object", properties: { ok: { type: "boolean" } } },
    },
    upsertDocuments: {
      metadata: {
        label: "Upsert Documents",
        description: "Upserts vector documents into Qdrant.",
      },
      parameters: { type: "object", properties: {}, required: [] },
      responseSchema: { type: "object", properties: { upsertedCount: { type: "number" } } },
    },
    querySimilar: {
      metadata: {
        label: "Query Similar",
        description: "Searches Qdrant for similar vector documents.",
      },
      parameters: { type: "object", properties: {}, required: [] },
      responseSchema: { type: "array", items: { type: "object", additionalProperties: true } },
      agentTool: {
        enabled: true,
        name: "qdrant_query_similar",
        description: "Searches Qdrant for similar vector documents using a vector query.",
        sideEffect: "read",
        requiresApproval: false,
        timeoutMs: 30000,
      },
    },
    deleteDocuments: {
      metadata: {
        label: "Delete Documents",
        description: "Deletes vector documents from Qdrant.",
      },
      parameters: { type: "object", properties: {}, required: [] },
      responseSchema: { type: "object", properties: { ok: { type: "boolean" } } },
    },
    describeCollection: {
      metadata: {
        label: "Describe Collection",
        description: "Returns Qdrant collection information.",
      },
      parameters: { type: "object", properties: {}, required: [] },
      responseSchema: { type: "object", additionalProperties: true },
    },
  },
  triggers: {},
});
