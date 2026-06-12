# Base Node and Advanced Node Handles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build configurable shared node primitives with arbitrary restricted handles, then migrate AI Agent and Vector Store to reusable advanced cards with circular child nodes, automatic organization, and dashed configuration edges.

**Architecture:** Keep rendering declarations in shared node components, selector matching in a pure picker model, and graph mutations/layout in the workflow canvas. `BaseNode` owns visual options and arbitrary handlers; `BaseAdvancedNode` composes it and declares automatic organization without mutating Vue Flow directly.

**Tech Stack:** Vue 3, TypeScript, Vue Flow, Node test runner, Vite.

---

## File Structure

- Create `client-vue/src/features/workflow-editor/components/nodePresentation.types.ts`: shared node-side, rounding, border, handler, quick-add, and allowed-node selector types.
- Create `client-vue/src/features/workflow-editor/components/BaseAdvancedNode.vue`: horizontal advanced-card composition over `BaseNode`.
- Create `client-vue/src/features/workflow-editor/components/__tests__/baseNode.contract.test.ts`: contracts for BaseNode and BaseAdvancedNode public APIs and rendering.
- Create `client-vue/src/features/workflow-editor/components/settings/allowedNodeSelectors.ts`: pure selector matching for presets and plugins.
- Create `client-vue/src/features/workflow-editor/components/settings/__tests__/allowedNodeSelectors.test.ts`: selector behavior tests.
- Create `client-vue/src/features/workflow-editor/layout/advancedNodeLayout.ts`: pure automatic child-position calculation.
- Create `client-vue/src/features/workflow-editor/layout/__tests__/advancedNodeLayout.test.ts`: deterministic layout tests.
- Modify `client-vue/src/features/workflow-editor/components/BaseNode.vue`: configurable positions, rounding, border style, card content, and arbitrary handlers.
- Modify `client-vue/src/features/workflow-editor/components/QuickAddButton.vue`: generic handler context and allowed-node payload.
- Modify `client-vue/src/features/workflow-editor/components/settings/AddNodePanel.vue`: consume allowed-node selectors instead of node-specific picker branches.
- Modify `client-vue/src/features/workflow-editor/components/SailorWorkflowCanvas.vue`: carry handler declarations, filter context, create edges, and apply generic auto-layout.
- Modify `client-vue/src/features/workflow-editor/components/BaseEdge.vue`: recognize generic configuration edges and render them dashed.
- Modify `client-vue/src/features/workflow-editor/components/nodes/AiAgentNode.vue`: migrate to BaseAdvancedNode handler declarations.
- Modify `client-vue/src/features/workflow-editor/components/nodes/VectorStoreNode.vue`: migrate to BaseAdvancedNode handler declarations.
- Modify `client-vue/src/features/workflow-editor/components/nodes/AiModelNode.vue`, `AiMemoryNode.vue`, `AiToolNode.vue`, `EmbeddingsNode.vue`, `TextDatasetNode.vue`, `FileDatasetNode.vue`, and `DatabaseDatasetNode.vue`: circular configuration presentation with top target handles.
- Modify focused workflow-editor contract tests to protect migration, edge style, picker filtering, and compatibility.

---

### Task 1: Shared Node Presentation Types and Allowed Selectors

**Files:**
- Create: `client-vue/src/features/workflow-editor/components/nodePresentation.types.ts`
- Create: `client-vue/src/features/workflow-editor/components/settings/allowedNodeSelectors.ts`
- Create: `client-vue/src/features/workflow-editor/components/settings/__tests__/allowedNodeSelectors.test.ts`

- [x] **Step 1: Write failing selector tests**

Create tests covering wildcard, empty, node, preset, plugin, and capability selectors:

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  allowedNodeSelectorsPermitPlugin,
  allowedNodeSelectorsPermitPreset,
} from '../allowedNodeSelectors.ts'

test('empty selectors deny every picker entry and wildcard allows every entry', () => {
  assert.equal(allowedNodeSelectorsPermitPreset([], { id: 'text', nodeType: 'text-dataset' }), false)
  assert.equal(allowedNodeSelectorsPermitPreset('*', { id: 'text', nodeType: 'text-dataset' }), true)
})

test('namespaced selectors match nodes, presets, and plugins without collisions', () => {
  assert.equal(allowedNodeSelectorsPermitPreset(['node:text-dataset'], { id: 'text', nodeType: 'text-dataset' }), true)
  assert.equal(allowedNodeSelectorsPermitPreset(['preset:sqlite-memory'], { id: 'sqlite-memory', nodeType: 'ai-memory' }), true)
  assert.equal(allowedNodeSelectorsPermitPlugin(['plugin:openai'], { id: 'openai', capabilities: [] }), true)
})

test('capability selectors allow only compatible plugins', () => {
  assert.equal(allowedNodeSelectorsPermitPlugin(['capability:chat-model'], { id: 'openai', capabilities: ['chat-model'] }), true)
  assert.equal(allowedNodeSelectorsPermitPlugin(['capability:chat-model'], { id: 'file', capabilities: [] }), false)
})
```

- [x] **Step 2: Run tests and verify RED**

Run:

```powershell
cd client-vue
node --test src/features/workflow-editor/components/settings/__tests__/allowedNodeSelectors.test.ts
```

Expected: FAIL because the selector module does not exist.

- [x] **Step 3: Define shared presentation types**

Create `nodePresentation.types.ts`:

```ts
import type { Position } from '@vue-flow/core'

export type NodeSide = 'top' | 'left' | 'bottom' | 'right'
export type NodeRounding = 'sm' | 'md' | 'lg' | 'full'
export type NodeBorderStyle = 'default' | 'dashed'
export type NodeQuickAddMode = 'agent-config' | 'vector-config'
export type AllowedNodeSelector =
  | `node:${string}`
  | `plugin:${string}`
  | `preset:${string}`
  | `capability:${string}`
export type AllowedNodes = '*' | AllowedNodeSelector[]

export interface BaseNodeHandlerDefinition {
  id: string
  label: string
  type: 'source' | 'target'
  position: Position
  required?: boolean
  quickAdd?: NodeQuickAddMode
  allowedNodes: AllowedNodes
}
```

- [x] **Step 4: Implement pure selector matching**

Create `allowedNodeSelectors.ts` with small picker-facing inputs:

```ts
import type { AllowedNodes } from '../nodePresentation.types'

type PresetCandidate = { id: string; nodeType: string }
type PluginCandidate = { id: string; capabilities: readonly string[] }

export function allowedNodeSelectorsPermitPreset(
  allowed: AllowedNodes,
  preset: PresetCandidate,
): boolean {
  if (allowed === '*') return true
  return allowed.includes(`node:${preset.nodeType}`) || allowed.includes(`preset:${preset.id}`)
}

export function allowedNodeSelectorsPermitPlugin(
  allowed: AllowedNodes,
  plugin: PluginCandidate,
): boolean {
  if (allowed === '*') return true
  return allowed.includes(`plugin:${plugin.id}`) || plugin.capabilities.some((capability) =>
    allowed.includes(`capability:${capability}`),
  )
}
```

- [x] **Step 5: Run tests and verify GREEN**

Run the command from Step 2. Expected: all selector tests pass.

- [x] **Step 6: Commit shared types and selectors**

```powershell
git add client-vue/src/features/workflow-editor/components/nodePresentation.types.ts client-vue/src/features/workflow-editor/components/settings/allowedNodeSelectors.ts client-vue/src/features/workflow-editor/components/settings/__tests__/allowedNodeSelectors.test.ts
git commit -m "feat: define node handles and allowed selectors"
```

---

### Task 2: Extend BaseNode with Configurable Visuals and Handlers

**Files:**
- Modify: `client-vue/src/features/workflow-editor/components/BaseNode.vue`
- Modify: `client-vue/src/features/workflow-editor/components/QuickAddButton.vue`
- Create: `client-vue/src/features/workflow-editor/components/__tests__/baseNode.contract.test.ts`

- [x] **Step 1: Write failing BaseNode contract tests**

Assert the new props, defaults, handler rendering, required marker, and allowed-node forwarding:

```ts
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '../../../..')
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

test('BaseNode exposes configurable positions, rounding, border, and handlers', () => {
  const source = read('src/features/workflow-editor/components/BaseNode.vue')
  for (const prop of ['inputPosition', 'outputPosition', 'rounded', 'borderStyle', 'iconLeft', 'description', 'handlers']) {
    assert.match(source, new RegExp(prop))
  }
  assert.match(source, /BaseNodeHandlerDefinition/)
  assert.match(source, /handler\.required/)
  assert.match(source, /handler\.allowedNodes/)
})

test('BaseNode maps all four sides to Vue Flow positions', () => {
  const source = read('src/features/workflow-editor/components/BaseNode.vue')
  for (const side of ['top', 'left', 'bottom', 'right']) assert.match(source, new RegExp(`${side}: Position\.`))
})

test('QuickAddButton emits generic handler metadata', () => {
  const source = read('src/features/workflow-editor/components/QuickAddButton.vue')
  assert.match(source, /allowedNodes/)
  assert.match(source, /handlerId/)
  assert.doesNotMatch(source, /agentConfigHandle:/)
  assert.doesNotMatch(source, /vectorConfigHandle:/)
})
```

- [x] **Step 2: Run contract test and verify RED**

```powershell
cd client-vue
node --test src/features/workflow-editor/components/__tests__/baseNode.contract.test.ts
```

Expected: FAIL because BaseNode does not expose the new API.

- [x] **Step 3: Add BaseNode props and normalized defaults**

Extend props and computed values:

```ts
import type {
  BaseNodeHandlerDefinition,
  NodeBorderStyle,
  NodeRounding,
  NodeSide,
} from './nodePresentation.types'

inputPosition?: NodeSide
outputPosition?: NodeSide
rounded?: NodeRounding
borderStyle?: NodeBorderStyle
iconLeft?: string
description?: string
handlers?: BaseNodeHandlerDefinition[]

const positionBySide = {
  top: Position.Top,
  left: Position.Left,
  bottom: Position.Bottom,
  right: Position.Right,
} as const
const effectiveInputPosition = computed(() => positionBySide[props.inputPosition ?? 'left'])
const effectiveOutputPosition = computed(() => positionBySide[props.outputPosition ?? 'right'])
```

Keep `subtitle`, `icon`, `hasTarget`, and `hasSource` as compatibility props.

- [x] **Step 4: Render arbitrary handlers by side**

Group definitions by `Position`, render stable side containers, and use the definition directly:

```vue
<div
  v-for="side in handlerSides"
  :key="side.position"
  class="sailor-base-node__handlers"
  :class="`is-position-${side.position}`"
  :style="{ '--handler-count': side.handlers.length }"
>
  <div v-for="handler in side.handlers" :key="handler.id" class="sailor-base-node__handler">
    <BaseHandle :id="handler.id" :type="handler.type" :position="handler.position" variant="diamond" />
    <span>{{ handler.label }}<template v-if="handler.required">*</template></span>
    <QuickAddButton
      v-if="handler.quickAdd && handler.allowedNodes !== '*' && handler.allowedNodes.length > 0"
      :node-id="props.id!"
      :handle-id="handler.id"
      :target-handle-id="handler.id"
      :mode="handler.quickAdd"
      :allowed-nodes="handler.allowedNodes"
      :direction="handler.position === Position.Bottom ? 'down' : 'right'"
    />
  </div>
</div>
```

Also show quick-add for wildcard; implement a helper computed instead of using the illustrative condition literally:

```ts
const handlerAllowsQuickAdd = (handler: BaseNodeHandlerDefinition) =>
  !!handler.quickAdd && (handler.allowedNodes === '*' || handler.allowedNodes.length > 0)
```

- [x] **Step 5: Apply rounding and border classes**

Bind classes:

```vue
:class="[
  `is-rounded-${props.rounded ?? 'lg'}`,
  `is-border-${props.borderStyle ?? 'default'}`,
]"
```

Define stable values:

```css
.is-rounded-sm { border-radius: 4px; }
.is-rounded-md { border-radius: 8px; }
.is-rounded-lg { border-radius: 16px; }
.is-rounded-full { border-radius: 9999px; }
.is-border-dashed { border-style: dashed; }
```

- [x] **Step 6: Generalize QuickAddButton event payload**

Replace node-family fields with:

```ts
allowedNodes?: AllowedNodes

quickAddBus.emit({
  targetId: props.nodeId,
  targetHandle: props.targetHandleId ?? props.handleId,
  handlerId: props.targetHandleId ?? props.handleId,
  quickAddMode: props.mode,
  allowedNodes: props.allowedNodes ?? [],
  clientX: event.clientX,
  clientY: event.clientY,
  anchorRect,
})
```

Keep source quick-add unchanged.

- [x] **Step 7: Run tests and type-check**

```powershell
cd client-vue
node --test src/features/workflow-editor/components/__tests__/baseNode.contract.test.ts
npm run type-check
```

Expected: contract tests and type-check pass.

- [x] **Step 8: Commit BaseNode expansion**

```powershell
git add client-vue/src/features/workflow-editor/components/BaseNode.vue client-vue/src/features/workflow-editor/components/QuickAddButton.vue client-vue/src/features/workflow-editor/components/__tests__/baseNode.contract.test.ts
git commit -m "feat: add configurable handlers to base node"
```

---

### Task 3: Add BaseAdvancedNode Composition

**Files:**
- Create: `client-vue/src/features/workflow-editor/components/BaseAdvancedNode.vue`
- Modify: `client-vue/src/features/workflow-editor/components/__tests__/baseNode.contract.test.ts`

- [x] **Step 1: Add failing advanced-node contracts**

```ts
test('BaseAdvancedNode composes BaseNode and declares automatic organization', () => {
  const source = read('src/features/workflow-editor/components/BaseAdvancedNode.vue')
  assert.match(source, /import BaseNode/)
  assert.match(source, /autoOrganize/)
  assert.match(source, /handlers/)
  assert.match(source, /width="236px"/)
  assert.match(source, /height="100px"/)
  assert.match(source, /<slot name="icon-left"/)
})
```

- [x] **Step 2: Run test and verify RED**

Run Task 2's test command. Expected: FAIL because `BaseAdvancedNode.vue` does not exist.

- [x] **Step 3: Implement BaseAdvancedNode**

Create a thin composition that forwards attrs and the handle API:

```vue
<script setup lang="ts">
import type { BaseNodeHandlerDefinition } from './nodePresentation.types'
import BaseNode from './BaseNode.vue'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{
  id?: string
  title: string
  description?: string
  iconLeft?: string
  handlers?: BaseNodeHandlerDefinition[]
  autoOrganize?: boolean
  width?: number | string
  height?: number | string
}>(), {
  handlers: () => [],
  autoOrganize: false,
  width: '236px',
  height: '100px',
})
</script>

<template>
  <BaseNode v-bind="$attrs" v-bind="props" class="sailor-base-advanced-node">
    <template #icon>
      <div class="sailor-base-advanced-node__content">
        <div class="sailor-base-advanced-node__icon"><slot name="icon-left" /></div>
        <div class="sailor-base-advanced-node__copy">
          <span class="sailor-base-advanced-node__title">{{ props.title }}</span>
          <span v-if="props.description" class="sailor-base-advanced-node__description">{{ props.description }}</span>
        </div>
      </div>
    </template>
  </BaseNode>
</template>
```

Expose `data-auto-organize="true"` on the root when enabled so Canvas contracts can identify the declaration without letting the component mutate graph state.

- [x] **Step 4: Run test and type-check**

Run Task 2 Step 7 commands. Expected: pass.

- [x] **Step 5: Commit BaseAdvancedNode**

```powershell
git add client-vue/src/features/workflow-editor/components/BaseAdvancedNode.vue client-vue/src/features/workflow-editor/components/__tests__/baseNode.contract.test.ts
git commit -m "feat: add advanced workflow node primitive"
```

---

### Task 4: Drive Contextual Picker from allowedNodes

**Files:**
- Modify: `client-vue/src/features/workflow-editor/components/settings/allowedNodeSelectors.ts`
- Modify: `client-vue/src/features/workflow-editor/components/settings/__tests__/allowedNodeSelectors.test.ts`
- Modify: `client-vue/src/features/workflow-editor/components/settings/AddNodePanel.vue`
- Modify: `client-vue/src/features/workflow-editor/components/SailorWorkflowCanvas.vue`
- Modify: `client-vue/src/features/workflow-editor/components/settings/__tests__/agentAddNode.contract.test.ts`

- [x] **Step 1: Add failing capability and panel contracts**

Test capability extraction from existing generic plugin metadata:

```ts
test('plugin capabilities derive from manifests instead of plugin names', () => {
  assert.deepEqual(pluginAllowedNodeCapabilities(chatModelPlugin), ['chat-model'])
  assert.deepEqual(pluginAllowedNodeCapabilities(memoryPlugin), ['memory-store'])
  assert.deepEqual(pluginAllowedNodeCapabilities(toolPlugin), ['agent-tool'])
  assert.deepEqual(pluginAllowedNodeCapabilities(embeddingPlugin), ['embedding-provider'])
  assert.deepEqual(pluginAllowedNodeCapabilities(vectorPlugin), ['vector-store-provider'])
})
```

Update `agentAddNode.contract.test.ts` to require `allowedNodes` in the overlay and forbid node-family picker props:

```ts
assert.match(canvas, /allowedNodes: AllowedNodes/)
assert.match(panel, /allowedNodes\?: AllowedNodes/)
assert.match(panel, /allowedNodeSelectorsPermitPreset/)
assert.match(panel, /allowedNodeSelectorsPermitPlugin/)
assert.doesNotMatch(panel, /agentConfigHandle\?:/)
assert.doesNotMatch(panel, /vectorConfigHandle\?:/)
```

- [x] **Step 2: Run tests and verify RED**

```powershell
cd client-vue
node --test src/features/workflow-editor/components/settings/__tests__/allowedNodeSelectors.test.ts src/features/workflow-editor/components/settings/__tests__/agentAddNode.contract.test.ts
```

Expected: FAIL because the picker still branches on Agent and Vector context fields.

- [x] **Step 3: Derive generic capabilities from PluginSummary**

Implement `pluginAllowedNodeCapabilities(plugin)` using existing manifest contracts:

```ts
export function pluginAllowedNodeCapabilities(plugin: PluginSummary): string[] {
  const capabilities: string[] = []
  const agent = plugin.manifest.metadata.agentCapabilities
  if (agent?.chatModel?.enabled) capabilities.push('chat-model')
  if (agent?.memoryStore?.enabled) capabilities.push('memory-store')
  if (Object.values(plugin.manifest.methods).some((method) => method.agentTool?.enabled)) capabilities.push('agent-tool')
  if (buildEmbeddingProviderItems({ plugins: [plugin] }).length > 0) capabilities.push('embedding-provider')
  if (isVectorStoreProvider(plugin)) capabilities.push('vector-store-provider')
  return capabilities
}
```

Keep this dependency direction picker-only; plugins remain unaware of workflow UI.

- [x] **Step 4: Replace contextual props with allowedNodes**

Change the panel prop to:

```ts
allowedNodes?: AllowedNodes
```

Compute candidates once:

```ts
const effectiveAllowedNodes = computed<AllowedNodes>(() => props.allowedNodes ?? '*')
const pickerPlugins = computed(() => (plugins.value ?? []).filter((plugin) =>
  allowedNodeSelectorsPermitPlugin(effectiveAllowedNodes.value, {
    id: plugin.id,
    capabilities: pluginAllowedNodeCapabilities(plugin),
  }),
))
const pickerPresets = computed(() => allPresets.value.filter((preset) =>
  allowedNodeSelectorsPermitPreset(effectiveAllowedNodes.value, {
    id: preset.id,
    nodeType: preset.nodeType,
  }),
))
```

Preserve normal AddNodePanel behavior by passing `'*'` only for the unrestricted panel and continuing to apply `filterDefaultPickerPresets` there.

- [x] **Step 5: Carry generic handler context through Canvas**

Replace Agent/Vector fields with:

```ts
let quickAddHandlerId: string | null = null
let quickAddAllowedNodes: AllowedNodes = '*'

const addNodePickerOverlay = ref<{
  left: number
  top: number
  secondarySide: AddNodePickerSecondarySide
  handlerId: string | null
  allowedNodes: AllowedNodes
} | null>(null)
```

Pass both values to `AddNodePanel`. Continue connecting the created node to
`quickAddTargetId` and `quickAddTargetHandle`; no workflow edge format changes.

- [x] **Step 6: Run tests and type-check**

Run Task 4 Step 2, then `npm run type-check`. Expected: pass.

- [x] **Step 7: Commit generic contextual picker**

```powershell
git add client-vue/src/features/workflow-editor/components/settings/allowedNodeSelectors.ts client-vue/src/features/workflow-editor/components/settings/__tests__/allowedNodeSelectors.test.ts client-vue/src/features/workflow-editor/components/settings/AddNodePanel.vue client-vue/src/features/workflow-editor/components/SailorWorkflowCanvas.vue client-vue/src/features/workflow-editor/components/settings/__tests__/agentAddNode.contract.test.ts
git commit -m "refactor: drive quick add from allowed node selectors"
```

---

### Task 5: Generic Advanced-Node Auto Layout

**Files:**
- Create: `client-vue/src/features/workflow-editor/layout/advancedNodeLayout.ts`
- Create: `client-vue/src/features/workflow-editor/layout/__tests__/advancedNodeLayout.test.ts`
- Modify: `client-vue/src/features/workflow-editor/components/SailorWorkflowCanvas.vue`
- Modify: `client-vue/src/features/workflow-editor/components/settings/__tests__/agentAddNode.contract.test.ts`

- [x] **Step 1: Write failing deterministic layout tests**

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { getAdvancedChildPosition } from '../advancedNodeLayout.ts'

test('bottom handlers place circular children below and centered by handler index', () => {
  assert.deepEqual(getAdvancedChildPosition({
    parent: { x: 500, y: 200, width: 236, height: 100 },
    side: 'bottom',
    handlerIndex: 0,
    handlerCount: 3,
    siblingIndex: 0,
  }), { x: 400, y: 385 })
})

test('repeated children use deterministic grid rows', () => {
  const first = getAdvancedChildPosition({ parent, side: 'bottom', handlerIndex: 2, handlerCount: 3, siblingIndex: 0 })
  const fifth = getAdvancedChildPosition({ parent, side: 'bottom', handlerIndex: 2, handlerCount: 3, siblingIndex: 4 })
  assert.ok(fifth.y > first.y)
})
```

Use explicit constants in the test fixture matching the implementation constants below.

- [x] **Step 2: Run test and verify RED**

```powershell
cd client-vue
node --test src/features/workflow-editor/layout/__tests__/advancedNodeLayout.test.ts
```

Expected: FAIL because the layout module does not exist.

- [x] **Step 3: Implement pure layout**

Use exported constants and calculate positions without Vue state:

```ts
export const ADVANCED_CHILD_SIZE = 100
export const ADVANCED_LAYOUT = {
  primaryGap: 85,
  crossGap: 65,
  rowGap: 85,
  maxPerRow: 4,
} as const

export function getAdvancedChildPosition(input: AdvancedChildPositionInput): { x: number; y: number } {
  const trackCenter = input.parent.x + ((input.handlerIndex + 0.5) / input.handlerCount) * input.parent.width
  const column = input.siblingIndex % ADVANCED_LAYOUT.maxPerRow
  const row = Math.floor(input.siblingIndex / ADVANCED_LAYOUT.maxPerRow)
  return {
    x: trackCenter - ADVANCED_CHILD_SIZE / 2 + column * (ADVANCED_CHILD_SIZE + ADVANCED_LAYOUT.crossGap),
    y: input.parent.y + input.parent.height + ADVANCED_LAYOUT.primaryGap + row * (ADVANCED_CHILD_SIZE + ADVANCED_LAYOUT.rowGap),
  }
}
```

Implement equivalent transforms for top, left, and right sides so the public API is complete.

- [x] **Step 4: Replace Agent-specific layout in Canvas**

Remove `AGENT_CONFIG_LAYOUT`, `getAgentConfigLayoutPosition`, and `arrangeAgentConfigNodes`. Add a generic call that receives parent handler definitions and existing sibling count:

```ts
function getAdvancedConfigNodePosition(
  targetId: string,
  handler: BaseNodeHandlerDefinition,
  handlerIndex: number,
  handlerCount: number,
): { x: number; y: number } {
  const parent = getAdvancedParentBounds(targetId)
  const siblingIndex = countHandlerChildren(targetId, handler.id)
  return getAdvancedChildPosition({ parent, side: sideFromPosition(handler.position), handlerIndex, handlerCount, siblingIndex })
}
```

Store node presentation declarations in a frontend registry keyed by workflow node type; do not put Vue `Position` values in persisted workflow JSON.

- [x] **Step 5: Run layout, canvas contracts, and type-check**

```powershell
cd client-vue
node --test src/features/workflow-editor/layout/__tests__/advancedNodeLayout.test.ts src/features/workflow-editor/components/settings/__tests__/agentAddNode.contract.test.ts
npm run type-check
```

Expected: pass and no Agent-only layout constants remain.

- [x] **Step 6: Commit generic auto-layout**

```powershell
git add client-vue/src/features/workflow-editor/layout/advancedNodeLayout.ts client-vue/src/features/workflow-editor/layout/__tests__/advancedNodeLayout.test.ts client-vue/src/features/workflow-editor/components/SailorWorkflowCanvas.vue client-vue/src/features/workflow-editor/components/settings/__tests__/agentAddNode.contract.test.ts
git commit -m "refactor: generalize advanced node child layout"
```

---

### Task 6: Migrate AI Agent, Vector Store, and Circular Child Nodes

**Files:**
- Modify: `client-vue/src/features/workflow-editor/components/nodes/AiAgentNode.vue`
- Modify: `client-vue/src/features/workflow-editor/components/nodes/VectorStoreNode.vue`
- Modify: `client-vue/src/features/workflow-editor/components/nodes/AiModelNode.vue`
- Modify: `client-vue/src/features/workflow-editor/components/nodes/AiMemoryNode.vue`
- Modify: `client-vue/src/features/workflow-editor/components/nodes/AiToolNode.vue`
- Modify: `client-vue/src/features/workflow-editor/components/nodes/EmbeddingsNode.vue`
- Modify: `client-vue/src/features/workflow-editor/components/nodes/TextDatasetNode.vue`
- Modify: `client-vue/src/features/workflow-editor/components/nodes/FileDatasetNode.vue`
- Modify: `client-vue/src/features/workflow-editor/components/nodes/DatabaseDatasetNode.vue`
- Modify: `client-vue/src/features/workflow-editor/components/nodes/__tests__/agentNodes.contract.test.ts`
- Modify: `client-vue/src/features/workflow-editor/components/nodes/__tests__/retrievalNodes.contract.test.ts`

- [x] **Step 1: Write failing migration contracts**

Require both parent nodes to use BaseAdvancedNode and declare selectors:

```ts
assert.match(agent, /BaseAdvancedNode/)
assert.match(agent, /capability:chat-model/)
assert.match(agent, /preset:sqlite-memory/)
assert.match(agent, /capability:memory-store/)
assert.match(agent, /capability:agent-tool/)
assert.match(agent, /auto-organize/)

assert.match(vector, /BaseAdvancedNode/)
assert.match(vector, /capability:embedding-provider/)
assert.match(vector, /node:embeddings/)
assert.match(vector, /node:text-dataset/)
assert.match(vector, /node:file-dataset/)
assert.match(vector, /node:database-dataset/)
```

For each child component assert `rounded="full"`, `input-position="top"`, equal `100px` dimensions, and removal of left-target positioning.

- [x] **Step 2: Run tests and verify RED**

```powershell
cd client-vue
node --test src/features/workflow-editor/components/nodes/__tests__/agentNodes.contract.test.ts src/features/workflow-editor/components/nodes/__tests__/retrievalNodes.contract.test.ts
```

Expected: FAIL because parents still duplicate advanced markup and children are square/left-connected.

- [x] **Step 3: Migrate AI Agent declarations**

Use one computed definition:

```ts
const handlers: BaseNodeHandlerDefinition[] = [
  { id: 'chatModel', label: 'Chat Model', type: 'target', position: Position.Bottom, required: true, quickAdd: 'agent-config', allowedNodes: ['capability:chat-model'] },
  { id: 'memory', label: 'Memory', type: 'target', position: Position.Bottom, quickAdd: 'agent-config', allowedNodes: ['preset:sqlite-memory', 'capability:memory-store'] },
  { id: 'tool', label: 'Tool', type: 'target', position: Position.Bottom, quickAdd: 'agent-config', allowedNodes: ['capability:agent-tool'] },
]
```

Render `BaseAdvancedNode` with `auto-organize`, existing avatar slot, title, and `Tools Agent` description. Delete duplicated handle and card CSS.

- [x] **Step 4: Migrate Vector Store declarations**

```ts
const handlers: BaseNodeHandlerDefinition[] = [
  { id: 'embedding', label: 'Embedding', type: 'target', position: Position.Bottom, required: true, quickAdd: 'vector-config', allowedNodes: ['capability:embedding-provider', 'node:embeddings'] },
  { id: 'document', label: 'Document', type: 'target', position: Position.Bottom, quickAdd: 'vector-config', allowedNodes: ['node:text-dataset', 'node:file-dataset', 'node:database-dataset'] },
]
```

Keep provider icon resolution and pass its rendered icon through `#icon-left`. Delete duplicated handle and card CSS.

- [x] **Step 5: Convert configuration children to circular top-input nodes**

For AI Model, AI Memory, AI Tool, Embeddings, and the three Dataset nodes:

```vue
<BaseNode
  ...
  has-target
  input-position="top"
  rounded="full"
  width="100px"
  height="100px"
/>
```

Ensure their primary icon remains centered and labels remain outside below. Preserve source handles only where workflow semantics require normal output.

- [x] **Step 6: Run focused tests and type-check**

Run Task 6 Step 2 and `npm run type-check`. Expected: pass.

- [x] **Step 7: Commit node migration**

```powershell
git add client-vue/src/features/workflow-editor/components/nodes/AiAgentNode.vue client-vue/src/features/workflow-editor/components/nodes/VectorStoreNode.vue client-vue/src/features/workflow-editor/components/nodes/AiModelNode.vue client-vue/src/features/workflow-editor/components/nodes/AiMemoryNode.vue client-vue/src/features/workflow-editor/components/nodes/AiToolNode.vue client-vue/src/features/workflow-editor/components/nodes/EmbeddingsNode.vue client-vue/src/features/workflow-editor/components/nodes/TextDatasetNode.vue client-vue/src/features/workflow-editor/components/nodes/FileDatasetNode.vue client-vue/src/features/workflow-editor/components/nodes/DatabaseDatasetNode.vue client-vue/src/features/workflow-editor/components/nodes/__tests__/agentNodes.contract.test.ts client-vue/src/features/workflow-editor/components/nodes/__tests__/retrievalNodes.contract.test.ts
git commit -m "refactor: migrate agent and vector nodes to advanced base"
```

---

### Task 7: Generic Dashed Configuration Edges and Full Verification

**Files:**
- Modify: `client-vue/src/features/workflow-editor/components/BaseEdge.vue`
- Modify: `client-vue/src/features/workflow-editor/components/nodes/__tests__/agentNodes.contract.test.ts`
- Modify: `client-vue/src/features/workflow-editor/components/nodes/__tests__/retrievalNodes.contract.test.ts`
- Modify only if QA finds defects: files from Tasks 2-6.

- [x] **Step 1: Write failing edge contracts**

```ts
test('declared configuration edges use dashed presentation for Agent and Vector Store', () => {
  const source = read('../BaseEdge.vue')
  assert.match(source, /CONFIGURATION_TARGET_HANDLES/)
  for (const handle of ['chatModel', 'memory', 'tool', 'embedding', 'document']) {
    assert.match(source, new RegExp(`'${handle}'`))
  }
  assert.match(source, /strokeDasharray/)
  assert.doesNotMatch(source, /AGENT_CONFIG_TARGET_HANDLES/)
})
```

- [x] **Step 2: Run edge test and verify RED**

Run the two node contract files. Expected: FAIL because Vector Store config edges are not recognized as dashed config edges.

- [x] **Step 3: Generalize configuration-edge recognition**

Replace Agent-only naming:

```ts
const CONFIGURATION_TARGET_HANDLES = new Set([
  'chatModel',
  'memory',
  'tool',
  'embedding',
  'document',
])
const isConfigurationEdge = computed(() =>
  CONFIGURATION_TARGET_HANDLES.has(String(props.targetHandleId ?? props.data?.targetHandle ?? '')),
)
```

Add dashed styling without overriding execution colors:

```ts
if (isConfigurationEdge.value) {
  style.strokeDasharray = '6 6'
  style.strokeLinecap = 'round'
}
```

Use configuration bezier routing and hide the ordinary edge toolbar for all configuration edges.

- [x] **Step 4: Run complete focused frontend matrix**

```powershell
cd client-vue
node --test src/features/workflow-editor/components/__tests__/baseNode.contract.test.ts src/features/workflow-editor/components/settings/__tests__/allowedNodeSelectors.test.ts src/features/workflow-editor/layout/__tests__/advancedNodeLayout.test.ts src/features/workflow-editor/components/settings/__tests__/addNodePickerModel.test.ts src/features/workflow-editor/components/settings/__tests__/agentAddNode.contract.test.ts src/features/workflow-editor/components/nodes/__tests__/agentNodes.contract.test.ts src/features/workflow-editor/components/nodes/__tests__/retrievalNodes.contract.test.ts src/features/workflow-editor/components/settings/editors/__tests__/retrievalEditors.contract.test.ts
```

Expected: 0 failures.

- [x] **Step 5: Run production build**

```powershell
cd client-vue
npm run build
```

Expected: Vue type-check and Vite build complete successfully. Existing chunk-size warnings are acceptable; new errors are not.

- [x] **Step 6: Perform browser QA**

Start server on `23801` and client on `23802`. Verify:

- AI Agent and Vector Store share the advanced-card layout.
- Their normal input/output handles remain correctly positioned.
- Chat Model quick-add shows only chat-model-capable plugins.
- Memory quick-add shows SQLite Memory and memory-store plugins.
- Tool quick-add shows only agent-tool-capable plugin methods.
- Embedding quick-add shows embedding providers or the Embeddings fallback.
- Document quick-add shows only Text, File, and Database Dataset.
- Added configuration children are circular with their target handles on top.
- Agent and Vector Store configuration edges are dashed.
- Added children occupy deterministic non-overlapping positions.
- Normal AddNodePanel continues hiding configuration-only nodes.

- [x] **Step 7: Stop all QA Node processes**

```powershell
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
```

Verify no Node processes remain before reporting completion.

- [x] **Step 8: Commit edge and QA corrections**

```powershell
git add client-vue/src/features/workflow-editor/components/BaseEdge.vue client-vue/src/features/workflow-editor/components/nodes/__tests__/agentNodes.contract.test.ts client-vue/src/features/workflow-editor/components/nodes/__tests__/retrievalNodes.contract.test.ts
git commit -m "feat: render configuration edges as dashed"
```

If QA required corrections, include only the corrected files in this commit and describe them beneath this task before marking it complete.

QA correction: adjacent handler tracks were originally distributed inside the parent width, causing 100px circular children to overlap. The layout now centers tracks around the parent using `ADVANCED_CHILD_SIZE + crossGap`, with a regression test covering adjacent handlers.

---

## Completion Criteria

- [x] `BaseNode` supports configurable positions, rounding, border style, icon/title/description, and arbitrary restricted handlers.
- [x] `BaseAdvancedNode` composes BaseNode and declares auto-organization.
- [x] `allowedNodes: []` denies all entries and hides quick-add; `'*'` permits all entries.
- [x] Namespaced node, preset, plugin, and capability selectors work from one pure matcher.
- [x] AI Agent and Vector Store use BaseAdvancedNode without duplicated handle layout CSS.
- [x] Their configuration children are circular with top target handles.
- [x] Configuration children auto-organize without continuous repositioning after manual drag.
- [x] Agent and Vector Store configuration edges are dashed.
- [x] Existing workflow JSON and handle IDs remain compatible.
- [x] Focused tests, type-check, production build, browser QA, and Node-process cleanup pass.
