# Vector Store UX Rework Plan

**Goal:** corrigir a UX dos datasets e redesenhar RAG para ficar parecido com Agent config nodes: Vector Store como node principal, Embedding e Document como entradas/configs acopladas.

**Rules:**
- Trabalhar na branch `dev`.
- TDD antes de cada task que muda comportamento.
- Marcar task concluida neste arquivo.
- Fazer commit ao concluir cada task.
- Plugins nao importam core, engines ou outros plugins.
- Core nao pode ter logica especifica de Pinecone, Qdrant, OpenAI etc.
- Provider-specific fica dentro do plugin.

---

## Diagnostico

1. `FileDatasetEditor.vue` esta usando tres inputs texto soltos:
   - `filePath`
   - `fileUrl`
   - `format`

   Isso e pior que o input `attachments` do Gmail, que ja usa `x-input-type: files` no `PluginEditor.vue`, com modo texto/expressao e upload.

2. Alguns utility nodes aparecem sem visual unico porque os componentes usam tokens genericos:
   - `EmbeddingsNode.vue` usa `--sailor-node-ai-*`
   - `VectorStoreNode.vue` usa `--sailor-node-merge-*`
   - `RetrieverNode.vue` usa `--sailor-node-if-*`

   O certo e usar style do catalogo ou tokens especificos por utility node.

3. Arquitetura RAG atual esta linear demais:

   ```text
   Dataset -> Embeddings -> Vector Store -> Retriever -> Agent
   ```

   Melhor para o editor:

   ```text
   Dataset/Text/File/Database -> Vector Store(Document)
   Embedding Provider ---------> Vector Store(Embedding)
   Vector Store --------------> Agent / next step
   ```

   Ou seja: `Vector Store` deve se comportar mais como `AI Agent`, recebendo config nodes em handles especificos.

4. O "Default Data Loader" da imagem de exemplo parece ser o equivalente a um loader/document source. No Sailor, isso deve continuar sendo `Dataset`, porque Dataset e utilitario generico e tambem pode ser usado fora de RAG.

---

## Decisoes

- `Text Dataset`, `File Dataset`, `Database Dataset` continuam utilitarios normais.
- `File Dataset` passa a aceitar uma lista de arquivos usando UI igual ao `x-input-type: files`.
- `Vector Store` vira o node principal de RAG/index/search.
- `Embeddings` deixa de ser recomendado como step linear no Add Node principal.
- `Embeddings` vira config node que conecta no handle `Embedding` do Vector Store.
- `Retriever` deixa de ser node principal no MVP redesenhado; sua funcao vira config/saida do `Vector Store`.
- `Vector Store` deve ter handles visiveis:
  - `Embedding`
  - `Document`
  - `source` para seguir fluxo normal
- AddNodePanel deve ter submenu especial para Vector Store:
  - clicar em `Vector Store`
  - escolher provider disponivel: Pinecone, Qdrant
  - criar node `vector-store` ja com plugin/method defaults daquele provider
- Quick-add no handle `Embedding` mostra providers de embedding.
- Quick-add no handle `Document` mostra datasets/data loaders.

---

## Task 1: Corrigir File Dataset para arquivos multiplos

**Files:**
- Modify: `client-vue/src/features/workflow-editor/components/settings/editors/FileDatasetEditor.vue`
- Create: `client-vue/src/features/workflow-editor/components/settings/editors/FileDatasetFilesInput.vue`
- Test: `client-vue/src/features/workflow-editor/components/settings/editors/__tests__/retrievalEditors.contract.test.ts`
- Modify: `client-vue/src/core/types/workflow.types.ts`
- Modify: `server/src/shared/models/workflow-types.ts`
- Modify: `server/src/core/nodes/handlers/retrieval.ts`
- Test: `server/src/core/nodes/handlers/retrieval-handlers.test.ts`

**Steps:**
- [x] Add failing frontend contract: `FileDatasetEditor` must not render `File Path` + `File URL` as two plain `BaseInput`s.
- [x] Add failing frontend contract: `FileDatasetEditor` must render `FileDatasetFilesInput`.
- [x] Create `FileDatasetFilesInput.vue` based on the existing `PluginEditor.vue` files UI:
  - text/expression mode
  - upload button
  - remove button
  - add file button
  - multiple files
- [x] Update `FileDatasetNode` types to support:

  ```ts
  files?: Array<string | {
    filename: string
    content: string
    mimeType?: string
    size?: number
  }>
  format?: 'txt' | 'markdown' | 'json' | 'csv' | 'auto'
  ```

- [x] Keep backward compatibility with `filePath` and `fileUrl` in backend handler for old workflows.
- [x] Backend handler reads `files` first, then legacy `filePath/fileUrl`.
- [x] Add backend test for uploaded/base64 file item.
- [x] Add backend test for multiple files producing multiple dataset items.
- [x] Run:

  ```powershell
  cd server
  node --test --import ts-node/register src/core/nodes/handlers/retrieval-handlers.test.ts
  npm run build
  ```

- [x] Run:

  ```powershell
  cd client-vue
  node --test src/features/workflow-editor/components/settings/editors/__tests__/retrievalEditors.contract.test.ts
  npm run build
  ```

- [x] Commit:

  ```powershell
  git add client-vue/src/features/workflow-editor/components/settings/editors/FileDatasetEditor.vue client-vue/src/features/workflow-editor/components/settings/editors/FileDatasetFilesInput.vue client-vue/src/features/workflow-editor/components/settings/editors/__tests__/retrievalEditors.contract.test.ts client-vue/src/core/types/workflow.types.ts server/src/shared/models/workflow-types.ts server/src/core/nodes/handlers/retrieval.ts server/src/core/nodes/handlers/retrieval-handlers.test.ts
  git commit -m "feat: improve file dataset file inputs"
  ```

---

## Task 2: Corrigir styles unicos dos utility nodes

**Files:**
- Modify: `client-vue/src/features/workflow-editor/components/nodes/TextDatasetNode.vue`
- Modify: `client-vue/src/features/workflow-editor/components/nodes/FileDatasetNode.vue`
- Modify: `client-vue/src/features/workflow-editor/components/nodes/DatabaseDatasetNode.vue`
- Modify: `client-vue/src/features/workflow-editor/components/nodes/EmbeddingsNode.vue`
- Modify: `client-vue/src/features/workflow-editor/components/nodes/VectorStoreNode.vue`
- Modify: `client-vue/src/features/workflow-editor/components/nodes/RetrieverNode.vue`
- Test: `client-vue/src/features/workflow-editor/components/nodes/__tests__/retrievalNodes.contract.test.ts`

**Steps:**
- [x] Add failing test to assert retrieval node components do not use generic `--sailor-node-ai-*`, `--sailor-node-if-*`, or `--sailor-node-merge-*`.
- [x] Add explicit colors matching `server/src/core/utility-nodes/sailor-core/manifest.ts`.
- [x] Ensure icon is visible in dark/light themes.
- [x] Verify Database Dataset icon is not white/blank.
- [x] Run:

  ```powershell
  cd client-vue
  node --test src/features/workflow-editor/components/nodes/__tests__/retrievalNodes.contract.test.ts
  npm run build
  ```

- [x] Commit:

  ```powershell
  git add client-vue/src/features/workflow-editor/components/nodes/TextDatasetNode.vue client-vue/src/features/workflow-editor/components/nodes/FileDatasetNode.vue client-vue/src/features/workflow-editor/components/nodes/DatabaseDatasetNode.vue client-vue/src/features/workflow-editor/components/nodes/EmbeddingsNode.vue client-vue/src/features/workflow-editor/components/nodes/VectorStoreNode.vue client-vue/src/features/workflow-editor/components/nodes/RetrieverNode.vue client-vue/src/features/workflow-editor/components/nodes/__tests__/retrievalNodes.contract.test.ts
  git commit -m "fix: apply unique utility node styles"
  ```

---

## Task 3: Redesenhar Vector Store como node principal com handles

**Files:**
- Modify: `client-vue/src/core/types/workflow.types.ts`
- Modify: `server/src/shared/models/workflow-types.ts`
- Modify: `client-vue/src/features/workflow-editor/components/nodes/VectorStoreNode.vue`
- Modify: `client-vue/src/features/workflow-editor/components/SailorWorkflowCanvas.vue`
- Test: `client-vue/src/features/workflow-editor/components/nodes/__tests__/retrievalNodes.contract.test.ts`
- Test: `client-vue/src/features/workflow-editor/components/settings/__tests__/agentAddNode.contract.test.ts`
- Test: `server/src/shared/models/workflow-retrieval-types.test.ts`

**Steps:**
- [x] Add handles to `VectorStoreNode.vue`:
  - target `target` on left for normal flow
  - target `embedding` below/left
  - target `document` below/right
  - source `source` on right
- [x] Add labels near handles:
  - `Embedding`
  - `Document`
- [x] Add frontend types for vector store config counts:

  ```ts
  embeddingCount?: number
  documentCount?: number
  retrievalMode?: 'index' | 'query' | 'index-and-query'
  ```

- [x] Add backend shared types with same fields.
- [x] Add tests that Vector Store exposes `embedding` and `document` handles.
- [x] Add tests that canvas recognizes those handles as config handles, not normal sequential edges.
- [x] Run focused frontend/backend tests.
- [x] Commit:

  ```powershell
  git add client-vue/src/core/types/workflow.types.ts server/src/shared/models/workflow-types.ts client-vue/src/features/workflow-editor/components/nodes/VectorStoreNode.vue client-vue/src/features/workflow-editor/components/SailorWorkflowCanvas.vue client-vue/src/features/workflow-editor/components/nodes/__tests__/retrievalNodes.contract.test.ts client-vue/src/features/workflow-editor/components/settings/__tests__/agentAddNode.contract.test.ts server/src/shared/models/workflow-retrieval-types.test.ts
  git commit -m "feat: add vector store config handles"
  ```

---

## Task 4: AddNodePanel especial para Vector Store providers

**Files:**
- Modify: `client-vue/src/features/workflow-editor/components/settings/AddNodePanel.vue`
- Modify: `client-vue/src/features/workflow-editor/components/settings/addNodePickerModel.ts`
- Modify: `client-vue/src/features/workflow-editor/components/SailorWorkflowCanvas.vue`
- Test: `client-vue/src/features/workflow-editor/components/settings/__tests__/addNodePickerModel.test.ts`
- Test: `client-vue/src/features/workflow-editor/components/settings/__tests__/agentAddNode.contract.test.ts`

**Steps:**
- [x] Add failing test: clicking Vector Store category/preset must list vector store providers, not plugin methods.
- [x] Detect vector store plugins by generic method contract:
  - `ensureCollection`
  - `upsertDocuments`
  - `querySimilar`
  - `deleteDocuments`
  - `describeCollection`
- [x] Do not hardcode Pinecone/Qdrant in core UI.
- [x] Add picker flow:

  ```text
  AI
  -> Vector Store
  -> Pinecone
  -> creates vector-store node with pluginId=sailor-pinecone
  ```

  ```text
  AI
  -> Vector Store
  -> Qdrant
  -> creates vector-store node with pluginId=sailor-qdrant
  ```

- [x] Keep provider-specific defaults generic and sourced from plugin metadata/method contract where possible.
- [x] Add fallback only for generic defaults:
  - collectionName
  - dimension
  - metric
- [x] Run tests/build.
- [x] Commit:

  ```powershell
  git add client-vue/src/features/workflow-editor/components/settings/AddNodePanel.vue client-vue/src/features/workflow-editor/components/settings/addNodePickerModel.ts client-vue/src/features/workflow-editor/components/SailorWorkflowCanvas.vue client-vue/src/features/workflow-editor/components/settings/__tests__/addNodePickerModel.test.ts client-vue/src/features/workflow-editor/components/settings/__tests__/agentAddNode.contract.test.ts
  git commit -m "feat: choose vector store providers from picker"
  ```

---

## Task 5: Embedding config quick-add

**Files:**
- Modify: `client-vue/src/features/workflow-editor/components/nodes/EmbeddingsNode.vue`
- Modify: `client-vue/src/features/workflow-editor/components/settings/AddNodePanel.vue`
- Modify: `client-vue/src/features/workflow-editor/components/SailorWorkflowCanvas.vue`
- Modify: `server/src/core/modules/workflows/executor.ts`
- Test: `client-vue/src/features/workflow-editor/components/settings/__tests__/agentAddNode.contract.test.ts`
- Test: `server/src/core/modules/workflows/agent-config-node-execution.test.ts`

**Steps:**
- [x] Add a `vectorConfigHandle?: 'embedding' | 'document'` overlay context, separate from `agentConfigHandle`.
- [x] Quick-add from Vector Store `embedding` handle opens embedding providers only.
- [x] Select provider creates `embeddings` config node connected to `vector-store.embedding`.
- [x] Executor treats `embeddings` connected to Vector Store as config dependency, not normal step output.
- [x] Keep plugin boundary generic: embeddings node stores `pluginId`, `methodId`, `model`, `dimension`.
- [x] Run focused tests.
- [x] Commit:

  ```powershell
  git add client-vue/src/features/workflow-editor/components/nodes/EmbeddingsNode.vue client-vue/src/features/workflow-editor/components/settings/AddNodePanel.vue client-vue/src/features/workflow-editor/components/SailorWorkflowCanvas.vue server/src/core/modules/workflows/executor.ts client-vue/src/features/workflow-editor/components/settings/__tests__/agentAddNode.contract.test.ts server/src/core/modules/workflows/agent-config-node-execution.test.ts
  git commit -m "feat: add embedding config quick add"
  ```

---

## Task 6: Document handle accepts Dataset nodes

**Files:**
- Modify: `client-vue/src/features/workflow-editor/components/SailorWorkflowCanvas.vue`
- Modify: `server/src/core/nodes/handlers/retrieval.ts`
- Modify: `server/src/core/modules/workflows/executor.ts`
- Test: `server/src/core/nodes/handlers/retrieval-handlers.test.ts`
- Test: `server/src/core/modules/workflows/executor.test.ts`
- Test: `client-vue/src/features/workflow-editor/components/settings/__tests__/agentAddNode.contract.test.ts`

**Steps:**
- [x] Quick-add from `document` handle shows:
  - Text Dataset
  - File Dataset
  - Database Dataset
- [x] Connecting dataset to Vector Store document handle feeds documents to vector store.
- [x] Vector Store handler collects document input from connected dataset output.
- [x] Vector Store handler collects embedding config from connected embedding node.
- [x] Handler calls provider methods generically:
  - ensure collection
  - embed documents
  - upsert documents
- [x] Add backend test for Dataset -> Vector Store(Document) + Embedding -> Vector Store(Embedding).
- [x] Run focused tests.
- [x] Commit:

  ```powershell
  git add client-vue/src/features/workflow-editor/components/SailorWorkflowCanvas.vue server/src/core/nodes/handlers/retrieval.ts server/src/core/modules/workflows/executor.ts server/src/core/nodes/handlers/retrieval-handlers.test.ts server/src/core/modules/workflows/executor.test.ts client-vue/src/features/workflow-editor/components/settings/__tests__/agentAddNode.contract.test.ts
  git commit -m "feat: connect dataset documents to vector stores"
  ```

---

## Task 7: Migration/deprecation of Retriever as top-level node

**Files:**
- Modify: `client-vue/src/features/workflow-editor/components/settings/addNodePickerModel.ts`
- Modify: `client-vue/src/features/workflow-editor/components/settings/AddNodePanel.vue`
- Modify: `server/src/core/modules/workflows/workflow-validation.ts`
- Modify: `server/src/core/nodes/handlers/retrieval.ts`
- Test: `server/src/core/modules/workflows/workflow-validation.test.ts`
- Test: `server/src/core/nodes/handlers/retrieval-handlers.test.ts`
- Test: `client-vue/src/features/workflow-editor/components/settings/__tests__/addNodePickerModel.test.ts`

**Steps:**
- [x] Keep old `retriever` node valid for existing workflows.
- [x] Hide `retriever` from default AddNodePanel.
- [x] Add retrieval settings inside `VectorStoreEditor.vue`:
  - query
  - topK
  - outputMode
  - maxContextChars
  - filter
- [x] Vector Store output can be used by AI Agent as retrieval context.
- [x] AI Agent still accepts old retriever output for backward compatibility.
- [x] Add tests proving old retriever workflows still validate.
- [x] Add tests proving new vector-store output can feed Agent context.
- [x] Commit:

  ```powershell
  git add client-vue/src/features/workflow-editor/components/settings/addNodePickerModel.ts client-vue/src/features/workflow-editor/components/settings/AddNodePanel.vue client-vue/src/features/workflow-editor/components/settings/editors/VectorStoreEditor.vue server/src/core/modules/workflows/workflow-validation.ts server/src/core/nodes/handlers/retrieval.ts server/src/core/modules/workflows/workflow-validation.test.ts server/src/core/nodes/handlers/retrieval-handlers.test.ts client-vue/src/features/workflow-editor/components/settings/__tests__/addNodePickerModel.test.ts
  git commit -m "feat: move retrieval config into vector store"
  ```

---

## Task 8: Full verification

**Steps:**
- [ ] Run backend focused retrieval tests:

  ```powershell
  cd server
  node --test --import ts-node/register src/shared/models/workflow-retrieval-types.test.ts src/core/nodes/handlers/retrieval-handlers.test.ts src/core/modules/workflows/workflow-validation.test.ts src/core/modules/workflows/executor.test.ts src/plugins/sailor/pinecone/methods.test.ts src/plugins/sailor/qdrant/methods.test.ts
  npm run build
  ```

- [ ] Run frontend focused tests:

  ```powershell
  cd client-vue
  node --test src/features/workflow-editor/components/settings/__tests__/addNodePickerModel.test.ts src/features/workflow-editor/components/settings/__tests__/agentAddNode.contract.test.ts src/features/workflow-editor/components/nodes/__tests__/retrievalNodes.contract.test.ts src/features/workflow-editor/components/settings/editors/__tests__/retrievalEditors.contract.test.ts
  npm run build
  ```

- [ ] Manual QA:
  - Add Vector Store.
  - Pick Pinecone.
  - Add Embedding via `Embedding` handle.
  - Add File Dataset via `Document` handle.
  - Confirm File Dataset supports upload/text multiple files.
  - Confirm utility nodes have unique visible icons/colors.
  - Confirm old Retriever workflow still opens.

- [ ] Commit if any QA fixes are needed.
