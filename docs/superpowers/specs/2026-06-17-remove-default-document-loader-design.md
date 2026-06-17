# Remove Default Document Loader Design

## Goal

Remove the `Default Data Loader` / `document-loader` node completely and let `Extract From File`, `Text Dataset`, and `Database Dataset` produce vector-store-ready documents directly.

## Decision

Use direct dataset-to-vector-store connections:

```text
Manual Trigger -> Vector Store
Extract From File -> Vector Store / Document
Text Dataset -> Vector Store / Document
Database Dataset -> Vector Store / Document
Embedding Model -> Vector Store / Embedding
```

No compatibility layer is required. Existing test workflows can be recreated or adjusted.

## Architecture

`document-loader` is removed from shared workflow types, backend manifests, handlers, dependency adapters, validation, migration, frontend node types, advanced node definitions, editor registry, canvas rendering, node picker presets, and tests.

The `Document` capability moves to the three dataset nodes:

- `file-dataset`
- `text-dataset`
- `database-dataset`

Vector Store keeps consuming `DocumentSourceRef` dependencies. The dependency resolver loads the connected dataset node and indexes its `DatasetOutput.items`.

## Extract From File Behavior

`Extract From File` becomes the owner of file-to-document transformation.

For markdown and text:

- one dataset item per file before chunking
- chunking happens inside `file-dataset`
- metadata includes `source`

For CSV:

- one dataset item per row
- row values become `data`
- typed metadata coercion remains
- chunking can split long row text

For JSON:

- add `jsonMode`: `all` or `specific`
- add `jsonPath?: string`
- add `includeRootFieldsAsContext?: boolean`
- add frontend detected-array selector plus manual path fallback
- `all` indexes the full JSON file as one document
- `specific` requires `jsonPath`
- if selected JSON path points to an array, generate one document per item
- if selected JSON path points to one object/scalar, generate one document
- root scalar fields outside selected arrays become `context` when enabled

The frontend should detect top-level and nested arrays from uploaded JSON files and show options like `courses`, `instructors`, and `payload.items`. The user can still type a manual path.

## Text Dataset Behavior

`Text Dataset` remains a direct document source:

- plain text creates one item before chunking
- JSON array format creates one item per array entry
- chunking remains local to `Text Dataset`

## Database Dataset Behavior

`Database Dataset` remains a direct document source:

- query rows create document items
- `textColumns` define document text
- `metadataColumns` are copied into `data`
- chunking remains local to `Database Dataset`

## Frontend UX

Remove:

- `DocumentLoaderNode.vue`
- `DocumentLoaderEditor.vue`
- `documentLoaderTemplateSuggestions.ts`
- document-loader editor registry entry
- document-loader canvas slot
- document-loader quick-add preset
- document-loader advanced node handlers
- document-loader constants

Update `Vector Store / Document` Quick Add to show:

1. `Extract From File`
2. `Text Dataset`
3. `Database Dataset`

`Extract From File` editor gets a JSON section shown when format is `json` or `auto`:

- JSON Mode select
- Array Path select populated from uploaded JSON arrays
- Manual Array Path input
- Root Context switch

## Validation

Backend validation rejects:

- unknown node type `document-loader`
- `file-dataset` JSON specific mode without `jsonPath`
- invalid chunking
- Vector Store document handle connected to unsupported node types

Backend no longer rejects `file-dataset` directly connected to Vector Store.

## Testing

Update backend tests to cover:

- file dataset markdown chunking direct to vector store
- file dataset CSV rows direct to vector store
- file dataset JSON `all`
- file dataset JSON `specific` array path
- file dataset JSON root context
- file dataset invalid JSON path
- Vector Store indexes file/text/database datasets directly
- no `document-loader` registration
- no migration insertion of document loader

Update frontend tests to cover:

- no document-loader node type, picker item, editor, or canvas slot
- Vector Store Document quick add lists only the three datasets
- Extract From File editor exposes JSON mode/path controls
- document-loader files are deleted

## Documentation

Update the RAG E2E guide so Test 3 uses:

```text
Manual Trigger -> Vector Store
Extract From File -> Vector Store / Document
Embedding Model -> Vector Store / Embedding
```

Remove negative tests that require Document Loader.

## Non-Goals

- Do not preserve old workflows with `document-loader`.
- Do not keep hidden or automatic loader nodes.
- Do not add a generic transform layer.
- Do not move provider-specific logic into plugins.

