# Forge Client — Refactoring Implementation Plan

> Following the rules defined in `instructions.md`.
> This plan is incremental (5 passes). Each pass is a separate, reviewable diff. No big-bang rewrites.

---

## 0. Executive Summary

The Forge client has **strong bones** — shadcn/ui, Tailwind v4 CSS-first tokens, React Flow, and a feature-based folder convention. But it has accumulated significant technical debt across every quality axis defined in `instructions.md`:

| Anti-Pattern | Severity | File Count |
|---|---|---|
| **God Components** (>120 LOC) | 🔴 Critical | 33 files |
| **`as any` casts** (no type guards) | 🔴 Critical | 45+ occurrences |
| **Magic values** (arbitrary sizes, shadows, colors) | 🟠 High | Every component file |
| **Inline logic in JSX** (no hook extraction) | 🟠 High | 12+ components |
| **No Zod schemas** at fetch boundaries | 🟠 High | All API hooks |
| **Modified shadcn components** | 🟡 Medium | Unknown (need reinstall) |
| **Missing `zod` dependency** | 🟡 Medium | package.json |

---

## 1. Audit Pass — Violations by Category

### 1.1 God Components (exceeds ~120-line budget)

| File | Lines | Diagnosis |
|---|---|---|
| `WorkflowEditor.tsx` | **591** | State, effects, handlers, save logic, node creation, version bumping, and 170 lines of JSX in ONE file. Classic god component. |
| `ActionNodeRenderer.tsx` | **468** | 7 inline sub-components (`PluginBody`, `CodeBody`, `IfBody`, etc.) + `StatusIndicator` + `RunningOverlay` + the main renderer. Should be 8 separate files. |
| `TriggerEditor.tsx` | **422** | Schema builder + trigger type selector + parameter forms all in one. |
| `WorkflowsList.tsx` | **391** | List + card + import dialog + run panel orchestration. Contains inline `WorkflowModuleCard` sub-component. |
| `PluginEditor.tsx` | **385** | Variable mapping + parameter rendering + upstream traversal. |
| `AddNodeOverlay.tsx` | **340** | Plugin node picker + logic node picker + search. |
| `PluginMenuMethods.tsx` | **295** | Form rendering + execution + output display. |
| `NodeEditorPanel.tsx` | **271** | Thin shell but still oversized. |
| `WorkflowLogsPanel.tsx` | **260** | List view + detail view in one component with `renderDetails()` as an unextracted function. |
| `HttpEditor.tsx` | **255** | Headers builder + body editor + response config. |
| `PluginMenuAuth.tsx` | **211** | OAuth flow + API key forms + status display. |
| `ForgeProvider.tsx` | **199** | View routing + plugins cache + active plugin + OAuth popup. Does too much for a context. |
| `CardRenderer.tsx` | **196** | Complex card layout with nested rendering logic. |
| `PluginMenu.tsx` | **187** | Header + custom tab bar + footer in one file. |
| `WorkflowEditorDock.tsx` | **175** | Toolbar with state-dependent button logic. |
| `TriggerNodeRenderer.tsx` | **174** | Inline `StatusIndicator` + `RunningOverlay` duplicated from ActionNodeRenderer. |

### 1.2 `as any` — Implicit Type Safety Holes

**45+ casts** found across the codebase. Worst offenders:

- `PluginEditor.tsx`: **17 casts** — `(paramVal as any).type`, `(paramVal as any).enum`, `(paramVal as any)["x-input-type"]`, etc. No typed schema interface for plugin params.
- `WorkflowEditor.tsx`: **5 casts** — `workflow.trigger as any`, `nodeData as any`, `(result as any)?.executionId`.
- `NodeEditorPanel.tsx`: **5 casts** — `(node?.data as any)?.type`, `(node.data as any).params`.
- `TriggerEditor.tsx`: **6 casts** — `(field as any).type`, `val as any`.
- `useExecutePlugin.ts`: **5 casts** — `(data as any)?.download`.

### 1.3 Magic Values (hardcoded in className, not using tokens)

Pervasive throughout the entire codebase:

- **Arbitrary font sizes**: `text-[9px]`, `text-[10px]`, `text-[11px]`, `text-[13px]`, `text-[14px]`, `text-[15px]` — used hundreds of times in lieu of a typographic scale.
- **Arbitrary shadows**: `shadow-[0_0_20px_rgba(...)]`, `shadow-[0_0_12px_2px_rgba(...)]`, `shadow-[0_0_8px_#10b981]`, `shadow-[0_4px_12px_rgba(...)]` — no design tokens.
- **Arbitrary border-radius**: `rounded-[2rem]`, `rounded-[2.5rem]`, `rounded-[3rem]`, `rounded-[1.5rem]` — not using `--radius` token.
- **Arbitrary spacing/sizing**: `max-w-[300px]`, `w-[400px]`, `w-[450px]`, `w-[55vw]`, `h-[600px]`, `max-h-[300px]`, `min-h-[40px]` — no size scale tokens.
- **Inline styles**: `style={{ backgroundColor: "#10b981" }}`, `style={{ stroke: "var(--foreground)" }}`.

### 1.4 Duplicated Logic

- `StatusIndicator` + `RunningOverlay` → duplicated word-for-word in `ActionNodeRenderer.tsx` and `TriggerNodeRenderer.tsx`.
- `STATUS_RING` map → duplicated in both node renderers.
- Loading spinner pattern (`<Loader2 className="animate-spin" />` + blur glow) → copy-pasted in 5+ places.
- Dropdown/close pattern: `setSelectedNodeId(null); setIsAddingNode(false); setIsEditingSettings(false); ...` — repeated 6 times in `WorkflowEditor.tsx`.

### 1.5 Prop Drilling

- `WorkflowEditor` drills `nodes`, `edges`, `setNodes`, `setEdges` through `NodeEditorPanel` → individual editors. 8 props on `NodeEditorPanel`.
- `WorkflowEditorDock` receives **14 props** (exceeds 12-max limit).

### 1.6 Missing Dependencies

- **`zod`** — not in `package.json`. Required by `instructions.md` for all fetch boundaries.

### 1.7 shadcn Components (potentially modified)

User confirmed shadcn components may have been manually modified. Per `instructions.md`, these should be reinstalled to pristine state and extended via wrappers/cva only:

- `button.tsx`, `card.tsx`, `dialog.tsx`, `combobox.tsx`, `dropdown-menu.tsx`, `input.tsx`, `textarea.tsx`, `switch.tsx`, `tabs.tsx`, `alert-dialog.tsx`, `collapsible.tsx`, `separator.tsx`, `table.tsx`, `input-group.tsx`
- `forge-toaster.tsx` — custom, keep as-is.

---

## 2. Token Audit — CSS Variables Needed

### 2.1 Typography Scale (add to `app.css` → `@theme`)

```css
:root {
  /* Forge Typography Scale */
  --text-micro:  9px;    /* labels, badges */
  --text-mini:   10px;   /* metadata, captions */
  --text-tiny:   11px;   /* secondary text */
  --text-small:  13px;   /* body small */
  --text-body:   14px;   /* default body */
  --text-base:   15px;   /* headings small */
}
```

Then via `@theme inline`:
```css
@theme inline {
  --font-size-micro: var(--text-micro);
  --font-size-mini:  var(--text-mini);
  --font-size-tiny:  var(--text-tiny);
  --font-size-small: var(--text-small);
  --font-size-body:  var(--text-body);
  --font-size-base:  var(--text-base);
}
```

Usage: `text-micro`, `text-mini`, `text-tiny` instead of `text-[9px]`, `text-[10px]`, `text-[11px]`.

### 2.2 Execution Status Tokens

```css
:root {
  /* Execution States */
  --status-idle:        transparent;
  --status-running:     var(--color-orange-500);
  --status-success:     var(--color-emerald-500);
  --status-failed:      var(--color-destructive);

  /* Glow Effects */
  --glow-running:   0 0 20px rgba(249, 115, 22, 0.3);
  --glow-success:   0 0 12px 2px rgba(16, 185, 129, 0.2);
  --glow-failed:    0 0 12px 2px rgba(239, 68, 68, 0.2);
}
```

### 2.3 Layout Tokens

```css
:root {
  /* Panel widths */
  --panel-editor-width: 400px;
  --panel-logs-width:   450px;
  --node-width:         300px;

  /* Border Radius Scale (extending existing --radius) */
  --radius-panel: 2.5rem;
  --radius-card:  2rem;
  --radius-button: var(--radius-xl);
}
```

---

## 3. File Map

### Pass 1: Foundation (Tokens + Dependencies + shadcn Reset)
| Action | File | Purpose |
|---|---|---|
| MODIFY | `package.json` | Add `zod` dependency |
| MODIFY | `app/app.css` | Add typography scale, execution status, and layout tokens |
| RUN | `npx shadcn@latest add ...` | Reinstall all shadcn components to pristine state |

### Pass 2: Shared Extraction (DRY)
| Action | File | Purpose |
|---|---|---|
| NEW | `app/modules/forge/workflows/components/nodes/shared/StatusIndicator.tsx` | Extracted from both node renderers |
| NEW | `app/modules/forge/workflows/components/nodes/shared/RunningOverlay.tsx` | Extracted from both node renderers |
| NEW | `app/modules/forge/workflows/components/nodes/shared/execution-styles.ts` | `STATUS_RING` map shared |
| NEW | `app/shared/components/LoadingSpinner.tsx` | Centralized loading spinner |
| MODIFY | `ActionNodeRenderer.tsx` | Import from shared, remove inline defs |
| MODIFY | `TriggerNodeRenderer.tsx` | Import from shared, remove inline defs |

### Pass 3: God Component Splits
| Action | File | Purpose |
|---|---|---|
| | **WorkflowEditor (591 → ~100 + hooks)** | |
| NEW | `workflows/hooks/useWorkflowEditor.ts` | All state, effects, handlers |
| NEW | `workflows/hooks/useWorkflowSave.ts` | Save logic + version bumping |
| NEW | `workflows/hooks/useWorkflowNodeFactory.ts` | `handleCreateNode` + `handleCreateLogicNode` |
| NEW | `workflows/hooks/useWorkflowPanelState.ts` | Panel open/close coordination |
| MODIFY | `WorkflowEditor.tsx` | JSX-only shell, imports hooks |
| | **ActionNodeRenderer (468 → ~80 + sub-components)** | |
| NEW | `nodes/bodies/PluginBody.tsx` | Plugin-specific body content |
| NEW | `nodes/bodies/CodeBody.tsx` | Code block body |
| NEW | `nodes/bodies/IfBody.tsx` | Conditional body |
| NEW | `nodes/bodies/LoopBody.tsx` | Loop body |
| NEW | `nodes/bodies/SubWorkflowBody.tsx` | Sub-workflow body |
| NEW | `nodes/bodies/HttpBody.tsx` | HTTP body |
| NEW | `nodes/bodies/EventBody.tsx` | Event body |
| NEW | `nodes/bodies/index.ts` | Barrel export + registry |
| MODIFY | `ActionNodeRenderer.tsx` | Import bodies from registry |
| | **WorkflowsList (391 → ~80 + sub-components)** | |
| NEW | `workflows/components/WorkflowModuleCard.tsx` | Extracted card component |
| NEW | `workflows/components/ImportWorkflowDialog.tsx` | Extracted import dialog |
| NEW | `workflows/hooks/useWorkflowsList.ts` | List state + handlers |
| MODIFY | `WorkflowsList.tsx` | JSX-only shell |
| | **WorkflowLogsPanel (260 → ~80 + detail view)** | |
| NEW | `workflows/components/ExecutionDetailView.tsx` | Extracted `renderDetails()` |
| NEW | `workflows/components/ExecutionListItem.tsx` | Extracted list row |
| MODIFY | `WorkflowLogsPanel.tsx` | Orchestrator only |
| | **Other splits** | |
| NEW | `workflows/components/WorkflowEditorDock/index.tsx` | Cleaned up dock |
| NEW | `workflows/components/WorkflowEditorDock/hooks/useEditorDock.ts` | Dock state logic |

### Pass 4: Type Safety
| Action | File | Purpose |
|---|---|---|
| NEW | `app/shared/schemas/api.ts` | Base API response Zod schema |
| NEW | `app/modules/forge/plugins/schemas/plugin.ts` | Plugin Zod schemas |
| NEW | `app/modules/forge/workflows/schemas/workflow.ts` | Workflow Zod schemas |
| NEW | `app/modules/forge/workflows/schemas/execution.ts` | Execution log Zod schema |
| NEW | `app/modules/forge/plugins/types/plugin-params.ts` | Typed interface for plugin parameter schemas |
| MODIFY | `shared/helpers/apiHandler.ts` | Accept optional Zod schema param for validation |
| MODIFY | all hooks in `plugins/hooks/` | Add Zod parsing at response boundary |
| MODIFY | all hooks in `workflows/hooks/` | Add Zod parsing at response boundary |
| MODIFY | `PluginEditor.tsx` | Replace `as any` with typed param interface |
| MODIFY | `NodeEditorPanel.tsx` | Replace `as any` with discriminated union types |
| MODIFY | `TriggerEditor.tsx` | Replace `as any` with typed schema |

### Pass 5: Polish (Tokens + Performance)
| Action | File | Purpose |
|---|---|---|
| MODIFY | All component `.tsx` files | Replace `text-[9px]` → `text-micro`, `text-[10px]` → `text-mini`, etc. |
| MODIFY | All component `.tsx` files | Replace arbitrary shadows → token references |
| MODIFY | All component `.tsx` files | Replace arbitrary radius → `rounded-panel`, `rounded-card`, etc. |
| ADD | `React.memo()` | On leaf components: `PluginBody`, `CodeBody`, `WorkflowModuleCard`, `ExecutionListItem`, `StatusIndicator` |
| ADD | `useCallback` wraps | Ensure all handler props are memoized |

---

## 4. Component Tree (Post-Refactor)

```
ForgeProvider
└── GlobalView
    ├── ExplorerView
    │   ├── ExplorerDashboardDock
    │   └── PluginMenu (Dialog)
    │       ├── PluginMenuAuth
    │       └── PluginMenuMethods
    └── WorkflowsView
        ├── WorkflowDashboardDock
        ├── WorkflowModuleCard          ← NEW (extracted)
        ├── ImportWorkflowDialog        ← NEW (extracted)
        ├── RunWorkflowPanel
        ├── WorkflowLogsPanel
        │   ├── ExecutionListItem       ← NEW (extracted)
        │   └── ExecutionDetailView     ← NEW (extracted)
        └── WorkflowEditor (Dialog)
            ├── WorkflowEditorDock
            ├── WorkflowSettingsPanel
            ├── AddNodeOverlay
            ├── RunWorkflowPanel
            ├── WorkflowLogsPanel
            ├── NodeEditorPanel
            │   ├── NodeOutputPanel
            │   └── NODE_EDITOR_REGISTRY[editorKey]
            └── ReactFlow
                ├── ActionNodeRenderer
                │   ├── StatusIndicator     ← NEW (shared)
                │   ├── RunningOverlay      ← NEW (shared)
                │   └── bodies/*            ← NEW (7 files)
                └── TriggerNodeRenderer
                    ├── StatusIndicator     ← shared
                    └── RunningOverlay      ← shared
```

---

## 5. Migration Path (Incremental Diffs)

### Pass 1: Foundation
1. `npm install zod`
2. Add typography + execution + layout tokens to `app.css`
3. Reinstall shadcn components: `npx shadcn@latest add button card dialog input textarea switch tabs collapsible separator dropdown-menu alert-dialog table --overwrite`
4. Verify nothing broke → commit

### Pass 2: Shared Extraction
1. Extract `StatusIndicator`, `RunningOverlay`, `execution-styles.ts`
2. Extract `LoadingSpinner`
3. Update imports in both node renderers
4. Verify rendering → commit

### Pass 3: God Component Splits
1. Split `WorkflowEditor` → hooks (start with `useWorkflowPanelState`, then `useWorkflowSave`, then `useWorkflowNodeFactory`, then `useWorkflowEditor`)
2. Split `ActionNodeRenderer` → body components
3. Split `WorkflowsList` → card + import dialog + hook
4. Split `WorkflowLogsPanel` → detail + list item
5. Each split is verified independently → commit per split

### Pass 4: Type Safety
1. Add Zod schemas for API responses
2. Update `handleApi` to accept optional schema validation
3. Update hooks one by one (no batch)
4. Create `PluginParamSchema` typed interface, eliminate `as any` from `PluginEditor`
5. Create discriminated union for `WorkflowNodeData`, eliminate `as any` from `NodeEditorPanel`
6. Verify TypeScript compiles without error → commit per module

### Pass 5: Token Pass
1. Create search-and-replace mapping for typography tokens
2. Apply across all components
3. Replace arbitrary shadows with CSS variables
4. Replace arbitrary radius-es with token classes
5. Add `React.memo` to leaf components
6. Full visual regression check in browser → commit

---

## 6. Open Questions

> [!IMPORTANT]
> **shadcn Reinstall**: Running `npx shadcn@latest add --overwrite` will reset all UI components to pristine state. Any custom modifications (e.g. to `combobox.tsx`, `dialog.tsx`, custom `forge-toaster.tsx`) will be lost. Should I:
> - (A) Reinstall all and re-apply your customizations via wrapper components?
> - (B) Reinstall only the ones you haven't modified and skip the rest?
> - (C) Skip the reinstall for now and do it in a separate dedicated pass?

> [!WARNING]
> **`any` Elimination Timeline**: There are 45+ `as any` casts. Full elimination requires typed schemas for plugin parameters (a backend contract). Is the backend likely to change or should I treat the current JSON schema shape as stable?

> [!NOTE]
> **Feature CSS Tokens**: The instructions specify `src/features/<feature>/styles/tokens.css` for feature-scoped tokens. Our current structure uses `app/modules/forge/...`. Should I:
> - (A) Rename `modules` → `features` to match the convention exactly?
> - (B) Keep `modules` but still add `styles/tokens.css` files within each?

---

## 7. Verification Plan

### Automated
```bash
# TypeScript strict compilation
cd client && npx tsc --noEmit

# Lint for remaining `as any` after Pass 4
grep -r "as any" app/ --include="*.tsx" --include="*.ts" | wc -l   # target: 0
```

### Manual
- Start dev server, navigate to Explorer → open a plugin → verify Methods + Auth tabs work
- Navigate to Workflows → create workflow → add nodes → save → reload → verify persistence
- Execute a workflow → verify SSE stream → verify node status visuals (orange/green/red)
- Cancel a running execution → verify cancellation
- Open logs panel → verify execution history
- Test import/export workflow

### Browser
- Full visual regression in Chrome at 100%, 150%, 200% zoom
- Test dark mode toggle
- Test all panel open/close transitions
```
