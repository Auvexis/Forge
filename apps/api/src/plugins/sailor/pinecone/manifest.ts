import { definePluginManifest } from "@auvexis/sailor-sdk";

export default definePluginManifest({
  metadata: {
    id: "sailor-pinecone",
    name: "Pinecone",
    description: "Use Pinecone Cloud or Pinecone Local as a vector store provider.",
    icon: "https://cdn.brandfetch.io/idCLuo1dQ8/w/178/h/178/theme/dark/icon.png?c=1dxbfHSJFAPEGdCLU4o5B",
    categories: ["AI", "Data transformation"],
    author: "Sailor",
    version: "1.0.0",
    repository: "https://github.com/Auvexis/sailor",
  },
  methods: {
    ensureCollection: {
      metadata: {
        label: "Ensure Collection",
        description: "Validates Pinecone vector store configuration for an index.",
      },
      parameters: { type: "object", properties: {}, required: [] },
      responseSchema: { type: "object", properties: { ok: { type: "boolean" } } },
    },
    upsertDocuments: {
      metadata: {
        label: "Upsert Documents",
        description: "Upserts vector documents into Pinecone.",
      },
      parameters: { type: "object", properties: {}, required: [] },
      responseSchema: { type: "object", properties: { upsertedCount: { type: "number" } } },
    },
    querySimilar: {
      metadata: {
        label: "Query Similar",
        description: "Searches Pinecone for similar vector documents.",
      },
      parameters: { type: "object", properties: {}, required: [] },
      responseSchema: { type: "array", items: { type: "object", additionalProperties: true } },
      agentTool: {
        enabled: true,
        name: "pinecone_query_similar",
        description: "Searches Pinecone for similar vector documents using a vector query.",
        sideEffect: "read",
        requiresApproval: false,
        timeoutMs: 30000,
      },
    },
    deleteDocuments: {
      metadata: {
        label: "Delete Documents",
        description: "Deletes vector documents from Pinecone.",
      },
      parameters: { type: "object", properties: {}, required: [] },
      responseSchema: { type: "object", properties: { ok: { type: "boolean" } } },
    },
    describeCollection: {
      metadata: {
        label: "Describe Collection",
        description: "Returns Pinecone index stats for the configured namespace.",
      },
      parameters: { type: "object", properties: {}, required: [] },
      responseSchema: {
        type: "object",
        properties: {
          namespaces: { type: "object", additionalProperties: true },
          dimension: { type: "number" },
          totalVectorCount: { type: "number" },
        },
      },
    },
  },
  triggers: {},
});
