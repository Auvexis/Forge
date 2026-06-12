# Generic Advanced Node Dependencies Design

Date: 2026-06-12
Status: Proposed

## Goal

Create a generic architecture for workflow nodes that receive configuration nodes through handles. New models, retrievers, parsers, tools, vector stores, and future node families must integrate through shared contracts instead of node-specific frontend filters or execution-engine conditionals.

This design also covers:

- Fixing the missing provider icon and style on Embedding Model nodes.
- Vector Store Tool for AI Agent.
- Basic LLM Chain with an optional Output Parser.
- Question and Answer Chain with a Retriever.
- Vector Store Retriever with a nested Vector Store dependency.
- Structured JSON Parser as the first Output Parser.

## Design Principles

1. The core catalog is the single source of truth for node capabilities and configuration handles.
2. Frontend rendering, Add Node filtering, connection validation, workflow validation, and execution use the same contracts.
3. Plugins declare provider capabilities and methods, but do not import or orchestrate core nodes, engines, or other plugins.
4. Core services orchestrate models, embeddings, vector stores, retrievers, parsers, chains, and tools through stable interfaces.
5. Configuration dependencies are resolved recursively by one generic resolver.
6. Existing workflows remain compatible; configuration-edge semantics are derived from the target node and target handle.
7. Adding a compatible future node should normally require a catalog definition, its handler, and capability adapter, without editing existing consumer nodes.

## Current Problems

- Advanced node handles and allowed nodes are partly hardcoded in the frontend.
- The executor identifies configuration nodes through concrete node-type checks.
- AI Agent and Vector Store handlers manually inspect edges and concrete source types.
- Provider selection and execution logic is repeated between consumers.
- Nested configuration dependencies have no shared recursive resolution model.
- Embedding Model renders a hardcoded generic icon instead of the selected plugin icon and theme.

## Shared Vocabulary

### Node capability

A capability describes what a node can provide to another node. Initial capabilities:

```ts
type NodeCapability =
  | 'chat-model'
  | 'embedding-model'
  | 'vector-store'
  | 'retriever'
  | 'output-parser'
  | 'agent-tool'
  | 'memory-store'
  | 'document-source'
```

Capabilities are extensible strings at runtime so plugins and future core releases can add capabilities without changing every consumer type union.

### Configuration handle contract

```ts
interface ConfigHandleDefinition {
  id: string
  label: string
  type: 'source' | 'target'
  position: Position
  style?: 'circle' | 'diamond'
  required?: boolean
  accepts?: CapabilitySelector[]
  allowedNodes?: string[] | '*'
  cardinality?: 'one' | 'many'
  connectionPolicy?: 'replace' | 'append'
  quickAdd?: 'agent-config' | 'vector-config' | 'capability'
  quickAddAfterConnected?: boolean
}

interface CapabilitySelector {
  capability: NodeCapability | string
  providerId?: string
  methodId?: string
}
```

`accepts` is the preferred generic selector. `allowedNodes` remains available for exceptional restrictions and backward compatibility. When both are present, a candidate must satisfy both.

`cardinality` controls valid connections. `connectionPolicy` controls what Quick Add does when a single connection already exists. For example, Output Parser uses `cardinality: 'one'`, `connectionPolicy: 'replace'`, and `quickAddAfterConnected: true`.

### Node catalog definition

```ts
interface WorkflowNodeDefinition {
  type: string
  title: string
  description?: string
  role: 'flow' | 'configuration'
  capabilities: Array<NodeCapability | string>
  handles: ConfigHandleDefinition[]
  presentation?: {
    base: 'standard' | 'advanced'
    rounded?: 'sm' | 'md' | 'lg' | 'full'
    borderStyle?: 'default' | 'dashed'
    autoOrganize?: boolean
  }
}
```

The server-owned core catalog exposes these definitions through the existing workflow node catalog API. The frontend maps the definition directly into `BaseNode.vue` or `BaseAdvancedNode.vue` props.

Plugin-backed configuration nodes enrich their catalog entries with provider metadata, methods, logos, and styles from plugin manifests. Plugins remain unaware of consumers such as AI Agent or Basic LLM Chain.

## Frontend Architecture

### Catalog-driven rendering

- Replace consumer-specific advanced handle definitions with definitions loaded from the workflow node catalog.
- Keep a small local fallback only for loading/error resilience and legacy workflows.
- `BaseNode.vue` and `BaseAdvancedNode.vue` continue to render the shared handle format.
- Handle placement must not depend on whether an edge is connected.
- `style`, cardinality, Quick Add persistence, and allowed candidates come from the handle contract.

### Candidate discovery

The Add Node panel and handle Quick Add use one selector pipeline:

1. Load catalog nodes and plugin-provided node methods.
2. Filter by accepted capabilities.
3. Apply `allowedNodes` when explicitly configured.
4. Exclude nodes that violate cardinality or connection policy.
5. Group provider-backed methods under their provider node, preserving provider icon and style.

This removes lists such as "Chat Model nodes allowed by Tools Agent" from individual components. A new Chat Model provider becomes available wherever `chat-model` is accepted as soon as its catalog/plugin capability is registered.

### Provider appearance

Embedding Model must use the same provider metadata resolver as Chat Model:

- Load plugin metadata from `pluginId`.
- Resolve light/dark icon through the shared plugin icon resolver.
- Apply plugin background, border, and icon colors.
- Fall back to the generic Embedding Model presentation only when provider metadata is unavailable.

The implementation should extract or reuse a provider-presentation composable so future provider-backed configuration nodes do not duplicate this behavior.

## Execution Architecture

### Generic dependency resolver

Introduce a core `ConfigDependencyResolver` responsible for:

- Looking up the consumer definition and target handle.
- Finding incoming edges for each configuration handle.
- Validating accepted capabilities, explicit node restrictions, required state, and cardinality.
- Resolving nested dependencies recursively.
- Detecting dependency cycles with a readable path.
- Returning dependencies keyed by handle ID.
- Keeping configuration nodes out of normal linear workflow execution.

Conceptual result:

```ts
interface ResolvedConfigDependencies {
  getOne<T>(handleId: string): T
  getOptional<T>(handleId: string): T | undefined
  getMany<T>(handleId: string): T[]
}
```

Handlers consume dependencies by stable handle ID rather than searching workflow edges or checking concrete node types.

### Capability adapters

Each provided capability has a core adapter that turns a node definition into a stable runtime reference:

```ts
interface CapabilityAdapter<TReference> {
  capability: string
  resolve(context: DependencyResolutionContext): Promise<TReference>
}
```

Initial runtime references:

```ts
interface ChatModelRef {
  providerId: string
  methodId: string
  configuration: Record<string, unknown>
}

interface EmbeddingModelRef {
  providerId: string
  methodId: string
  configuration: Record<string, unknown>
}

interface RetrievedDocument {
  id?: string
  content: string
  score?: number
  metadata?: Record<string, unknown>
}

interface RetrievalResult {
  query: string
  documents: RetrievedDocument[]
  context: string
  metadata?: Record<string, unknown>
}

interface RetrieverRef {
  retrieve(query: string): Promise<RetrievalResult>
}

interface OutputParserRef {
  parse(value: string): Promise<unknown>
}

interface AgentToolRef {
  name: string
  description: string
  invoke(input: unknown): Promise<unknown>
}
```

Adapters may resolve nested dependencies. For example, a Vector Store Retriever adapter receives a resolved Vector Store reference; that Vector Store reference receives a resolved Embedding Model reference.

### Shared execution services

Core services own provider invocation and prevent orchestration duplication:

- `ChatModelExecutionService.invoke(model, request)`
- `EmbeddingExecutionService.embed(model, input)`
- `VectorStoreExecutionService.query(store, embedding, request)`
- `RetrieverExecutionService.retrieve(retriever, query)`
- `OutputParserExecutionService.parse(parser, value)`

These services use the existing plugin execution infrastructure. Consumer handlers never call a provider plugin through provider-specific branches.

## Node Contracts

### AI Agent

Existing configuration handles become catalog contracts:

- `chatModel`: accepts `chat-model`, required, one, replace.
- `memory`: accepts `memory-store`, optional, one, replace.
- `tool`: accepts `agent-tool`, optional, many, append.

The handler receives resolved model, memory, and tool references from the generic resolver.

### Vector Store

- Provides `vector-store`.
- `embedding`: accepts `embedding-model`, required, one, replace.
- `document`: accepts `document-source`, optional/many according to the existing ingestion mode, append.

Its adapter combines provider configuration with the resolved Embedding Model reference. Existing direct workflow execution for indexing remains supported.

### Vector Store Tool

- Role: configuration.
- Presentation: `BaseAdvancedNode`.
- Provides `agent-tool`.
- `vectorStore`: accepts `vector-store`, required, one, replace.
- `model`: accepts `chat-model`, required, one, replace.
- May expose tool name, description, retrieval limit, score threshold, and answer instructions as node parameters.

At runtime it creates an Agent tool. When invoked, the tool queries the connected Vector Store, builds grounded context, invokes the connected Chat Model, and returns at least:

```ts
{
  answer: string
  sources: RetrievedDocument[]
  metadata?: Record<string, unknown>
}
```

### Basic LLM Chain

- Role: flow.
- Presentation: `BaseAdvancedNode`.
- `model`: accepts `chat-model`, required, one, replace.
- `outputParser`: accepts `output-parser`, optional, one, replace.
- Output Parser Quick Add remains visible after connection.

The chain consumes normal workflow input, invokes the model, and returns model text when no parser is connected. With a parser, it returns the parsed value and preserves raw model output in metadata for diagnostics.

### Structured JSON Parser

- Role: configuration.
- Provides `output-parser`.
- Presentation: compact/full-rounded configuration node.
- Parameters: JSON schema, strict mode, and parse failure policy.

The initial failure policy should support failing the node with a precise validation message. Additional fallback policies can be added without changing Basic LLM Chain.

### Vector Store Retriever

- Role: configuration.
- Presentation: `BaseAdvancedNode`.
- Provides `retriever`.
- `vectorStore`: accepts `vector-store`, required, one, replace.
- Parameters: top K, score threshold, optional filters, and maximum context size.

The adapter returns a `RetrieverRef` and normalizes provider results into `RetrievalResult`.

### Question and Answer Chain

- Role: flow.
- Presentation: `BaseAdvancedNode`.
- `model`: accepts `chat-model`, required, one, replace.
- `retriever`: accepts `retriever`, required, one, replace.

The chain consumes the question from normal workflow input, retrieves context, invokes the model with grounded instructions, and returns:

```ts
{
  answer: string
  sources: RetrievedDocument[]
  metadata: {
    retrieval: Record<string, unknown>
    model?: Record<string, unknown>
  }
}
```

## Validation

Validation is split into two layers:

1. Catalog validation verifies definitions: unique handle IDs, valid source/target combinations, coherent cardinality and connection policies, and registered capabilities.
2. Workflow validation uses catalog definitions to verify required connections, compatibility, cardinality, dangling handles, and dependency cycles.

Runtime validation remains defensive and returns errors containing consumer node ID, handle ID, expected capability, and received node type/capabilities.

## Backward Compatibility

- Existing edge records remain unchanged.
- Configuration edges are recognized from the target node contract and `targetHandle`.
- Existing AI Agent, Vector Store, Embeddings, AI Model, AI Memory, and AI Tool workflows are migrated through compatible catalog definitions.
- Legacy frontend definitions remain only as a temporary fallback and are removed after catalog coverage is verified.
- Stored provider and method fields remain valid for current Chat Model and Embedding Model nodes.

## Testing Strategy

### Contract and catalog tests

- Definition schema validation.
- Capability matching and explicit allowed-node intersection.
- Cardinality and replace/append policies.
- Catalog serialization from server to frontend.

### Resolver tests

- Required, optional, single, and multiple dependencies.
- Recursive Vector Store Retriever to Vector Store to Embedding Model resolution.
- Cycle detection and readable errors.
- Configuration nodes excluded from normal workflow execution.
- Compatibility failures detected before provider invocation.

### Runtime tests

- Vector Store Tool retrieval plus model answer, including sources.
- Basic LLM Chain with and without Structured JSON Parser.
- Structured JSON Parser schema failure.
- Question and Answer Chain answer, sources, and metadata.
- Existing AI Agent and Vector Store behavior remains compatible.

### Frontend tests

- Embedding Model displays the selected plugin icon and style.
- Quick Add candidates are derived from capabilities.
- Output Parser Quick Add remains visible after connection and replaces the existing parser.
- Handles remain in their declared position with and without connections.
- Nested dependencies auto-organize correctly.
- New provider-backed nodes appear without consumer-specific changes.

## Delivery Boundaries

Implementation should be divided into independently verifiable slices:

1. Shared contracts, catalog schema, and compatibility layer.
2. Frontend catalog consumption, candidate discovery, and Embedding Model appearance fix.
3. Generic server dependency resolver and capability adapters.
4. Migration of AI Agent and Vector Store away from concrete edge/type checks.
5. Structured JSON Parser and Basic LLM Chain.
6. Vector Store Retriever and Question and Answer Chain.
7. Vector Store Tool and full Agent integration.
8. Regression, visual, migration, and end-to-end verification.

Each slice must add tests before implementation and must leave existing workflows executable.

## Non-Goals

- Moving chain orchestration into provider plugins.
- Adding provider-specific conditions to consumer handlers.
- Changing the persisted edge schema solely to distinguish configuration edges.
- Implementing every possible Output Parser, Retriever, or Chain in the first release.
- Replacing normal workflow data edges with configuration dependency edges.

## Acceptance Criteria

- A future node can accept Chat Models, Embedding Models, Retrievers, Output Parsers, or Agent Tools by declaring capability-based handles.
- A future provider becomes available to compatible handles without editing each consumer node.
- Frontend filtering and backend validation agree because they consume the same catalog contracts.
- Nested configuration dependencies resolve recursively and cycles are rejected.
- AI Agent and Vector Store no longer manually classify configuration nodes through concrete-type conditionals.
- Vector Store Tool, Basic LLM Chain, Vector Store Retriever, Question and Answer Chain, and Structured JSON Parser behave as defined above.
- Embedding Model displays its selected plugin identity correctly.
