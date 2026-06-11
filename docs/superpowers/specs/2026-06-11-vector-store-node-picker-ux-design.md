# Vector Store Node and Picker UX

## Goal

Align the Vector Store node with the AI Agent configuration-card pattern and keep
configuration-only nodes out of the default Add Node picker.

## Vector Store Node

- Render as a 236x100 rectangular card using the same visual hierarchy as AI Agent.
- Show the configured vector store plugin icon as the leading visual, with a
  `database-zap` fallback.
- Show the configured node name as title and the collection name as subtitle.
- Keep the normal workflow target on the left and source on the right.
- Keep the normal outgoing quick-add button provided by `BaseNode`.
- Render `Embedding` and `Document` configuration handles below the card.
- Give both configuration handles a downward quick-add button that opens the
  corresponding contextual picker and connects the created node automatically.

## Add Node Picker

The default picker must exclude configuration-only nodes:

- `ai-model`
- `ai-memory`
- `ai-tool`
- `embeddings`
- `retriever`

These node types remain supported in workflow types, validation, rendering, and
existing saved workflows. They remain available from their contextual handles:

- AI Agent handles expose model, memory, and tool configuration.
- Vector Store handles expose embedding providers and dataset document sources.

`AI Agent` and `Vector Store` remain visible in the default picker.

## Testing

- Contract-test the Vector Store card dimensions, plugin icon loading, and both
  contextual quick-add controls.
- Unit-test the default picker filtering rule for every hidden configuration node.
- Preserve existing contextual picker tests.
- Run the focused frontend tests and production build.
- Verify the rendered picker and Vector Store node in the local browser.

## Scope

This change reuses the existing `BaseNode`, `QuickAddButton`, plugin appearance API,
and contextual picker events. It does not introduce a shared Agent/Vector card
abstraction or change backend workflow behavior.
