# Remove Default Document Loader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the `Default Data Loader` node and make `Extract From File`, `Text Dataset`, and `Database Dataset` index directly into Vector Store.

**Architecture:** Delete the `document-loader` node from backend and frontend contracts. Move JSON path/root-context document loading into `file-dataset`, while keeping text and database document production local to their own dataset handlers. Vector Store continues to depend on `DocumentSourceRef`, now resolved from the three dataset nodes directly.

**Tech Stack:** TypeScript, Node test runner, Vue 3, Vite, vue-tsc.

---

## File Map

- `server/src/shared/models/workflow-types.ts`: remove `DocumentLoaderNode`; add JSON loading fields to `FileDatasetNode`.
- `client-vue/src/core/types/workflow.types.ts`: mirror shared type changes.
- `server/src/core/utility-nodes/fabric-core/manifest.ts`: remove document-loader manifest; add document capability to file-dataset.
- `server/src/core/utility-nodes/fabric-core/index.ts`: unregister document-loader handler.
- `server/src/core/nodes/handlers/retrieval.ts`: remove document-loader handler; move JSON document loading into file-dataset.
- `server/src/core/nodes/dependencies/core-capability-adapters.ts`: resolve file/text/database datasets as document sources.
- `server/src/core/modules/workflows/workflow-validation.ts`: remove document-loader validation; allow file-dataset on Vector Store Document.
- `server/src/core/modules/workflows/repository.ts`: remove migration that inserts document-loader.
- `server/src/core/nodes/handlers/retrieval-handlers.test.ts`: replace document-loader tests with direct dataset tests.
- `server/src/core/modules/workflows/repository.test.ts`: remove document-loader migration tests.
- `server/src/core/modules/workflows/workflow-validation.test.ts`: update document handle expectations.
- `client-vue/src/features/workflow-editor/components/FabricWorkflowCanvas.vue`: remove document-loader import/slot/defaults; update quick-add lists.
- `client-vue/src/features/workflow-editor/layout/advancedNodeDefinitions.ts`: remove document-loader handlers; update Vector Store allowed document nodes.
- `client-vue/src/core/constants/node-types.ts`: remove document-loader constants.
- `client-vue/src/features/workflow-editor/components/nodes/DocumentLoaderNode.vue`: delete.
- `client-vue/src/features/workflow-editor/components/settings/editors/DocumentLoaderEditor.vue`: delete.
- `client-vue/src/features/workflow-editor/components/settings/editors/documentLoaderTemplateSuggestions.ts`: delete.
- `client-vue/src/features/workflow-editor/components/settings/editors/index.ts`: remove editor registration.
- `client-vue/src/features/workflow-editor/components/settings/editors/FileDatasetEditor.vue`: add JSON mode/path/root-context controls.
- `client-vue/src/features/workflow-editor/components/settings/editors/FileDatasetFilesInput.vue`: keep as upload source for JSON detection.
- `client-vue/src/features/workflow-editor/components/settings/addNodePickerModel.ts`: remove document-loader preset.
- Frontend tests under `client-vue/src/features/workflow-editor/**/__tests__`: update expectations.
- `docs/vector-store-rag-e2e-test-guide-2026-06-14.md`: update Test 3 and negative tests.
- `feats-map/remove-default-document-loader-20260617.md`: update task status after each implementation task.

---

## Task 1: Backend Contract Removal

**Files:**
- Modify: `server/src/shared/models/workflow-types.ts`
- Modify: `server/src/core/utility-nodes/fabric-core/manifest.ts`
- Modify: `server/src/core/utility-nodes/fabric-core/index.ts`
- Test: `server/src/shared/models/workflow-retrieval-types.test.ts`
- Test: `server/src/core/utility-nodes/utility-node-pack.test.ts`

- [ ] **Step 1: Write failing tests**

Update tests to assert:

```ts
assert.equal(VALID_NODE_TYPES.has("document-loader"), false);
assert.doesNotMatch(source, /DocumentLoaderNode/);
assert.doesNotMatch(source, /"document-loader"/);
assert.match(source, /type: "file-dataset"/);
assert.match(source, /capabilities: \["file-data-source", "document-source"\]/);
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
cd C:\Workspace\Projects\fabric\server
node --loader ts-node/esm --test src/shared/models/workflow-retrieval-types.test.ts src/core/utility-nodes/utility-node-pack.test.ts
```

Expected: failures mentioning `document-loader` still exists.

- [ ] **Step 3: Update shared types**

In `server/src/shared/models/workflow-types.ts`:

- remove `"document-loader"` from `WorkflowNodeType`
- delete `DocumentLoaderNode`
- remove `| DocumentLoaderNode` from `WorkflowNode`
- add fields to `FileDatasetNode`:

```ts
jsonMode?: "all" | "specific";
jsonPath?: string;
includeRootFieldsAsContext?: boolean;
```

- [ ] **Step 4: Update manifest and registry**

In `server/src/core/utility-nodes/fabric-core/manifest.ts`:

- remove the `"document-loader"` entry
- change file-dataset capabilities:

```ts
capabilities: ["file-data-source", "document-source"],
```

- change Vector Store document handle allowed nodes to include file dataset:

```ts
allowedNodes: ["node:file-dataset", "node:text-dataset", "node:database-dataset"]
```

In `server/src/core/utility-nodes/fabric-core/index.ts`:

- remove `documentLoaderNodeHandler` import
- remove it from registration list

- [ ] **Step 5: Run tests and typecheck**

Run:

```powershell
node --loader ts-node/esm --test src/shared/models/workflow-retrieval-types.test.ts src/core/utility-nodes/utility-node-pack.test.ts
npx tsc --noEmit
```

Expected: tests pass or only downstream handler errors remain.

- [ ] **Step 6: Update task file and commit**

```powershell
git add server/src/shared/models/workflow-types.ts server/src/core/utility-nodes/fabric-core/manifest.ts server/src/core/utility-nodes/fabric-core/index.ts server/src/shared/models/workflow-retrieval-types.test.ts server/src/core/utility-nodes/utility-node-pack.test.ts feats-map/remove-default-document-loader-20260617.md
git commit -m "refactor: remove document loader backend contract"
```

---

## Task 2: File Dataset Owns JSON Document Loading

**Files:**
- Modify: `server/src/core/nodes/handlers/retrieval.ts`
- Test: `server/src/core/nodes/handlers/retrieval-handlers.test.ts`

- [ ] **Step 1: Write failing tests**

Replace document-loader JSON tests with file-dataset direct tests:

```ts
it("file dataset loads a specific JSON array path into documents", async () => {
  const json = JSON.stringify({
    dataset: "catalogo_cursos_online",
    version: "1.0",
    courses: [
      { course_id: "CRS-1001", title: "APIs REST", duration_hours: 12, published: true },
      { course_id: "CRS-1002", title: "Machine Learning", duration_hours: 26, published: true },
    ],
  });

  const result = await createUtilityNodeRegistry().get("file-dataset").execute({
    nodeId: "files",
    executionId: "exec-1",
    workflow: workflowFixture(),
    edges: [],
    context: { trigger: {}, steps: {}, variables: {} },
    services: {} as any,
    node: {
      type: "file-dataset",
      name: "Extract From File",
      files: [{ filename: "cursos.json", content: Buffer.from(json).toString("base64"), mimeType: "application/json" }],
      format: "json",
      jsonMode: "specific",
      jsonPath: "courses",
      includeRootFieldsAsContext: true,
      chunking: { enabled: false, chunkSize: 1000, chunkOverlap: 0, contextualOverlapEnabled: false },
    },
  });

  assert.equal(result.count, 2);
  assert.equal(result.items[0].id, "files:0:0");
  assert.match(result.items[0].text, /course_id: CRS-1001/);
  assert.deepEqual(result.items[0].metadata.source, { filename: "cursos.json", mimeType: "application/json", jsonPath: "courses[0]" });
  assert.deepEqual(result.items[0].metadata.context, { dataset: "catalogo_cursos_online", version: "1.0" });
});
```

Also add:

```ts
it("file dataset rejects missing JSON path in specific mode", async () => {
  await assert.rejects(() => createUtilityNodeRegistry().get("file-dataset").execute({
    nodeId: "files",
    executionId: "exec-1",
    workflow: workflowFixture(),
    edges: [],
    context: { trigger: {}, steps: {}, variables: {} },
    services: {} as any,
    node: {
      type: "file-dataset",
      name: "Extract From File",
      files: [{ filename: "catalog.json", content: Buffer.from(JSON.stringify({ courses: [] })).toString("base64") }],
      format: "json",
      jsonMode: "specific",
      jsonPath: "lessons",
      chunking: { enabled: false, chunkSize: 1000, chunkOverlap: 0, contextualOverlapEnabled: false },
    },
  }), /JSON path "lessons" was not found/);
});
```

- [ ] **Step 2: Run test to verify failure**

```powershell
node --loader ts-node/esm --test src/core/nodes/handlers/retrieval-handlers.test.ts
```

Expected: new file-dataset JSON path assertions fail.

- [ ] **Step 3: Move JSON loading helpers into file dataset**

In `retrieval.ts`:

- delete `documentLoaderNodeHandler`
- delete `loadDatasetItemDocuments`
- delete `loadExtractedFileDocuments`
- delete `loadJsonDocuments`
- delete `toDocumentItem`
- delete `applyDocumentChunking`
- delete `resolveDocumentLoaderChunking`
- keep reusable helpers: `getRequiredJsonPath`, `getByPath`, `templateDocumentText`, `formatDocumentValue`
- update `jsonToItems` behavior for uploaded JSON:

```ts
function jsonFileToItems(
  value: string,
  idPrefix: string,
  sourceMetadata: Record<string, any>,
  node: FileDatasetNode,
): DatasetOutput["items"] {
  const root = JSON.parse(value);
  const selected = node.jsonMode === "specific"
    ? getRequiredJsonPath(root, node.jsonPath)
    : root;
  const values = Array.isArray(selected) ? selected : [selected];
  const rootContext = node.includeRootFieldsAsContext && root && typeof root === "object" && !Array.isArray(root)
    ? Object.fromEntries(Object.entries(root as Record<string, any>).filter(([, child]) => !Array.isArray(child) && (typeof child !== "object" || child === null)))
    : undefined;

  return values.map((value, index) => {
    const data = value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, any>
      : { value };
    const path = node.jsonMode === "specific" && node.jsonPath
      ? `${node.jsonPath}${Array.isArray(selected) ? `[${index}]` : ""}`
      : undefined;
    return {
      id: `${idPrefix}:${index}`,
      text: templateDocumentText(undefined, data),
      metadata: {
        source: { ...sourceMetadata, ...(path ? { jsonPath: path } : {}) },
        ...(Object.keys(data).length > 0 ? { data } : {}),
        ...(rootContext && Object.keys(rootContext).length > 0 ? { context: rootContext } : {}),
      },
      raw: value,
    };
  });
}
```

- call `applyDatasetChunking(items, node)` before returning file dataset output.

- [ ] **Step 4: Run tests**

```powershell
node --loader ts-node/esm --test src/core/nodes/handlers/retrieval-handlers.test.ts
npx tsc --noEmit
```

Expected: retrieval tests pass.

- [ ] **Step 5: Update task file and commit**

```powershell
git add server/src/core/nodes/handlers/retrieval.ts server/src/core/nodes/handlers/retrieval-handlers.test.ts feats-map/remove-default-document-loader-20260617.md
git commit -m "refactor: move document loading into file dataset"
```

---

## Task 3: Vector Store Accepts Three Dataset Sources Directly

**Files:**
- Modify: `server/src/core/nodes/dependencies/core-capability-adapters.ts`
- Modify: `server/src/core/modules/workflows/workflow-validation.ts`
- Test: `server/src/core/nodes/handlers/retrieval-handlers.test.ts`
- Test: `server/src/core/modules/workflows/workflow-validation.test.ts`

- [ ] **Step 1: Write failing tests**

Update Vector Store direct file dataset test:

```ts
it("vector store indexes markdown chunks from Extract From File directly", async () => {
  const calls: Array<{ pluginId: string; methodId: string; params: Record<string, any> }> = [];
  const workflow = workflowFixture();
  workflow.nodes = {
    file: {
      type: "file-dataset",
      name: "Extract From File",
      files: [{ filename: "guide.md", content: Buffer.from("abcdefghi").toString("base64"), mimeType: "text/markdown" }],
      format: "markdown",
      chunking: { enabled: true, chunkSize: 4, chunkOverlap: 1, contextualOverlapEnabled: false },
    },
    embeddings: {
      type: "embeddings",
      name: "Embeddings",
      pluginId: "embedding-provider",
      methodId: "createEmbeddings",
      model: "embedding-model",
      dimension: 3,
      input: "",
    },
    vector: {
      type: "vector-store",
      name: "Vector",
      pluginId: "vector-provider",
      ensureCollectionMethodId: "ensureCollection",
      upsertMethodId: "upsertDocuments",
      queryMethodId: "querySimilar",
      collectionName: "documents",
      dimension: 3,
      metric: "cosine",
      config: {},
      retrievalMode: "index",
    },
  };
  workflow.edges = [
    { id: "file-vector", source: "file", target: "vector", targetHandle: "document" },
    { id: "embedding-vector", source: "embeddings", target: "vector", targetHandle: "embedding" },
  ];

  const result = await createUtilityNodeRegistry().get("vector-store").execute({
    nodeId: "vector",
    executionId: "exec-1",
    workflow,
    edges: workflow.edges,
    context: { trigger: {}, variables: {}, steps: {} },
    services: {
      executeNode: async (nested: any) => createUtilityNodeRegistry().get(nested.node.type).execute({ ...nested, services: {} as any }),
      executePluginMethod: async (pluginId: string, methodId: string, params: Record<string, any>) => {
        calls.push({ pluginId, methodId, params });
        if (pluginId === "embedding-provider") return { vectors: params.texts.map(() => [0.1, 0.2, 0.3]) };
        if (methodId === "upsertDocuments") return { upsertedCount: params.documents.length };
        return { ok: true };
      },
    } as any,
    node: workflow.nodes.vector,
  });

  assert.equal(result.indexedCount, 3);
  assert.deepEqual(calls.find((call) => call.methodId === "upsertDocuments")?.params.documents.map((doc: any) => doc.id), [
    "file:0:0",
    "file:0:1",
    "file:0:2",
  ]);
});
```

Update validation test to accept `file-dataset` on `document`.

- [ ] **Step 2: Run tests to verify failure**

```powershell
node --loader ts-node/esm --test src/core/nodes/handlers/retrieval-handlers.test.ts src/core/modules/workflows/workflow-validation.test.ts
```

Expected: direct file dataset document capability fails before adapter/validation update.

- [ ] **Step 3: Update capability adapters**

In `core-capability-adapters.ts`:

```ts
for (const type of ["file-dataset", "text-dataset", "database-dataset"] as const) {
  registry.register({
    capability: "document-source",
    supports: (node) => node.type === type,
    resolve: async (context, nodeId) => createLazyNodeSource(context, nodeId) satisfies DocumentSourceRef,
  });
}
for (const type of ["file-dataset", "text-dataset", "database-dataset"] as const) {
  registry.register({
    capability: "file-data-source",
    supports: (node) => node.type === type,
    resolve: async (context, nodeId) => createLazyNodeSource(context, nodeId) satisfies FileDataSourceRef,
  });
}
```

- [ ] **Step 4: Update validation**

In `workflow-validation.ts`:

- remove `document-loader` from valid node list
- delete document-loader case
- ensure file-dataset has both `file-data-source` and `document-source` capability when validating handles.

- [ ] **Step 5: Run tests and typecheck**

```powershell
node --loader ts-node/esm --test src/core/nodes/handlers/retrieval-handlers.test.ts src/core/modules/workflows/workflow-validation.test.ts
npx tsc --noEmit
```

Expected: pass.

- [ ] **Step 6: Update task file and commit**

```powershell
git add server/src/core/nodes/dependencies/core-capability-adapters.ts server/src/core/modules/workflows/workflow-validation.ts server/src/core/nodes/handlers/retrieval-handlers.test.ts server/src/core/modules/workflows/workflow-validation.test.ts feats-map/remove-default-document-loader-20260617.md
git commit -m "refactor: index datasets directly in vector stores"
```

---

## Task 4: Remove Backend Loader Migration

**Files:**
- Modify: `server/src/core/modules/workflows/repository.ts`
- Modify: `server/src/core/modules/workflows/repository.test.ts`

- [ ] **Step 1: Write failing tests**

Replace loader migration tests with a direct preservation test:

```ts
it("preserves direct File Dataset document edges when saving workflows", () => {
  const workflow = workflowWithFileDatasetDocumentEdge();
  const migrated = normalizeWorkflowForStorage(workflow as any);
  assert.equal(migrated.edges.some((edge: any) => edge.source === "files" && edge.targetHandle === "document"), true);
  assert.equal(Object.values(migrated.nodes).some((node: any) => node.type === "document-loader"), false);
});
```

- [ ] **Step 2: Run test to verify failure**

```powershell
node --loader ts-node/esm --test src/core/modules/workflows/repository.test.ts
```

Expected: old migration inserts a document-loader.

- [ ] **Step 3: Delete migration**

In `repository.ts`:

- remove `migrateLegacyVectorDocumentSources(workflow);`
- delete `DOCUMENT_LOADER_MIGRATION_VERSION`
- delete `DOCUMENT_LOADER_MIGRATION_NOTE`
- delete `migrateLegacyVectorDocumentSources`
- delete `shouldMigrateVectorDocumentEdge`
- delete `isLegacyFileDatasetDocumentSource`
- delete `isVectorStoreDocumentTarget`
- delete `createMigratedDocumentLoader`
- delete `copyChunking` if unused
- delete `inferDocumentLoaderPosition`

- [ ] **Step 4: Run tests**

```powershell
node --loader ts-node/esm --test src/core/modules/workflows/repository.test.ts
npx tsc --noEmit
```

Expected: pass.

- [ ] **Step 5: Update task file and commit**

```powershell
git add server/src/core/modules/workflows/repository.ts server/src/core/modules/workflows/repository.test.ts feats-map/remove-default-document-loader-20260617.md
git commit -m "refactor: remove document loader workflow migration"
```

---

## Task 5: Remove Frontend Loader Node and Picker

**Files:**
- Delete: `client-vue/src/features/workflow-editor/components/nodes/DocumentLoaderNode.vue`
- Delete: `client-vue/src/features/workflow-editor/components/settings/editors/DocumentLoaderEditor.vue`
- Delete: `client-vue/src/features/workflow-editor/components/settings/editors/documentLoaderTemplateSuggestions.ts`
- Delete: `client-vue/src/features/workflow-editor/components/settings/editors/__tests__/documentLoaderTemplateSuggestions.test.ts`
- Modify: `client-vue/src/features/workflow-editor/components/FabricWorkflowCanvas.vue`
- Modify: `client-vue/src/features/workflow-editor/layout/advancedNodeDefinitions.ts`
- Modify: `client-vue/src/core/constants/node-types.ts`
- Modify: `client-vue/src/features/workflow-editor/components/settings/editors/index.ts`
- Modify: `client-vue/src/features/workflow-editor/components/settings/addNodePickerModel.ts`
- Test: frontend contract tests under workflow-editor.

- [ ] **Step 1: Write failing tests**

Update frontend tests to assert:

```ts
assert.doesNotMatch(source, /DocumentLoaderNode/);
assert.doesNotMatch(source, /DocumentLoaderEditor/);
assert.doesNotMatch(source, /document-loader/);
assert.match(vectorSection, /node:file-dataset/);
assert.match(vectorSection, /node:text-dataset/);
assert.match(vectorSection, /node:database-dataset/);
```

Update add-node picker expected document quick add:

```ts
assert.deepEqual(items.map((item) => item.id), [
  "preset:file-dataset",
  "preset:text-dataset",
  "preset:database-dataset",
]);
```

- [ ] **Step 2: Run frontend typecheck to see current failures**

```powershell
cd C:\Workspace\Projects\fabric\client-vue
npm run type-check
```

Expected: still passes before deletion, tests expectations fail when run by the project runner if available.

- [ ] **Step 3: Remove document-loader UI files and references**

Delete:

```powershell
Remove-Item -LiteralPath client-vue/src/features/workflow-editor/components/nodes/DocumentLoaderNode.vue
Remove-Item -LiteralPath client-vue/src/features/workflow-editor/components/settings/editors/DocumentLoaderEditor.vue
Remove-Item -LiteralPath client-vue/src/features/workflow-editor/components/settings/editors/documentLoaderTemplateSuggestions.ts
Remove-Item -LiteralPath client-vue/src/features/workflow-editor/components/settings/editors/__tests__/documentLoaderTemplateSuggestions.test.ts
```

In `FabricWorkflowCanvas.vue`:

- remove `DocumentLoaderNode` import
- remove document-loader display name
- remove document-loader defaults
- remove document-loader canvas slot
- change contextual quick add:

```ts
document: ['node:file-dataset', 'node:text-dataset', 'node:database-dataset']
```

In `advancedNodeDefinitions.ts`:

```ts
{ id: 'document', ..., allowedNodes: ['node:file-dataset', 'node:text-dataset', 'node:database-dataset'] }
```

Delete `DOCUMENT_LOADER_HANDLERS`.

In `node-types.ts`, remove `document-loader`.

In editor registry, remove DocumentLoader import and entry.

In `addNodePickerModel.ts`, remove document-loader from contextual hidden/preset lists and add file-dataset as a preferred document node.

- [ ] **Step 4: Run frontend checks**

```powershell
npm run type-check
npm run build
```

Expected: pass.

- [ ] **Step 5: Update task file and commit**

```powershell
git add client-vue/src/features/workflow-editor client-vue/src/core/constants/node-types.ts feats-map/remove-default-document-loader-20260617.md
git commit -m "refactor: remove document loader frontend"
```

---

## Task 6: Add JSON Controls to Extract From File Editor

**Files:**
- Modify: `client-vue/src/features/workflow-editor/components/settings/editors/FileDatasetEditor.vue`
- Create: `client-vue/src/features/workflow-editor/components/settings/editors/fileDatasetJsonPaths.ts`
- Test: `client-vue/src/features/workflow-editor/components/settings/editors/__tests__/fileDatasetJsonPaths.test.ts`
- Test: `client-vue/src/features/workflow-editor/components/settings/editors/__tests__/retrievalEditors.contract.test.ts`

- [ ] **Step 1: Write failing tests for JSON path detection**

Create `fileDatasetJsonPaths.test.ts`:

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { detectJsonArrayPaths } from '../fileDatasetJsonPaths.ts'

test('detects top-level and nested JSON array paths from uploaded files', () => {
  const paths = detectJsonArrayPaths([{
    filename: 'catalog.json',
    content: Buffer.from(JSON.stringify({
      courses: [{ id: 'course-1' }],
      instructors: [{ id: 'teacher-1' }],
      payload: { items: [{ id: 'item-1' }] },
      version: '1.0',
    })).toString('base64'),
  }])

  assert.deepEqual(paths, ['courses', 'instructors', 'payload.items'])
})
```

- [ ] **Step 2: Run test to verify failure**

Use the available project TS runner. If client lacks `ts-node`, rely on `npm run type-check` after implementation and document runner limitation.

- [ ] **Step 3: Implement JSON path detector**

Create `fileDatasetJsonPaths.ts`:

```ts
import type { FileDatasetFile } from '@/core/types/workflow.types'

type JsonObject = Record<string, unknown>

export function detectJsonArrayPaths(files: FileDatasetFile[]): string[] {
  const paths = new Set<string>()
  for (const file of files) {
    if (typeof file === 'string') continue
    const text = decodeContent(file.content)
    try {
      collectArrayPaths(JSON.parse(text), '', paths, 0)
    } catch {
      continue
    }
  }
  return [...paths].sort()
}

function collectArrayPaths(value: unknown, path: string, paths: Set<string>, depth: number) {
  if (depth > 4 || value === null || typeof value !== 'object') return
  if (Array.isArray(value)) {
    if (path) paths.add(path)
    return
  }
  for (const [key, child] of Object.entries(value as JsonObject)) {
    collectArrayPaths(child, path ? `${path}.${key}` : key, paths, depth + 1)
  }
}

function decodeContent(content: string): string {
  const encoded = content.includes(',') ? content.slice(content.indexOf(',') + 1) : content
  return /^[A-Za-z0-9+/]+={0,2}$/.test(encoded.trim())
    ? atob(encoded)
    : content
}
```

- [ ] **Step 4: Add editor controls**

In `FileDatasetEditor.vue`, add controls shown when format is `json` or `auto`:

- `JSON Mode` select:

```ts
const JSON_MODE_OPTIONS = [
  { value: 'all', label: 'Whole file' },
  { value: 'specific', label: 'Array path' },
]
```

- detected path select:

```vue
<BaseSelect
  :model-value="(node.data.jsonPath as string) || ''"
  :options="jsonPathOptions"
  @update:model-value="updateNodeData({ jsonPath: $event as string })"
/>
```

- manual path input
- root context switch

- [ ] **Step 5: Run checks**

```powershell
npm run type-check
npm run build
```

Expected: pass.

- [ ] **Step 6: Update task file and commit**

```powershell
git add client-vue/src/features/workflow-editor/components/settings/editors/FileDatasetEditor.vue client-vue/src/features/workflow-editor/components/settings/editors/fileDatasetJsonPaths.ts client-vue/src/features/workflow-editor/components/settings/editors/__tests__/fileDatasetJsonPaths.test.ts client-vue/src/features/workflow-editor/components/settings/editors/__tests__/retrievalEditors.contract.test.ts feats-map/remove-default-document-loader-20260617.md
git commit -m "feat: configure json extraction on file dataset"
```

---

## Task 7: Update E2E Guide

**Files:**
- Modify: `docs/vector-store-rag-e2e-test-guide-2026-06-14.md`

- [ ] **Step 1: Update Test 3 workflow**

Replace:

```text
Extract From File -> Default Data Loader / Data
Default Data Loader -> Vector Store / Document
```

With:

```text
Extract From File -> Vector Store / Document
```

- [ ] **Step 2: Update configuration text**

Move JSON settings under `Extract From File`:

```text
Extract From File:
- Use 2 or 3 files: .md, .txt, .json, .csv
- Format: auto first, markdown second
- JSON Mode: Array Path
- Array Path: choose courses from detected options, or type courses manually
- Repeat with JSON that has courses and instructors; choose courses explicitly
- Enable root context when available
- Chunking enabled for markdown/text
```

- [ ] **Step 3: Remove loader negative tests**

Delete sections:

- `Extract From File direto no Vector Store`
- `Document Loader com JSON path invalido`
- `Document Loader com JSON path nao-array em modo array`

Replace with:

```text
### Extract From File JSON path invalido

Resultado esperado:
- Erro claro dizendo que o JSON path nao foi encontrado.
```

- [ ] **Step 4: Update quick add checklist**

Vector Store Document should show:

- `Extract From File`
- `Text Dataset`
- `Database Dataset`

- [ ] **Step 5: Commit**

```powershell
git add docs/vector-store-rag-e2e-test-guide-2026-06-14.md feats-map/remove-default-document-loader-20260617.md
git commit -m "docs: update rag guide for direct datasets"
```

---

## Task 8: Final Verification

**Files:**
- Modify: `feats-map/remove-default-document-loader-20260617.md`

- [ ] **Step 1: Search for deleted node references**

Run:

```powershell
rg -n "document-loader|Default Data Loader|DocumentLoader|dataPath" server\src client-vue\src docs -S
```

Expected:

- no `document-loader`
- no `Default Data Loader`
- no `DocumentLoader`
- `dataPath` only if unrelated outside removed node; JSON file dataset should use `jsonPath`

- [ ] **Step 2: Run server tests**

```powershell
cd C:\Workspace\Projects\fabric\server
node --loader ts-node/esm --test src/core/nodes/handlers/retrieval-handlers.test.ts src/core/modules/workflows/workflow-validation.test.ts src/core/modules/workflows/repository.test.ts src/shared/models/workflow-retrieval-types.test.ts src/core/utility-nodes/utility-node-pack.test.ts
npx tsc --noEmit
```

Expected: pass.

- [ ] **Step 3: Run client build**

```powershell
cd C:\Workspace\Projects\fabric\client-vue
npm run build
```

Expected: pass, with existing chunk-size warnings acceptable.

- [ ] **Step 4: Check git status**

```powershell
git status --short
```

Expected: only unrelated pre-existing files remain modified, or clean if docs were included.

- [ ] **Step 5: Final commit if needed**

```powershell
git add feats-map/remove-default-document-loader-20260617.md
git commit -m "chore: complete document loader removal checklist"
```

---

## Self-Review

- Spec coverage: all design requirements map to tasks 1-8.
- Placeholder scan: no TBD/TODO placeholders.
- Type consistency: use `jsonMode`, `jsonPath`, and `includeRootFieldsAsContext` consistently for `FileDatasetNode`.
- Scope: one cohesive migration; no compatibility layer included.

