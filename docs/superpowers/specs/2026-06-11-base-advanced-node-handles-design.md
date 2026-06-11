# Base Node and Advanced Node Handles Design

## Goal

Create shared node primitives that make simple and multi-handle workflow nodes
consistent, configurable, and easier to build. Migrate AI Agent and Vector Store
to the new advanced primitive, with circular configuration nodes, top handles,
restricted contextual pickers, automatic layout, and dashed configuration edges.

## Responsibilities

### BaseNode

`BaseNode.vue` remains the common visual and interaction shell. It owns:

- selection, execution status, disabled state, toolbar, and editable node ID;
- configurable input and output positions;
- configurable rounding and border style;
- icon, title, and description presentation;
- default input/output handles;
- arbitrary declared handles, their labels, required indicator, and quick-add;
- the normal source quick-add behavior.

It does not move connected nodes or decide which catalog entries match an
allowed-node selector.

### BaseAdvancedNode

`BaseAdvancedNode.vue` composes `BaseNode.vue`. It owns the opinionated
horizontal card layout used by AI Agent and Vector Store and exposes the same
visual and handle API. It adds `autoOrganize`, which declares that connected
configuration nodes should use automatic layout.

The component does not mutate Vue Flow positions directly. The workflow canvas
reads the advanced-node declaration and performs layout so graph mutations stay
centralized.

### Workflow Canvas

The canvas owns:

- automatic positioning of configuration nodes by parent and handle;
- connection creation after contextual quick-add;
- recognizing configuration edges;
- passing allowed-node constraints into the picker overlay.

The existing AI Agent layout becomes generic enough to support both AI Agent
and Vector Store without embedding node-specific coordinates throughout the
component.

### AddNodePanel

The picker receives the selected handle's `allowedNodes` declaration and filters
presets and plugins through shared selector matching. Context-specific hard-coded
filters are removed only after equivalent selector coverage exists.

## Public API

### BaseNode props

```ts
type NodeSide = 'top' | 'left' | 'bottom' | 'right'
type NodeRounding = 'sm' | 'md' | 'lg' | 'full'
type NodeBorderStyle = 'default' | 'dashed'

interface BaseNodeHandleDefinition {
  id: string
  label: string
  type: 'source' | 'target'
  position: Position
  required?: boolean
  quickAdd?: 'agent-config' | 'vector-config'
  allowedNodes: '*' | string[]
}
```

Relevant props:

```ts
interface BaseNodeProps {
  inputPosition?: NodeSide
  outputPosition?: NodeSide
  rounded?: NodeRounding
  borderStyle?: NodeBorderStyle
  iconLeft?: string
  title?: string
  description?: string
  handlers?: BaseNodeHandleDefinition[]
}
```

The public prop remains named `handlers` as requested. Internally, definitions
may use the more precise `handleDefinition` terminology.

Defaults preserve current behavior:

- `inputPosition: 'left'`
- `outputPosition: 'right'`
- `rounded: 'lg'`
- `borderStyle: 'default'`
- `handlers: []`

`title` and `description` replace the ambiguous visual use of `title` and
`subtitle`, while compatibility aliases remain during migration.

### BaseAdvancedNode props

`BaseAdvancedNode` forwards the BaseNode API and adds:

```ts
interface BaseAdvancedNodeProps extends BaseNodeProps {
  autoOrganize?: boolean
}
```

Its default dimensions and content layout match the current AI Agent card.

## Allowed Node Selectors

`allowedNodes` is mandatory on declared handlers so permissions are explicit.

- `'*'`: allow every picker entry.
- `[]`: allow no picker entry and do not show quick-add.
- `node:<workflow-node-type>`: allow a workflow node type.
- `plugin:<plugin-id>`: allow one plugin.
- `preset:<preset-id>`: allow one picker preset.
- `capability:<capability-id>`: allow plugins advertising a compatible generic
  capability.

Bare values are not accepted. Namespaced selectors prevent collisions between
node types, plugin IDs, presets, and capabilities.

Initial capability selectors:

- `capability:chat-model`
- `capability:memory-store`
- `capability:agent-tool`
- `capability:embedding-provider`
- `capability:vector-store-provider`

Examples:

```ts
const agentHandlers: BaseNodeHandleDefinition[] = [
  {
    id: 'chatModel',
    label: 'Chat Model',
    type: 'target',
    position: Position.Bottom,
    required: true,
    quickAdd: 'agent-config',
    allowedNodes: ['capability:chat-model'],
  },
  {
    id: 'memory',
    label: 'Memory',
    type: 'target',
    position: Position.Bottom,
    quickAdd: 'agent-config',
    allowedNodes: ['preset:sqlite-memory', 'capability:memory-store'],
  },
  {
    id: 'tool',
    label: 'Tool',
    type: 'target',
    position: Position.Bottom,
    quickAdd: 'agent-config',
    allowedNodes: ['capability:agent-tool'],
  },
]
```

Vector Store uses `capability:embedding-provider` with a `node:embeddings`
fallback and the three dataset node selectors for its Document handle.

## Rendering Rules

Handlers are distributed along the side declared by `position`. Multiple
handlers on the same side use stable equal tracks. Each handler renders:

- a diamond handle for configuration connections;
- its label adjacent to the selected side;
- `*` when `required` is true;
- a quick-add control only when `quickAdd` exists and `allowedNodes` is not empty.

`rounded: 'full'` produces circular simple nodes when width and height are equal.
Agent and Vector Store configuration nodes use this form with their target
handle at the top.

`borderStyle` affects only the node border. It does not determine edge styling.

## Edge Rules

All edges targeting declared configuration handles use the configuration-edge
presentation:

- dashed stroke;
- configuration-oriented bezier routing;
- no ordinary insert/delete toolbar;
- execution color and state behavior remain supported.

This generalizes the existing Agent-only handle set to Agent and Vector Store
configuration handles without coupling edge rendering to component names.

## Automatic Organization

When `autoOrganize` is true, contextual quick-add positions a new child from:

- parent node bounds;
- handler side and index;
- existing children connected to the same handler;
- shared row, column, and gap constants.

Bottom handlers place children below the parent with the child's target handle
facing upward. Repeated children use deterministic grid slots. Existing manually
moved nodes are not continuously repositioned; organization occurs when adding a
new contextual child or invoking an explicit organize action in the future.

## Migration

1. Extend BaseNode while preserving existing props and slots.
2. Add BaseAdvancedNode and shared handle types/utilities.
3. Migrate AI Agent and Vector Store to BaseAdvancedNode.
4. Update AI Model, AI Memory, AI Tool, Embeddings, and Dataset nodes used as
   configuration children to circular presentation with top target handles.
5. Replace Agent-specific picker filtering and layout branches with handle
   declarations and selector matching.
6. Generalize dashed configuration edges.

Existing workflow JSON remains compatible because node types, node data, handle
IDs, and edge endpoints do not change.

## Testing

Use TDD for each behavior group:

- BaseNode defaults and configurable visual props;
- arbitrary handler rendering and required labels;
- allowed-node selector matching for nodes, presets, plugins, and capabilities;
- empty and wildcard allowed-node behavior;
- BaseAdvancedNode delegation and auto-organize declaration;
- generic layout for Agent and Vector Store children;
- dashed edges for all configuration handles;
- migration contracts for AI Agent and Vector Store;
- production build and browser QA of both node families.

Browser QA must confirm circular child nodes, top handles, dashed edges,
restricted quick-add results, provider icons, and deterministic placement.

## Non-goals

- Adding the n8n-specific Vector Store Tool node in this refactor.
- Changing workflow execution semantics or plugin boundaries.
- Persisting layout policy inside plugin manifests.
- Automatically rearranging nodes after every drag or workflow load.
