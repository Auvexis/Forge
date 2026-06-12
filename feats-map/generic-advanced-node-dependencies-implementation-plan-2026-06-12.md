# Generic Advanced Node Dependencies Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a catalog-driven dependency system for Advanced Nodes and deliver Vector Store Tool, Basic LLM Chain, Structured JSON Parser, Vector Store Retriever, and Question and Answer Chain without consumer-specific provider wiring.

**Architecture:** The Sailor Core utility-node catalog becomes the shared source of node roles, capabilities, presentation, and configuration handles. A server-side recursive dependency resolver validates and resolves configuration edges through capability adapters, while the frontend uses the same serialized contracts for rendering and Quick Add filtering. Provider plugins continue to expose methods and metadata only; orchestration remains in core services.

**Tech Stack:** TypeScript, Vue 3, Vue Flow, Node.js test runner, Fastify, AJV, Sailor plugin execution services.

**Approved design:** `feats-map/generic-advanced-node-dependencies-design-2026-06-12.md`

**Execution cadence:** Execute exactly two tasks per implementation round, run the listed checkpoint verification, report results, and wait for the user's `Continue` before starting the next pair.

---

## File Map

### Shared catalog and contracts

- Modify `server/src/core/utility-nodes/utility-node-pack.types.ts`: canonical capability, handle, role, and presentation contracts.
- Modify `server/src/core/utility-nodes/define-utility-node-pack.ts`: validate catalog definitions when packs are declared.
- Modify `server/src/core/utility-nodes/sailor-core/manifest.ts`: declare capabilities and handles for existing and new core nodes.
- Modify `server/src/core/utility-nodes/utility-node-catalog.ts`: serialize complete definitions to the API.
- Modify `server/src/core/routes/workflow-node-catalog.routes.test.ts`: verify the public catalog shape.
- Modify `client-vue/src/core/types/workflow-node-catalog.types.ts`: frontend mirror of the serialized catalog contract.

### Frontend catalog and node presentation

- Create `client-vue/src/features/workflow-editor/catalog/nodeDefinitionRegistry.ts`: indexed catalog access and legacy fallback.
- Create `client-vue/src/features/workflow-editor/catalog/nodeCapabilityMatcher.ts`: capability and explicit-node candidate matching.
- Create `client-vue/src/features/workflow-editor/composables/usePluginNodePresentation.ts`: shared provider icon/style loading.
- Modify `client-vue/src/features/workflow-editor/components/nodePresentation.types.ts`: cardinality, policy, and capability selectors.
- Modify `client-vue/src/features/workflow-editor/layout/advancedNodeDefinitions.ts`: compatibility adapter backed by catalog definitions.
- Modify `client-vue/src/features/workflow-editor/components/BaseNode.vue`: render catalog handlers and connection policies.
- Modify `client-vue/src/features/workflow-editor/components/BaseAdvancedNode.vue`: pass catalog presentation and handlers through unchanged.
- Modify `client-vue/src/features/workflow-editor/components/settings/allowedNodeSelectors.ts`: delegate to generic capability matcher.
- Modify `client-vue/src/features/workflow-editor/components/settings/AddNodePanel.vue`: capability-driven contextual picker.
- Modify `client-vue/src/features/workflow-editor/components/settings/addNodePickerModel.ts`: hide configuration nodes globally and expand them contextually.
- Modify `client-vue/src/features/workflow-editor/components/nodes/EmbeddingsNode.vue`: provider icon/style through the shared composable.

### Core dependency runtime

- Create `server/src/core/nodes/dependencies/dependency-types.ts`: resolved references, adapters, and resolver interfaces.
- Create `server/src/core/nodes/dependencies/capability-adapter-registry.ts`: capability adapter registration and lookup.
- Create `server/src/core/nodes/dependencies/config-dependency-resolver.ts`: recursive handle resolution and cycle detection.
- Create `server/src/core/nodes/dependencies/config-dependency-resolver.test.ts`: resolver unit coverage.
- Create `server/src/core/nodes/dependencies/core-capability-adapters.ts`: core adapters for existing configuration nodes.
- Modify `server/src/core/nodes/types.ts`: expose dependency services to handlers.
- Modify `server/src/core/modules/workflows/executor.ts`: classify configuration edges through catalog definitions.
- Modify `server/src/core/modules/workflows/workflow-validation.ts`: validate required handles, compatibility, cardinality, and cycles.
- Modify `server/src/core/modules/workflows/agent-config-node-execution.test.ts`: replace AI-specific expectations with generic traversal coverage.

### Shared AI and retrieval services

- Create `server/src/core/modules/ai-services/chat-model-execution-service.ts`: provider-neutral chat invocation.
- Create `server/src/core/modules/ai-services/embedding-execution-service.ts`: provider-neutral embedding invocation.
- Create `server/src/core/modules/ai-services/vector-store-execution-service.ts`: normalized query and indexing operations.
- Create `server/src/core/modules/ai-services/output-parser-execution-service.ts`: parser invocation boundary.
- Create `server/src/core/modules/ai-services/ai-service-types.ts`: reusable references and result types.
- Modify `server/src/core/nodes/handlers/ai-agent.ts`: consume resolved references instead of searching edges.
- Split `server/src/core/nodes/handlers/retrieval.ts`: retain dataset handlers and move vector execution to focused services/handlers.

### New node families

- Modify `server/src/shared/models/workflow-types.ts`: add new node discriminants and parameters.
- Modify `client-vue/src/core/types/workflow.types.ts`: mirror new workflow node types.
- Create Vue node components for `BasicLlmChainNode`, `StructuredJsonParserNode`, `VectorStoreRetrieverNode`, `QuestionAnswerChainNode`, and `VectorStoreToolNode`.
- Create matching editor components and register them in `client-vue/src/features/workflow-editor/components/settings/editors/index.ts`.
- Modify `client-vue/src/features/workflow-editor/components/SailorWorkflowCanvas.vue`: register renderers and defaults.
- Create focused server handlers for parsers, chains, retrievers, and tools.
- Modify `server/src/core/utility-nodes/sailor-core/index.ts`: register new handlers.

---

## Round 1: Contracts And Catalog UX

### Task 1: Add canonical node capability and handle contracts [COMPLETE]

**Files:**
- Modify: `server/src/core/utility-nodes/utility-node-pack.types.ts`
- Modify: `server/src/core/utility-nodes/define-utility-node-pack.ts`
- Modify: `server/src/core/utility-nodes/sailor-core/manifest.ts`
- Modify: `server/src/core/utility-nodes/utility-node-pack.test.ts`
- Modify: `server/src/core/routes/workflow-node-catalog.routes.test.ts`
- Modify: `client-vue/src/core/types/workflow-node-catalog.types.ts`
- Modify: `client-vue/src/core/api/__tests__/workflowNodes.api.contract.test.ts`

- [x] **Step 1: Write failing catalog contract tests**

Add assertions that `ai-agent`, `vector-store`, `ai-model`, `embeddings`, datasets, and `ai-tool` expose roles, capabilities, presentation, and handles. Use the following expected shape as the contract:

```ts
assert.deepEqual(catalogByType.get("ai-agent")?.handles, [
  {
    id: "chatModel",
    label: "Chat Model",
    type: "target",
    position: "bottom",
    style: "diamond",
    required: true,
    accepts: [{ capability: "chat-model" }],
    cardinality: "one",
    connectionPolicy: "replace",
    quickAdd: "capability",
    quickAddAfterConnected: false,
  },
  {
    id: "memory",
    label: "Memory",
    type: "target",
    position: "bottom",
    style: "diamond",
    required: false,
    accepts: [{ capability: "memory-store" }],
    cardinality: "one",
    connectionPolicy: "replace",
    quickAdd: "capability",
    quickAddAfterConnected: false,
  },
  {
    id: "tool",
    label: "Tool",
    type: "target",
    position: "bottom",
    style: "diamond",
    required: false,
    accepts: [{ capability: "agent-tool" }],
    cardinality: "many",
    connectionPolicy: "append",
    quickAdd: "capability",
    quickAddAfterConnected: true,
  },
]);
```

- [x] **Step 2: Run the tests and verify they fail**

Run:

```powershell
cd server
node --test src/core/utility-nodes/utility-node-pack.test.ts src/core/routes/workflow-node-catalog.routes.test.ts
```

Expected: FAIL because catalog entries do not yet expose `role`, `capabilities`, `handles`, or `presentation`.

- [x] **Step 3: Define the canonical server contracts**

Add these types to `utility-node-pack.types.ts`:

```ts
export type NodeRole = "flow" | "configuration";
export type NodeHandleType = "source" | "target";
export type NodeHandlePosition = "top" | "left" | "bottom" | "right";
export type NodeHandleStyle = "circle" | "diamond";
export type NodeCardinality = "one" | "many";
export type NodeConnectionPolicy = "replace" | "append";

export interface NodeCapabilitySelector {
  capability: string;
  providerId?: string;
  methodId?: string;
}

export interface UtilityNodeHandleDefinition {
  id: string;
  label: string;
  type: NodeHandleType;
  position: NodeHandlePosition;
  style?: NodeHandleStyle;
  required?: boolean;
  accepts?: NodeCapabilitySelector[];
  allowedNodes?: string[] | "*";
  cardinality?: NodeCardinality;
  connectionPolicy?: NodeConnectionPolicy;
  quickAdd?: "capability";
  quickAddAfterConnected?: boolean;
}

export interface UtilityNodePresentation {
  base: "standard" | "advanced";
  rounded?: "sm" | "md" | "lg" | "full";
  borderStyle?: "default" | "dashed";
  autoOrganize?: boolean;
}
```

Extend `UtilityNodeManifestEntry` with required `role`, `capabilities`, `handles`, and `presentation` fields. In `define-utility-node-pack.ts`, reject duplicate handle IDs and reject `append` with `cardinality: "one"`.

- [x] **Step 4: Populate existing Sailor Core definitions**

Use these capability assignments:

```ts
"ai-model": { role: "configuration", capabilities: ["chat-model"] }
"ai-memory": { role: "configuration", capabilities: ["memory-store"] }
"ai-tool": { role: "configuration", capabilities: ["agent-tool"] }
embeddings: { role: "configuration", capabilities: ["embedding-model"] }
"vector-store": { role: "flow", capabilities: ["vector-store"] }
"text-dataset": { role: "configuration", capabilities: ["document-source"] }
"file-dataset": { role: "configuration", capabilities: ["document-source"] }
"database-dataset": { role: "configuration", capabilities: ["document-source"] }
```

All ordinary nodes use `capabilities: []`, `handles: []`, and `presentation.base: "standard"`. Configuration children expose one top source handle. AI Agent and Vector Store use the approved target handle contracts.

- [x] **Step 5: Mirror the serialized types in the frontend**

Extend `WorkflowNodeCatalogItem` with the same fields, using string positions at the API boundary. Do not import Vue Flow types into core API types.

- [x] **Step 6: Run focused tests and type checks**

Run:

```powershell
cd server
node --test src/core/utility-nodes/utility-node-pack.test.ts src/core/routes/workflow-node-catalog.routes.test.ts
npm run build
cd ../client-vue
node --test src/core/api/__tests__/workflowNodes.api.contract.test.ts
npm run type-check
```

Expected: all commands PASS.

- [x] **Step 7: Commit Task 1**

```powershell
git add server/src/core/utility-nodes server/src/core/routes/workflow-node-catalog.routes.test.ts client-vue/src/core/types/workflow-node-catalog.types.ts client-vue/src/core/api/__tests__/workflowNodes.api.contract.test.ts
git commit -m "feat: define workflow node dependency contracts"
```

### Task 2: Drive frontend handles and provider presentation from the catalog [COMPLETE]

**Files:**
- Create: `client-vue/src/features/workflow-editor/catalog/nodeDefinitionRegistry.ts`
- Create: `client-vue/src/features/workflow-editor/catalog/nodeCapabilityMatcher.ts`
- Create: `client-vue/src/features/workflow-editor/catalog/__tests__/nodeCapabilityMatcher.test.ts`
- Create: `client-vue/src/features/workflow-editor/composables/usePluginNodePresentation.ts`
- Modify: `client-vue/src/features/workflow-editor/components/nodePresentation.types.ts`
- Modify: `client-vue/src/features/workflow-editor/layout/advancedNodeDefinitions.ts`
- Modify: `client-vue/src/features/workflow-editor/components/settings/allowedNodeSelectors.ts`
- Modify: `client-vue/src/features/workflow-editor/components/settings/addNodePickerModel.ts`
- Modify: `client-vue/src/features/workflow-editor/components/settings/AddNodePanel.vue`
- Modify: `client-vue/src/features/workflow-editor/components/nodes/AiModelNode.vue`
- Modify: `client-vue/src/features/workflow-editor/components/nodes/EmbeddingsNode.vue`
- Modify: `client-vue/src/features/workflow-editor/components/nodes/__tests__/retrievalNodes.contract.test.ts`
- Modify: `client-vue/src/features/workflow-editor/components/settings/__tests__/allowedNodeSelectors.test.ts`

- [x] **Step 1: Write failing capability matching tests**

Cover capability matches, explicit restrictions, provider restrictions, global picker hiding, and Quick Add replacement:

```ts
assert.equal(matchesNodeDefinition(handle, embeddingDefinition), true)
assert.equal(matchesNodeDefinition(chatModelHandle, embeddingDefinition), false)
assert.equal(matchesNodeDefinition(restrictedHandle, otherProviderDefinition), false)
assert.equal(shouldShowQuickAdd(parserHandle, 1), true)
assert.equal(nextConnectionAction(parserHandle, 1), "replace")
assert.equal(nextConnectionAction(toolHandle, 3), "append")
```

- [x] **Step 2: Run the frontend tests and verify they fail**

Run:

```powershell
cd client-vue
node --test src/features/workflow-editor/catalog/__tests__/nodeCapabilityMatcher.test.ts src/features/workflow-editor/components/settings/__tests__/allowedNodeSelectors.test.ts src/features/workflow-editor/components/nodes/__tests__/retrievalNodes.contract.test.ts
```

Expected: FAIL because the registry, matcher, and provider-presentation composable do not exist.

- [x] **Step 3: Implement the indexed definition registry**

Expose a small stateful registry:

```ts
let definitions = new Map<string, WorkflowNodeCatalogItem>()

export function replaceNodeDefinitions(items: readonly WorkflowNodeCatalogItem[]) {
  definitions = new Map(items.map((item) => [item.type, item]))
}

export function getNodeDefinition(type: string) {
  return definitions.get(type)
}
```

Initialize it when `workflowNodesApi.getCatalog()` resolves in the existing Add Node catalog-loading path.

- [x] **Step 4: Implement generic candidate matching**

`matchesNodeDefinition(handle, candidate)` must:

1. Match any declared `accepts.capability` against `candidate.capabilities`.
2. Apply optional `providerId` and `methodId` restrictions.
3. Apply `allowedNodes` as an additional intersection when present.
4. Return false for a target node selecting itself.

Add pure helpers:

```ts
export function shouldShowQuickAdd(handle: CatalogHandle, connectionCount: number): boolean
export function nextConnectionAction(handle: CatalogHandle, connectionCount: number): "append" | "replace" | "blocked"
```

- [x] **Step 5: Adapt API positions to Vue Flow positions**

Keep `advancedNodeDefinitions.ts` as a temporary adapter:

```ts
export function getAdvancedNodeHandlers(type: string): BaseNodeHandlerDefinition[] {
  return (getNodeDefinition(type)?.handles ?? []).map((handle) => ({
    ...handle,
    position: toVueFlowPosition(handle.position),
    allowedNodes: handle.allowedNodes ?? selectorsFromCapabilities(handle.accepts ?? []),
  }))
}
```

Remove the hardcoded `AI_AGENT_HANDLERS` and `VECTOR_STORE_HANDLERS` arrays after tests use catalog fixtures.

- [x] **Step 6: Extract and use provider presentation**

Move the plugin metadata loading currently in `AiModelNode.vue` into `usePluginNodePresentation(pluginIdRef)`. Return `icon`, `customBg`, `customBorder`, and `customIconColor`. Use it from both AI Model and Embeddings nodes.

The Embeddings fallback remains `scan-text`, but a valid `pluginId` must display the plugin logo and style.

- [x] **Step 7: Update Add Node and Quick Add filtering**

Use catalog capabilities for contextual candidates. Keep configuration-role nodes hidden in the global Add Node list and expose them only when a compatible handle opens Quick Add. Remove the old broad `agent-config` and `vector-config` branching after the capability path covers existing handles.

- [x] **Step 8: Run tests, type check, and build**

Run:

```powershell
cd client-vue
node --test src/features/workflow-editor/catalog/__tests__/nodeCapabilityMatcher.test.ts src/features/workflow-editor/components/settings/__tests__/allowedNodeSelectors.test.ts src/features/workflow-editor/components/settings/__tests__/agentAddNode.contract.test.ts src/features/workflow-editor/components/nodes/__tests__/retrievalNodes.contract.test.ts
npm run type-check
npm run build-only
```

Expected: all commands PASS.

- [x] **Step 9: Commit Task 2**

```powershell
git add client-vue/src/features/workflow-editor client-vue/src/core/types/workflow-node-catalog.types.ts
git commit -m "feat: drive advanced node UX from catalog capabilities"
```

### Round 1 checkpoint

Verify the global picker still hides configuration nodes, handle Quick Add shows only compatible candidates, AI Model behavior is unchanged, and Embedding Model shows its selected provider icon. Stop after reporting these results.

---

## Round 2: Generic Dependency Resolution

### Task 3: Implement recursive configuration dependency resolution [COMPLETE]

**Files:**
- Create: `server/src/core/nodes/dependencies/dependency-types.ts`
- Create: `server/src/core/nodes/dependencies/capability-adapter-registry.ts`
- Create: `server/src/core/nodes/dependencies/config-dependency-resolver.ts`
- Create: `server/src/core/nodes/dependencies/config-dependency-resolver.test.ts`
- Modify: `server/src/core/nodes/types.ts`

- [x] **Step 1: Write failing resolver tests**

Create fixtures covering required/optional handles, one/many cardinality, capability mismatch, explicit restriction, recursive resolution, and cycles. Assert errors include consumer node ID and handle ID:

```ts
await assert.rejects(
  () => resolver.resolveForNode(context, "chain"),
  /Node "chain" handle "model" requires capability "chat-model"/,
)

await assert.rejects(
  () => resolver.resolveForNode(cyclicContext, "retriever"),
  /Configuration dependency cycle: retriever -> vector -> retriever/,
)
```

- [x] **Step 2: Run the resolver test and verify it fails**

```powershell
cd server
node --test src/core/nodes/dependencies/config-dependency-resolver.test.ts
```

Expected: FAIL because resolver modules do not exist.

- [x] **Step 3: Define stable runtime contracts**

In `dependency-types.ts`, define:

```ts
export interface DependencyResolutionContext {
  workflow: WorkflowItem;
  consumerNodeId: string;
  execution: NodeHandlerInput;
  path: string[];
}

export interface CapabilityAdapter<T = unknown> {
  capability: string;
  supports(node: WorkflowNode): boolean;
  resolve(context: DependencyResolutionContext, nodeId: string): Promise<T>;
}

export interface ResolvedConfigDependencies {
  getOne<T>(handleId: string): T;
  getOptional<T>(handleId: string): T | undefined;
  getMany<T>(handleId: string): T[];
}
```

- [x] **Step 4: Implement adapter registration**

The registry must reject duplicate capability registrations and return a clear error when no adapter supports a connected node.

- [x] **Step 5: Implement recursive resolver behavior**

For every target configuration handle:

1. Find incoming edges with matching `targetHandle`.
2. Validate required state and cardinality.
3. Validate source definition capabilities and explicit restrictions.
4. Resolve each source using the adapter for the accepted capability.
5. Pass `path: [...path, sourceId]` into nested adapter resolution.
6. Return typed getters backed by an internal `Map<string, unknown[]>`.

Do not execute a configuration node as a normal workflow step in this resolver.

- [x] **Step 6: Expose resolver through node services**

Add to `NodeHandlerServices`:

```ts
resolveConfigDependencies: (nodeId: string) => Promise<ResolvedConfigDependencies>;
```

- [x] **Step 7: Run focused and regression tests**

```powershell
cd server
node --test src/core/nodes/dependencies/config-dependency-resolver.test.ts src/core/nodes/handler-contract.test.ts
npm run build
```

Expected: PASS.

- [x] **Step 8: Commit Task 3**

```powershell
git add server/src/core/nodes/dependencies server/src/core/nodes/types.ts
git commit -m "feat: add generic config dependency resolver"
```

### Task 4: Make executor and workflow validation catalog-driven [COMPLETE]

**Files:**
- Modify: `server/src/core/modules/workflows/executor.ts`
- Modify: `server/src/core/modules/workflows/workflow-validation.ts`
- Modify: `server/src/core/modules/workflows/workflow-validation.test.ts`
- Modify: `server/src/core/modules/workflows/agent-config-node-execution.test.ts`
- Modify: `server/src/core/modules/workflows/executor.test.ts`

- [x] **Step 1: Replace AI-specific tests with generic behavior tests**

Add tests proving:

- A source connected to a catalog configuration handle is not traversed as a normal step.
- The same node type can execute normally when reached through a normal data edge.
- Required handles fail validation before execution.
- One-cardinality handles reject two edges.
- Capability mismatches fail validation.
- Nested cycles fail before provider invocation.

- [x] **Step 2: Run tests and verify current hardcoded behavior fails them**

```powershell
cd server
node --test src/core/modules/workflows/agent-config-node-execution.test.ts src/core/modules/workflows/workflow-validation.test.ts
```

Expected: FAIL on generic classification and catalog-driven validation.

- [x] **Step 3: Replace concrete config-node classification**

Delete `isAgentConfigNode` and the Embeddings/Vector Store special case. Add:

```ts
function isConfigurationEdge(workflow: WorkflowItem, edge: WorkflowEdge): boolean {
  const targetType = workflow.nodes[edge.target]?.type;
  const handle = getUtilityNodeDefinition(targetType)?.handles.find(
    (candidate) => candidate.type === "target" && candidate.id === edge.targetHandle,
  );
  return Boolean(handle?.accepts?.length);
}
```

Traversal must ignore only configuration edges, not entire node types.

- [x] **Step 4: Construct resolver services per workflow execution**

Instantiate one adapter registry and resolver for the execution. Bind `resolveConfigDependencies(nodeId)` into `NodeHandlerServices` so all handlers share cycle tracking and catalog lookup behavior.

- [x] **Step 5: Add catalog-based workflow validation**

After structural edge validation, validate every catalog target handle:

```ts
const dependencyError = validateConfigurationDependencies(workflow, nodeId, definition)
if (dependencyError) return dependencyError
```

Return deterministic messages for missing required handles, excess connections, incompatible capabilities, unknown target handles, and cycles.

- [x] **Step 6: Run execution and validation regressions**

```powershell
cd server
node --test src/core/modules/workflows/agent-config-node-execution.test.ts src/core/modules/workflows/workflow-validation.test.ts src/core/modules/workflows/executor.test.ts
npm run build
```

Expected: PASS with no AI/Embeddings classification branch remaining.

- [x] **Step 7: Commit Task 4**

```powershell
git add server/src/core/modules/workflows
git commit -m "refactor: resolve workflow config edges from catalog"
```

### Round 2 checkpoint

Run the full server workflow test set. Confirm existing AI Agent and Vector Store workflows execute unchanged and that generic cycle/cardinality errors are readable. Stop after reporting results.

---

## Round 3: Shared AI Services And Node Shells

### Task 5: Add provider-neutral AI services and migrate existing consumers [COMPLETE]

**Files:**
- Create: `server/src/core/modules/ai-services/ai-service-types.ts`
- Create: `server/src/core/modules/ai-services/chat-model-execution-service.ts`
- Create: `server/src/core/modules/ai-services/embedding-execution-service.ts`
- Create: `server/src/core/modules/ai-services/vector-store-execution-service.ts`
- Create: `server/src/core/modules/ai-services/ai-services.test.ts`
- Create: `server/src/core/nodes/dependencies/core-capability-adapters.ts`
- Modify: `server/src/core/nodes/handlers/ai-agent.ts`
- Modify: `server/src/core/nodes/handlers/ai-agent.test.ts`
- Modify: `server/src/core/nodes/handlers/retrieval.ts`
- Modify: `server/src/core/nodes/handlers/retrieval-handlers.test.ts`

- [x] **Step 1: Write failing service and migration tests**

Assert standardized references and results:

```ts
const model: ChatModelRef = {
  providerId: "openai",
  methodId: "chat",
  configuration: { model: "gpt-test", temperature: 0 },
}

assert.deepEqual(await embeddings.embedMany(embeddingRef, ["a", "b"]), [[1], [2]])
assert.deepEqual(await vectorStore.query(storeRef, embeddingRef, request), {
  query: request.query,
  documents: [{ id: "1", content: "A", score: 0.9, metadata: {} }],
  context: "A",
  metadata: { providerId: "qdrant", topK: 5 },
})
```

AI Agent tests must assert it calls `getOne("chatModel")`, `getOptional("memory")`, and `getMany("tool")` rather than inspecting incoming edges.

- [x] **Step 2: Run tests and verify they fail**

```powershell
cd server
node --test src/core/modules/ai-services/ai-services.test.ts src/core/nodes/handlers/ai-agent.test.ts src/core/nodes/handlers/retrieval-handlers.test.ts
```

Expected: FAIL because services and adapters do not exist.

- [x] **Step 3: Define provider-neutral references**

Define `ChatModelRef`, `EmbeddingModelRef`, `VectorStoreRef`, `RetrievedDocument`, `RetrievalResult`, `RetrieverRef`, `OutputParserRef`, and `AgentToolRef` exactly as approved in the design. Include optional diagnostic metadata but no provider-specific fields outside `configuration`.

- [x] **Step 4: Implement execution services**

Each service receives `executePluginMethod` in its constructor. Normalize provider return shapes inside services, not consumers. Preserve the current OpenAI-compatible agent adapter path by allowing `ChatModelExecutionService` to delegate to the existing model provider registry where needed.

- [x] **Step 5: Register core capability adapters**

Adapters:

- `ai-model` -> `ChatModelRef`
- `ai-memory` -> current memory config
- `ai-tool` -> current plugin `AgentToolRef`
- `embeddings` -> `EmbeddingModelRef`
- `vector-store` -> `VectorStoreRef`, recursively requiring `embedding`
- dataset nodes -> executable document-source references

- [x] **Step 6: Migrate AI Agent and Vector Store handlers**

AI Agent consumes resolved dependencies. Vector Store consumes resolved Embedding Model and document sources. Remove `workflow.edges.find`, concrete source-type checks, `createEmbeddings`, and `executeConfigSource` from the handlers once equivalent service coverage passes.

- [x] **Step 7: Run focused and compatibility tests**

```powershell
cd server
node --test src/core/modules/ai-services/ai-services.test.ts src/core/nodes/handlers/ai-agent.test.ts src/core/nodes/handlers/retrieval-handlers.test.ts src/core/modules/workflows/agent-config-node-execution.test.ts
npm run build
```

Expected: PASS.

- [x] **Step 8: Commit Task 5**

```powershell
git add server/src/core/modules/ai-services server/src/core/nodes/dependencies/core-capability-adapters.ts server/src/core/nodes/handlers/ai-agent.ts server/src/core/nodes/handlers/ai-agent.test.ts server/src/core/nodes/handlers/retrieval.ts server/src/core/nodes/handlers/retrieval-handlers.test.ts
git commit -m "refactor: share AI dependency execution services"
```

### Task 6: Add typed shells, catalog entries, editors, and defaults for new nodes [COMPLETE]

**Files:**
- Modify: `server/src/shared/models/workflow-types.ts`
- Modify: `client-vue/src/core/types/workflow.types.ts`
- Modify: `server/src/core/utility-nodes/sailor-core/manifest.ts`
- Modify: `server/src/core/modules/workflows/workflow-validation.ts`
- Modify: `client-vue/src/features/workflow-editor/components/SailorWorkflowCanvas.vue`
- Create: `client-vue/src/features/workflow-editor/components/nodes/BasicLlmChainNode.vue`
- Create: `client-vue/src/features/workflow-editor/components/nodes/StructuredJsonParserNode.vue`
- Create: `client-vue/src/features/workflow-editor/components/nodes/VectorStoreRetrieverNode.vue`
- Create: `client-vue/src/features/workflow-editor/components/nodes/QuestionAnswerChainNode.vue`
- Create: `client-vue/src/features/workflow-editor/components/nodes/VectorStoreToolNode.vue`
- Create: `client-vue/src/features/workflow-editor/components/settings/editors/BasicLlmChainEditor.vue`
- Create: `client-vue/src/features/workflow-editor/components/settings/editors/StructuredJsonParserEditor.vue`
- Create: `client-vue/src/features/workflow-editor/components/settings/editors/VectorStoreRetrieverEditor.vue`
- Create: `client-vue/src/features/workflow-editor/components/settings/editors/QuestionAnswerChainEditor.vue`
- Create: `client-vue/src/features/workflow-editor/components/settings/editors/VectorStoreToolEditor.vue`
- Modify: `client-vue/src/features/workflow-editor/components/settings/editors/index.ts`
- Create: `client-vue/src/features/workflow-editor/components/nodes/__tests__/advancedAiNodes.contract.test.ts`

- [x] **Step 1: Write failing shared-type and frontend contract tests**

Test all five discriminants, canvas slots/defaults, editor registration, `BaseAdvancedNode` usage, and catalog handles. Required handle contracts:

```ts
basic-llm-chain: model(chat-model, one), outputParser(output-parser, optional one, replace, persistent Quick Add)
structured-json-parser: source provides output-parser
vector-store-retriever: vectorStore(vector-store, one)
question-answer-chain: model(chat-model, one), retriever(retriever, one)
vector-store-tool: vectorStore(vector-store, one), model(chat-model, one), source provides agent-tool
```

- [x] **Step 2: Run tests and verify they fail**

```powershell
cd client-vue
node --test src/features/workflow-editor/components/nodes/__tests__/advancedAiNodes.contract.test.ts
cd ../server
node --test src/shared/models/workflow-agent-types.test.ts src/shared/models/workflow-retrieval-types.test.ts
```

Expected: FAIL because new types and components are absent.

- [x] **Step 3: Add shared node interfaces**

Use these minimal persisted fields:

```ts
interface BasicLlmChainNode { type: "basic-llm-chain"; prompt: string; input: string }
interface StructuredJsonParserNode { type: "structured-json-parser"; schema: Record<string, unknown>; strict: boolean; failurePolicy: "error" }
interface VectorStoreRetrieverNode { type: "vector-store-retriever"; topK: number; scoreThreshold?: number; filter?: Record<string, unknown>; maxContextChars: number }
interface QuestionAnswerChainNode { type: "question-answer-chain"; question: string; instructions?: string }
interface VectorStoreToolNode { type: "vector-store-tool"; toolName: string; description: string; topK: number; scoreThreshold?: number; instructions?: string }
```

Mirror them exactly on server and client.

- [x] **Step 4: Add catalog entries and validation**

Declare each role, capability, handles, and advanced presentation in `manifest.ts`. Add field validation to `workflow-validation.ts`; dependency validation remains generic and must not add node-specific edge checks.

- [x] **Step 5: Build node components and editors**

All five primary components use `BaseAdvancedNode` except the compact parser, which still uses `BaseAdvancedNode` with `rounded="full"`, fixed 100px dimensions, and a top diamond source handle. Components obtain handlers from the catalog adapter.

Editors expose only persisted fields. Use the existing base inputs, code editor for JSON schema, and numeric controls.

- [x] **Step 6: Register canvas defaults**

Defaults must pass backend validation immediately. In particular, parser schema defaults to `{ "type": "object" }`, retriever/Vector Store Tool `topK` defaults to `5`, and chain input/question fields default to template expressions using the trigger payload.

- [x] **Step 7: Run frontend and server checks**

```powershell
cd client-vue
node --test src/features/workflow-editor/components/nodes/__tests__/advancedAiNodes.contract.test.ts src/features/workflow-editor/components/settings/__tests__/agentAddNode.contract.test.ts
npm run type-check
cd ../server
node --test src/core/utility-nodes/utility-node-pack.test.ts src/core/modules/workflows/workflow-validation.test.ts
npm run build
```

Expected: PASS.

- [x] **Step 8: Commit Task 6**

```powershell
git add server/src/shared/models/workflow-types.ts server/src/core/utility-nodes/sailor-core/manifest.ts server/src/core/modules/workflows/workflow-validation.ts client-vue/src/core/types/workflow.types.ts client-vue/src/features/workflow-editor
git commit -m "feat: add reusable advanced AI node shells"
```

### Round 3 checkpoint

Open the editor and verify all five nodes render, only valid Quick Add candidates appear, parser Quick Add remains after connection, and provider-backed children retain logos. Stop after reporting results.

---

## Round 4: Chains And Retrieval

### Task 7: Implement Structured JSON Parser and Basic LLM Chain [COMPLETE]

**Files:**
- Create: `server/src/core/nodes/handlers/output-parser.ts`
- Create: `server/src/core/nodes/handlers/output-parser.test.ts`
- Create: `server/src/core/nodes/handlers/basic-llm-chain.ts`
- Create: `server/src/core/nodes/handlers/basic-llm-chain.test.ts`
- Create: `server/src/core/modules/ai-services/output-parser-execution-service.ts`
- Modify: `server/src/core/nodes/dependencies/core-capability-adapters.ts`
- Modify: `server/src/core/utility-nodes/sailor-core/index.ts`

- [x] **Step 1: Write failing parser tests**

Test fenced JSON extraction, valid schema, invalid schema, malformed JSON, and exact AJV error paths. The adapter must return:

```ts
const parser: OutputParserRef = {
  parse: async (value) => parsedAndValidatedValue,
}
```

- [x] **Step 2: Write failing chain tests**

Cover model-only text output and parsed output:

```ts
assert.deepEqual(result, {
  output: { category: "billing" },
  rawOutput: "{\"category\":\"billing\"}",
  metadata: { parsed: true },
})
```

Assert the chain requests `model` with `getOne` and parser with `getOptional`.

- [x] **Step 3: Run tests and verify they fail**

```powershell
cd server
node --test src/core/nodes/handlers/output-parser.test.ts src/core/nodes/handlers/basic-llm-chain.test.ts
```

Expected: FAIL because handlers and parser service do not exist.

- [x] **Step 4: Implement Structured JSON parsing**

Use AJV already installed in the server. Strip one optional Markdown JSON fence, parse JSON, validate against the persisted schema, and throw:

```text
Structured JSON Parser validation failed at /field: must be string
```

Do not add fallback repair behavior in this release.

- [x] **Step 5: Implement Basic LLM Chain**

Evaluate `prompt` and `input` with `TemplateEngine`, invoke `ChatModelExecutionService`, then optionally parse. Return raw text when no parser is connected; return `{ output, rawOutput, metadata }` when parsed.

- [x] **Step 6: Register handlers and parser adapter**

Register both handlers in Sailor Core. The parser capability adapter resolves the parser node into `OutputParserRef`; Basic LLM Chain remains a normal flow node.

- [x] **Step 7: Run focused and build checks**

```powershell
cd server
node --test src/core/nodes/handlers/output-parser.test.ts src/core/nodes/handlers/basic-llm-chain.test.ts src/core/utility-nodes/utility-node-pack.test.ts
npm run build
```

Expected: PASS.

- [x] **Step 8: Commit Task 7**

```powershell
git add server/src/core/nodes/handlers/output-parser.ts server/src/core/nodes/handlers/output-parser.test.ts server/src/core/nodes/handlers/basic-llm-chain.ts server/src/core/nodes/handlers/basic-llm-chain.test.ts server/src/core/modules/ai-services/output-parser-execution-service.ts server/src/core/nodes/dependencies/core-capability-adapters.ts server/src/core/utility-nodes/sailor-core/index.ts
git commit -m "feat: add structured parser and basic LLM chain"
```

### Task 8: Implement Vector Store Retriever and Question and Answer Chain

**Files:**
- Create: `server/src/core/nodes/handlers/vector-store-retriever.ts`
- Create: `server/src/core/nodes/handlers/vector-store-retriever.test.ts`
- Create: `server/src/core/nodes/handlers/question-answer-chain.ts`
- Create: `server/src/core/nodes/handlers/question-answer-chain.test.ts`
- Create: `server/src/core/modules/ai-services/retriever-execution-service.ts`
- Modify: `server/src/core/nodes/dependencies/core-capability-adapters.ts`
- Modify: `server/src/core/utility-nodes/sailor-core/index.ts`

- [ ] **Step 1: Write failing retriever tests**

Assert `VectorStoreRetrieverNode` resolves one Vector Store, delegates query embedding/search, applies score threshold, limits context size, and returns normalized `RetrievalResult`.

- [ ] **Step 2: Write failing Q&A tests**

Assert the chain:

1. Evaluates the question template.
2. Calls `retriever.retrieve(question)`.
3. Sends grounded context and instructions to the model.
4. Returns answer, sources, and retrieval/model metadata.

```ts
assert.deepEqual(result.sources, retrieval.documents)
assert.equal(result.metadata.retrieval.documentCount, 2)
```

- [ ] **Step 3: Run tests and verify they fail**

```powershell
cd server
node --test src/core/nodes/handlers/vector-store-retriever.test.ts src/core/nodes/handlers/question-answer-chain.test.ts
```

Expected: FAIL because handlers and retriever service do not exist.

- [ ] **Step 4: Implement retriever service and adapter**

The `retriever` capability adapter resolves `vector-store-retriever`, recursively obtains its `vectorStore`, and returns:

```ts
{
  retrieve: (query) => retrieverService.retrieve(vectorStore, {
    query,
    topK: node.topK,
    scoreThreshold: node.scoreThreshold,
    filter: node.filter,
    maxContextChars: node.maxContextChars,
  }),
}
```

- [ ] **Step 5: Implement Question and Answer Chain**

Use resolved `model` and `retriever`; do not inspect edges. The system prompt must instruct the model to answer only from supplied context and acknowledge missing evidence. Preserve all normalized source documents in the result.

- [ ] **Step 6: Register handlers and run checks**

```powershell
cd server
node --test src/core/nodes/handlers/vector-store-retriever.test.ts src/core/nodes/handlers/question-answer-chain.test.ts src/core/nodes/dependencies/config-dependency-resolver.test.ts
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit Task 8**

```powershell
git add server/src/core/nodes/handlers/vector-store-retriever.ts server/src/core/nodes/handlers/vector-store-retriever.test.ts server/src/core/nodes/handlers/question-answer-chain.ts server/src/core/nodes/handlers/question-answer-chain.test.ts server/src/core/modules/ai-services/retriever-execution-service.ts server/src/core/nodes/dependencies/core-capability-adapters.ts server/src/core/utility-nodes/sailor-core/index.ts
git commit -m "feat: add vector retriever and question answer chain"
```

### Round 4 checkpoint

Execute one Basic LLM Chain workflow and one nested Q&A workflow using mocked provider methods. Confirm parsed output, sources, metadata, and recursive dependency resolution. Stop after reporting results.

---

## Round 5: Vector Store Tool And End-To-End Verification

### Task 9: Implement Vector Store Tool as a reusable Agent Tool capability

**Files:**
- Create: `server/src/core/nodes/handlers/vector-store-tool.ts`
- Create: `server/src/core/nodes/handlers/vector-store-tool.test.ts`
- Modify: `server/src/core/nodes/dependencies/core-capability-adapters.ts`
- Modify: `server/src/core/nodes/handlers/ai-agent.test.ts`
- Modify: `server/src/core/modules/agent-runtime/agent-tool-catalog.ts`
- Modify: `server/src/core/modules/agent-runtime/agent-tool-catalog.test.ts`
- Modify: `server/src/core/utility-nodes/sailor-core/index.ts`

- [ ] **Step 1: Write failing tool capability tests**

Assert `vector-store-tool` resolves one Vector Store and one Chat Model and produces an `AgentToolRef` with the configured name/description.

- [ ] **Step 2: Write failing invocation tests**

Invoke the tool with `{ query: "refund policy" }`. Assert retrieval runs first, the connected Chat Model receives grounded context, and the result is:

```ts
{
  answer: "...",
  sources: [{ id: "policy", content: "...", score: 0.94, metadata: {} }],
  metadata: { query: "refund policy", documentCount: 1 },
}
```

- [ ] **Step 3: Run tests and verify they fail**

```powershell
cd server
node --test src/core/nodes/handlers/vector-store-tool.test.ts src/core/modules/agent-runtime/agent-tool-catalog.test.ts src/core/nodes/handlers/ai-agent.test.ts
```

Expected: FAIL because the tool adapter does not exist.

- [ ] **Step 4: Implement Vector Store Tool adapter**

Resolve dependencies recursively. `invoke` must validate a non-empty query, call the vector store retrieval service using node limits, invoke the connected model with grounded instructions, and return answer/sources/metadata. Keep it read-only and provider-neutral.

- [ ] **Step 5: Generalize Agent tool catalog input**

Allow the Agent runtime to receive `AgentToolRef[]` from resolved dependencies alongside existing plugin tools. Adapt them into the existing runtime tool interface without checking for `vector-store-tool` by type.

- [ ] **Step 6: Register handler and capability adapter**

The node's handler may return its static configuration for inspection, while the `agent-tool` capability adapter creates the callable reference consumed by AI Agent.

- [ ] **Step 7: Run focused Agent integration tests**

```powershell
cd server
node --test src/core/nodes/handlers/vector-store-tool.test.ts src/core/modules/agent-runtime/agent-tool-catalog.test.ts src/core/nodes/handlers/ai-agent.test.ts src/core/modules/workflows/agent-config-node-execution.test.ts
npm run build
```

Expected: PASS.

- [ ] **Step 8: Commit Task 9**

```powershell
git add server/src/core/nodes/handlers/vector-store-tool.ts server/src/core/nodes/handlers/vector-store-tool.test.ts server/src/core/nodes/dependencies/core-capability-adapters.ts server/src/core/nodes/handlers/ai-agent.test.ts server/src/core/modules/agent-runtime/agent-tool-catalog.ts server/src/core/modules/agent-runtime/agent-tool-catalog.test.ts server/src/core/utility-nodes/sailor-core/index.ts
git commit -m "feat: add vector store agent tool"
```

### Task 10: Complete regression, visual, and extensibility verification

**Files:**
- Create: `server/src/core/modules/workflows/advanced-ai-workflows.integration.test.ts`
- Create: `client-vue/src/features/workflow-editor/components/nodes/__tests__/advancedAiUx.contract.test.ts`
- Modify: `client-vue/src/features/workflow-editor/components/BaseEdge.vue`
- Modify: `client-vue/src/features/workflow-editor/layout/advancedNodeLayout.ts`
- Modify: `client-vue/src/features/workflow-editor/layout/__tests__/advancedNodeLayout.test.ts`
- Modify: `feats-map/generic-advanced-node-dependencies-implementation-plan-2026-06-12.md`

- [ ] **Step 1: Write full workflow integration tests**

Cover these graphs:

```text
Trigger -> Basic LLM Chain -> Set
                | model
                | outputParser

Trigger -> Question and Answer Chain -> Set
                | model
                | retriever -> vectorStore -> embeddingModel

Trigger -> AI Agent -> Set
             | tool: Vector Store Tool
                     | vectorStore -> embeddingModel
                     | model
```

Assert configuration nodes never appear in `context.steps`, normal flow nodes do, and outputs preserve answer/sources/metadata.

- [ ] **Step 2: Add extensibility contract test**

Register a fixture node with a new type that provides `chat-model` and verify it automatically appears for every compatible handle and resolves through a fixture adapter without modifying AI Agent, Basic LLM Chain, Q&A Chain, or Vector Store Tool.

- [ ] **Step 3: Add visual/behavior contract coverage**

Assert:

- Advanced target handles remain on the declared bottom edge without connections.
- Configuration child source handles use top diamonds.
- Configuration edges are dashed based on catalog handle semantics, not a hardcoded handle ID set.
- Auto-organize handles nested dependencies.
- Persistent Quick Add remains visible for parser/tool/document handles.
- No configuration nodes appear in the global Add Node panel.

- [ ] **Step 4: Replace hardcoded edge classification in the frontend**

In `BaseEdge.vue`, determine dashed configuration styling from the target node definition and `targetHandle`. Remove `CONFIGURATION_TARGET_HANDLES` after the catalog lookup passes tests.

- [ ] **Step 5: Run complete automated verification**

```powershell
cd server
$serverTests = Get-ChildItem -Path src -Recurse -Filter *.test.ts | ForEach-Object FullName
node --test $serverTests
npm run build
cd ../client-vue
$clientTests = Get-ChildItem -Path src -Recurse -Filter *.test.ts | ForEach-Object FullName
node --test $clientTests
npm run type-check
npm run build-only
```

Expected: all commands PASS.

- [ ] **Step 6: Run browser verification**

Start only the required local app processes, open the workflow editor with the Browser plugin, and verify desktop plus narrow viewport behavior for all three graphs. Inspect the browser console for errors and capture screenshots showing:

- Provider icons on Chat Model and Embedding Model.
- Correct handle placement and diamond style.
- Dashed nested configuration edges.
- Quick Add candidate filtering and persistence.
- Auto-organized nested subnodes without overlap.

- [ ] **Step 7: Mark plan tasks complete**

Change each completed checkbox in this file to `[x]` only after its verification command succeeds. Record any intentionally deferred acceptance criterion explicitly; do not mark the task complete while required work remains.

- [ ] **Step 8: Commit Task 10**

```powershell
git add server/src/core/modules/workflows/advanced-ai-workflows.integration.test.ts client-vue/src/features/workflow-editor client-vue/src/core/types feats-map/generic-advanced-node-dependencies-implementation-plan-2026-06-12.md
git commit -m "test: verify generic advanced node workflows"
```

### Round 5 checkpoint

Report automated test totals, build status, browser scenarios, screenshots, remaining risks, and the final commit list. Do not claim completion if any required verification is skipped or failing.

---

## Completion Criteria

- [ ] Catalog definitions are the source of truth for roles, capabilities, handles, and presentation.
- [ ] Frontend picker filtering and backend dependency validation use the same serialized contracts.
- [ ] Embedding Model displays the selected provider icon and style.
- [ ] Configuration dependencies resolve recursively with cardinality validation and cycle detection.
- [ ] AI Agent and Vector Store no longer search edges or branch on concrete dependency node types.
- [ ] Structured JSON Parser and Basic LLM Chain execute through shared model/parser services.
- [ ] Vector Store Retriever and Question and Answer Chain return normalized sources and metadata.
- [ ] Vector Store Tool is consumed by AI Agent through the generic `agent-tool` capability.
- [ ] A fixture future provider/node integrates without changing existing consumers.
- [ ] Server tests, frontend tests, type checks, builds, and browser verification pass.
