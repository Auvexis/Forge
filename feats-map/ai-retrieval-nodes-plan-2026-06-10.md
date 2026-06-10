# AI Retrieval Nodes MVP Plan

Goal: add Dataset, Embeddings, Vector Store, and Retriever nodes for RAG workflows in Sailor.

## Decisions

- Keep orchestration nodes in core utility nodes.
- Keep provider-specific vector store calls inside plugins.
- Plugins must not import core/engine code or other plugins.
- Core talks to providers only through generic node/plugin contracts.
- Core utility nodes must not contain provider-specific branches such as Pinecone/Qdrant logic.
- Provider-specific logic belongs only inside the matching plugin methods.
- Shared contracts are allowed; core and plugins can both depend on shared model shapes.
- Dataset nodes are generic data utility nodes, not AI-only nodes.
- Dataset output must work with Split In Batches, HTTP, Telegram, Gmail, plugin nodes, and RAG nodes.
- MVP must include Pinecone and Qdrant vector store plugins.
- MVP must support local and cloud/self-hosted configuration for Pinecone and Qdrant.
- Use TDD for contracts, handlers, plugin methods, and frontend editors.

## MVP Scope

- Dataset node:
  - Support only Text Dataset, File Dataset, and Database Dataset in MVP.
  - Normalize input into documents.
  - Add metadata per document.
  - Output generic `items[]` that can be consumed by non-AI workflow nodes.
  - Also expose document fields usable by Embeddings/Retriever flows.

- Text Dataset:
  - Accept raw text, JSON array, or previous node output.

- File Dataset:
  - Support TXT, Markdown, JSON, and CSV first.
  - PDF/OCR stays out of MVP unless added later.

- Database Dataset:
  - Read rows through database provider plugins.
  - Map selected columns into document text and metadata.

- URL Dataset:
  - Out of MVP.

- Chunk Dataset node behavior:
  - chunk size
  - chunk overlap
  - contextual overlap/carry-over from the previous chunk
  - option to enable/disable contextual overlap
  - max previous context chars/tokens
  - metadata carry-over
  - stable chunk IDs

- Embeddings node:
  - Use a provider plugin method to create embeddings.
  - Support OpenAI-compatible and Ollama first.
  - Output vector dimension and model metadata.

- Vector Store node:
  - Configure a vector store provider.
  - MVP providers:
    - Pinecone
    - Qdrant
    - Postgres/Supabase pgvector if already cheap to reuse

- Retriever node:
  - Query configured vector store.
  - Return topK chunks with score and metadata.
  - Connect retrieved context into AI Agent.

## Vector Store Plugin Contracts

Each vector store plugin must expose generic methods:

- `ensureCollection`
- `upsertDocuments`
- `querySimilar`
- `deleteDocuments`
- `describeCollection`

Shared input/output contracts:

- `VectorStoreProviderConfig`
- `VectorDocument`
- `VectorQuery`
- `VectorSearchResult`
- `VectorCollectionInfo`

## Pinecone Plugin

Modes:

- `cloud`
- `local`

Cloud config:

- `apiKeyCredentialId`
- `indexName`
- `namespace`
- `cloud`
- `region`
- `metric`
- `dimension`
- `host`
- `timeoutMs`

Local config:

- `localHost`
- `indexName`
- `namespace`
- `metric`
- `dimension`
- `timeoutMs`

Notes:

- Pinecone Local is for local development/test only.
- Pinecone cloud is the production path.
- Local mode should not require API key.
- Cloud mode must use Sailor credentials.

## Qdrant Plugin

Modes:

- `local`
- `cloud`
- `self-hosted`

Local config:

- `url`
- `collectionName`
- `distance`
- `dimension`
- `preferGrpc`
- `timeoutMs`

Cloud/self-hosted config:

- `url`
- `apiKeyCredentialId`
- `collectionName`
- `distance`
- `dimension`
- `preferGrpc`
- `tls`
- `timeoutMs`

Notes:

- Local default should target Docker/local Qdrant.
- Cloud and self-hosted use the same client shape: URL plus optional API key.
- Collection creation must be idempotent.

## Backend Tasks

- [x] Define generic dataset output contract with `items`, `count`, `sourceType`, `text`, `metadata`, and `raw`.
- [x] Add shared vector retrieval types.
- [x] Add workflow node types for `text-dataset`, `file-dataset`, `database-dataset`, `embeddings`, `vector-store`, and `retriever`.
- [x] Add utility catalog entries for the new nodes.
- [x] Add handlers with failing tests first.
- [x] Add vector store provider contract tests.
- [x] Add Pinecone plugin manifest and methods.
- [x] Add Pinecone local/cloud config validation tests.
- [x] Add Qdrant plugin manifest and methods.
- [x] Add Qdrant local/cloud/self-hosted config validation tests.
- [x] Add Dataset to Split In Batches compatibility tests.
- [x] Add retriever-to-agent integration tests.

## Frontend Tasks

- [ ] Add node components for Text Dataset, File Dataset, Database Dataset, Embeddings, Vector Store, and Retriever.
- [ ] Add editors for each new node.
- [ ] Add provider-specific config sections for Pinecone and Qdrant.
- [ ] Add mode selector: local/cloud/self-hosted where applicable.
- [ ] Add Dataset chunking switch using `BaseSwitch.vue` for contextual overlap.
- [ ] Add credential picker for cloud/self-hosted configs.
- [ ] Add validation hints for dimension, collection/index name, namespace, URL, topK, and score threshold.
- [ ] Add Add Node picker coverage.

## Test Strategy

- Backend contract tests for shared types and node handlers.
- Chunking tests for contextual overlap enabled/disabled.
- Dataset compatibility tests with Split In Batches and plugin node payloads.
- Plugin method tests with mocked HTTP clients.
- Validation tests for local/cloud provider configs.
- Frontend contract tests for editors and picker.
- Integration test: Dataset -> Embeddings -> Vector Store -> Retriever -> AI Agent.

## Risks

- Vector dimension mismatch can silently break search quality.
- Reindexing without stable IDs can duplicate documents.
- Contextual overlap improves recall but can increase token/cost and duplicate noisy context.
- Pinecone Local is not production-safe.
- Qdrant local/self-hosted needs clear URL/API key behavior.
- Retriever must not directly depend on provider SDKs in core.

## Recommended Build Order

1. Shared contracts and config validation.
2. Dataset and chunking.
3. Embeddings provider abstraction.
4. Qdrant plugin.
5. Pinecone plugin.
6. Vector Store node.
7. Retriever node.
8. AI Agent context integration.
9. Frontend editors.
10. Full verification.
