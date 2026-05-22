# Plugin Creator rich node editors

## Goal

Criar editores ricos para os nodes do Plugin Creator:

- HTTP Request
- Response Mapping
- Error Mapping
- Code Block
- If
- Switch
- Try/Catch
- JSON Transform
- Return
- For
- ForEach
- Output

Tambem alinhar o visual dos nodes `If`, `Switch` e `Try/Catch` com os nodes do Workflow Editor, reaproveitando o padrao de `BaseNode`, `BaseHandle`, `BaseBadge` e `QuickAddButton`.

## Architecture

O editor atual `PluginCreatorNodeEditorFields.vue` esta grande demais e mistura muita responsabilidade. Vamos dividir em editores pequenos por node, com helpers compartilhados para resolver `blueprint`, `node`, `method`, arrays editaveis e parse/stringify de JSON/expressions.

O canvas continua usando nodes genericos do Plugin Creator. A UI dos nodes de controle (`If`, `Switch`, `Try/Catch`) passa a usar o mesmo comportamento visual dos nodes do Workflow Editor: badges nos handles, altura dinamica quando tiver multiplas saidas, e quick-add por handle.

Try/Catch com varios catches nao e so UI. Precisa contrato de dados (`catchCases`), handles estaveis, plano do metodo, writer de codigo, runner/teste e minimap legivel.

## Risk

- Alto risco se mexer direto no `PluginCreatorNodeEditorFields.vue` sem quebrar em componentes. Arquivo ja esta inchado.
- Alto risco em `Try/Catch` multi-catch porque afeta canvas handles, edges, compiler, runner e preview.
- Mitigacao: TDD por task, commits pequenos, manter compatibilidade com blueprint antigo (`catch` unico).

## Current Files

- Existing router/editor host: `client-vue/src/features/plugin-creator/components/PluginCreatorNodeSettingsPanel.vue`
- Current monolith editor: `client-vue/src/features/plugin-creator/components/node-editors/PluginCreatorNodeEditorFields.vue`
- Existing editor contracts: `client-vue/src/features/plugin-creator/components/__tests__/PluginCreatorNodeSettingsPanel.contract.test.ts`
- Editor types: `client-vue/src/features/plugin-creator/components/node-editors/types.ts`
- Canvas: `client-vue/src/features/plugin-creator/components/PluginCreatorCanvas.vue`
- Plugin Creator nodes: `client-vue/src/features/plugin-creator/components/nodes/*.vue`
- Workflow visual references:
  - `client-vue/src/features/workflow-editor/components/nodes/IfNode.vue`
  - `client-vue/src/features/workflow-editor/components/nodes/SwitchNode.vue`
- Compiler:
  - `server/src/core/modules/plugin-creator/plugin-method-plan.ts`
  - `server/src/core/modules/plugin-creator/plugin-method-plan-types.ts`
  - `server/src/core/modules/plugin-creator/plugin-method-code-writer.ts`
  - `server/src/core/modules/plugin-creator/plugin-method-plan-runner.ts`
- Frontend types: `client-vue/src/core/types/plugin-creator.types.ts`
- Backend types: `server/src/core/modules/plugin-creator/plugin-blueprint-types.ts`

---

## Task 1: Shared editor foundation

**Files**

- Create: `client-vue/src/features/plugin-creator/components/node-editors/usePluginCreatorNodeEditorContext.ts`
- Create: `client-vue/src/features/plugin-creator/components/node-editors/editorValueUtils.ts`
- Create: `client-vue/src/features/plugin-creator/components/node-editors/NodeEditorSection.vue`
- Modify: `client-vue/src/features/plugin-creator/components/node-editors/types.ts`
- Test: `client-vue/src/features/plugin-creator/components/__tests__/PluginCreatorNodeEditors.contract.test.ts`

**Tasks**

- [ ] Write failing contract test proving shared editor helpers exist.
- [ ] Add `usePluginCreatorNodeEditorContext` to resolve `node`, `method`, `methodId`, `updateNodeData`, `updateMethodPatch`.
- [ ] Add `editorValueUtils` with `stringifyEditorValue`, `parseEditorValue`, `parseJsonObject`, `parseJsonArray`.
- [ ] Add `NodeEditorSection.vue` for consistent header, eyebrow, toolbar slot, body slot.
- [ ] Keep emits compatible with `PluginCreatorNodeEditorEmits`.
- [ ] Run `node --test src/features/plugin-creator/components/__tests__/PluginCreatorNodeEditors.contract.test.ts`.
- [ ] Run `npm run type-check`.
- [ ] Commit: `feat: add plugin creator node editor foundation`.

## Task 2: Split existing big editor into focused editors

**Files**

- Create/replace:
  - `client-vue/src/features/plugin-creator/components/node-editors/RequestNodeEditor.vue`
  - `client-vue/src/features/plugin-creator/components/node-editors/ResponseMapperNodeEditor.vue`
  - `client-vue/src/features/plugin-creator/components/node-editors/ErrorMapperNodeEditor.vue`
  - `client-vue/src/features/plugin-creator/components/node-editors/CodeBlockNodeEditor.vue`
  - `client-vue/src/features/plugin-creator/components/node-editors/OutputNodeEditor.vue`
- Modify:
  - `client-vue/src/features/plugin-creator/components/PluginCreatorNodeSettingsPanel.vue`
  - `client-vue/src/features/plugin-creator/components/node-editors/PluginCreatorNodeEditorFields.vue`
- Test:
  - `client-vue/src/features/plugin-creator/components/__tests__/PluginCreatorNodeSettingsPanel.contract.test.ts`
  - `client-vue/src/features/plugin-creator/components/__tests__/PluginCreatorNodeEditors.contract.test.ts`

**Tasks**

- [ ] Write failing tests proving each node type maps to its focused editor.
- [ ] Keep `PluginCreatorNodeEditorFields.vue` only as temporary fallback for not-yet-split nodes.
- [ ] `RequestNodeEditor`: method, URL, headers table, query table, body mode tabs, JSON/text editor, generated request preview.
- [ ] `ResponseMapperNodeEditor`: mapping rows, output type, required toggle, response path picker area, sample response preview from last test result.
- [ ] `ErrorMapperNodeEditor`: condition builder, status/body source selector, operator segmented control, message builder, mapped error preview.
- [ ] `CodeBlockNodeEditor`: source editor, output variable, quick inserts for `params`, `previous`, `context.credentials`, safety hint from backend rules.
- [ ] `OutputNodeEditor`: final output shaping, typed outputs list, source path/expression, required toggle.
- [ ] Run focused frontend tests.
- [ ] Run `npm run type-check`.
- [ ] Commit: `feat: split plugin creator core node editors`.

## Task 3: Rich HTTP Request editor

**Files**

- Modify: `client-vue/src/features/plugin-creator/components/node-editors/RequestNodeEditor.vue`
- Create: `client-vue/src/features/plugin-creator/components/node-editors/KeyValueTableEditor.vue`
- Create: `client-vue/src/features/plugin-creator/components/node-editors/RequestBodyEditor.vue`
- Test: `client-vue/src/features/plugin-creator/components/__tests__/RequestNodeEditor.contract.test.ts`

**Tasks**

- [ ] Write failing test for method picker, URL expression input, headers/query add/remove/reorder, body modes.
- [ ] Implement `KeyValueTableEditor` with rows, remove button, duplicate button, empty state, variable buttons.
- [ ] Implement `RequestBodyEditor` with `none`, `json`, `text`, `form`; JSON validates before save.
- [ ] Show request preview card: method, URL, headers count, query count, body status.
- [ ] Use `PluginCreatorExpressionInput` for URL and key/value values.
- [ ] Run test and type-check.
- [ ] Commit: `feat: add rich plugin creator request editor`.

## Task 4: Rich Response Mapping editor

**Files**

- Modify: `client-vue/src/features/plugin-creator/components/node-editors/ResponseMapperNodeEditor.vue`
- Create: `client-vue/src/features/plugin-creator/components/node-editors/MappingRowsEditor.vue`
- Test: `client-vue/src/features/plugin-creator/components/__tests__/ResponseMapperNodeEditor.contract.test.ts`

**Tasks**

- [ ] Write failing test for multiple mapping rows.
- [ ] Add rows with output name, response path, type, required, remove, duplicate.
- [ ] Add sample response panel using `lastTestResult.body`.
- [ ] Add click-to-copy/click-to-fill path from sample JSON tree.
- [ ] Add empty state with one-click `Add mapping`.
- [ ] Run test and type-check.
- [ ] Commit: `feat: add rich response mapping editor`.

## Task 5: Rich Error Mapping editor

**Files**

- Modify: `client-vue/src/features/plugin-creator/components/node-editors/ErrorMapperNodeEditor.vue`
- Create: `client-vue/src/features/plugin-creator/components/node-editors/ErrorConditionEditor.vue`
- Test: `client-vue/src/features/plugin-creator/components/__tests__/ErrorMapperNodeEditor.contract.test.ts`

**Tasks**

- [ ] Write failing test for multiple error mappings.
- [ ] Add condition builder: source `status/body`, operator, path, compare value.
- [ ] Add message builder: static message or body path fallback.
- [ ] Add mapped error preview from `lastTestResult`.
- [ ] Add remove/duplicate/reorder mappings.
- [ ] Run test and type-check.
- [ ] Commit: `feat: add rich error mapping editor`.

## Task 6: Rich Code Block editor

**Files**

- Modify: `client-vue/src/features/plugin-creator/components/node-editors/CodeBlockNodeEditor.vue`
- Test: `client-vue/src/features/plugin-creator/components/__tests__/CodeBlockNodeEditor.contract.test.ts`

**Tasks**

- [ ] Write failing test for source editor, output name, quick snippets, safety warnings.
- [ ] Add Monaco/`BaseCodeEditor` TypeScript source editor.
- [ ] Add snippet toolbar: `return previous;`, `return { ...previous };`, `params.<name>`, `context.credentials.<name>`.
- [ ] Add read-only context panel: available variables from previous nodes.
- [ ] Add safety warning list matching backend blocked patterns.
- [ ] Run test and type-check.
- [ ] Commit: `feat: add rich code block editor`.

## Task 7: Workflow-style If node visual and editor

**Files**

- Modify: `client-vue/src/features/plugin-creator/components/nodes/IfNode.vue`
- Create: `client-vue/src/features/plugin-creator/components/node-editors/IfNodeEditor.vue`
- Modify: `client-vue/src/features/plugin-creator/components/PluginCreatorNodeSettingsPanel.vue`
- Test:
  - `client-vue/src/features/plugin-creator/components/nodes/__tests__/pluginCreatorControlNodes.contract.test.ts`
  - `client-vue/src/features/plugin-creator/components/__tests__/IfNodeEditor.contract.test.ts`

**Tasks**

- [ ] Write failing visual contract: imports `BaseHandle`, `BaseBadge`, `QuickAddButton`, uses handles `then` and `else`.
- [ ] Copy/adapt Workflow Editor `IfNode.vue` visual style.
- [ ] Preserve Plugin Creator props shape: `{ id, data, selected }`.
- [ ] Add editor with expression input, quick operators, variable picker, true/false branch hints.
- [ ] Run tests and type-check.
- [ ] Commit: `feat: add workflow-style plugin creator if node`.

## Task 8: Workflow-style Switch node visual and editor

**Files**

- Modify: `client-vue/src/features/plugin-creator/components/nodes/SwitchNode.vue`
- Create: `client-vue/src/features/plugin-creator/components/node-editors/SwitchNodeEditor.vue`
- Modify: `client-vue/src/features/plugin-creator/components/PluginCreatorNodeSettingsPanel.vue`
- Test:
  - `client-vue/src/features/plugin-creator/components/nodes/__tests__/pluginCreatorControlNodes.contract.test.ts`
  - `client-vue/src/features/plugin-creator/components/__tests__/SwitchNodeEditor.contract.test.ts`

**Tasks**

- [ ] Write failing visual contract: dynamic handles from `data.cases`, default handle, dynamic height.
- [ ] Copy/adapt Workflow Editor `SwitchNode.vue` handle/badge layout.
- [ ] Add editor with switch expression, cases table, labels, values, handle ids, default branch toggle.
- [ ] Case handle ids must be stable after label/value edits.
- [ ] Run tests and type-check.
- [ ] Commit: `feat: add workflow-style plugin creator switch node`.

## Task 9: Try/Catch node with multiple catches

**Files**

- Modify:
  - `client-vue/src/core/types/plugin-creator.types.ts`
  - `server/src/core/modules/plugin-creator/plugin-blueprint-types.ts`
  - `server/src/core/modules/plugin-creator/plugin-blueprint-validation.ts`
  - `server/src/core/modules/plugin-creator/plugin-method-plan-types.ts`
  - `server/src/core/modules/plugin-creator/plugin-method-plan.ts`
  - `server/src/core/modules/plugin-creator/plugin-method-code-writer.ts`
  - `server/src/core/modules/plugin-creator/plugin-method-plan-runner.ts`
  - `client-vue/src/features/plugin-creator/components/nodes/TryCatchNode.vue`
- Create: `client-vue/src/features/plugin-creator/components/node-editors/TryCatchNodeEditor.vue`
- Test:
  - `server/src/core/modules/plugin-creator/plugin-blueprint-validation.test.ts`
  - `server/src/core/modules/plugin-creator/plugin-method-plan.test.ts`
  - `server/src/core/modules/plugin-creator/plugin-method-code-writer.test.ts`
  - `server/src/core/modules/plugin-creator/plugin-method-plan-runner.test.ts`
  - `client-vue/src/features/plugin-creator/components/__tests__/TryCatchNodeEditor.contract.test.ts`

**Tasks**

- [ ] Write failing backend tests for `catchCases`.
- [ ] Add node data shape: `catchCases: Array<{ id: string; label: string; errorCode?: string; handle?: string }>` and keep old `catch` fallback.
- [ ] Plan compiler maps `try` branch plus each catch case branch.
- [ ] Code writer emits ordered `catch` routing block. Simple implementation: one JS `catch(error)` and inside it route by configured predicates/error code.
- [ ] Runner supports same branch routing for test execution.
- [ ] Node visual uses Switch-like dynamic handles: `try`, each catch case, optional `finally` later not in this task.
- [ ] Editor supports add/remove/reorder catches, stable handle ids, error variable, fallback catch.
- [ ] Run backend + frontend focused tests.
- [ ] Run server build and client type-check.
- [ ] Commit: `feat: add multi-catch plugin creator try catch node`.

## Task 10: JSON Transform editor

**Files**

- Create: `client-vue/src/features/plugin-creator/components/node-editors/JsonTransformNodeEditor.vue`
- Modify: `client-vue/src/features/plugin-creator/components/PluginCreatorNodeSettingsPanel.vue`
- Test: `client-vue/src/features/plugin-creator/components/__tests__/JsonTransformNodeEditor.contract.test.ts`

**Tasks**

- [ ] Write failing test for expression editor and output name.
- [ ] Add expression editor with variable picker.
- [ ] Add output name field.
- [ ] Add live formatted preview: expression result placeholder, not real eval.
- [ ] Run test and type-check.
- [ ] Commit: `feat: add json transform node editor`.

## Task 11: Return editor

**Files**

- Create: `client-vue/src/features/plugin-creator/components/node-editors/ReturnNodeEditor.vue`
- Modify: `client-vue/src/features/plugin-creator/components/PluginCreatorNodeSettingsPanel.vue`
- Test: `client-vue/src/features/plugin-creator/components/__tests__/ReturnNodeEditor.contract.test.ts`

**Tasks**

- [ ] Write failing test for return expression editor.
- [ ] Add expression editor with quick values: `previous`, `params`, object literal.
- [ ] Add final-output preview panel.
- [ ] Run test and type-check.
- [ ] Commit: `feat: add return node editor`.

## Task 12: For and ForEach editors

**Files**

- Create:
  - `client-vue/src/features/plugin-creator/components/node-editors/ForNodeEditor.vue`
  - `client-vue/src/features/plugin-creator/components/node-editors/ForEachNodeEditor.vue`
- Modify: `client-vue/src/features/plugin-creator/components/PluginCreatorNodeSettingsPanel.vue`
- Test:
  - `client-vue/src/features/plugin-creator/components/__tests__/ForNodeEditor.contract.test.ts`
  - `client-vue/src/features/plugin-creator/components/__tests__/ForEachNodeEditor.contract.test.ts`

**Tasks**

- [ ] Write failing tests for loop editors.
- [ ] `ForNodeEditor`: mode segmented control `range` or `iterable`, item variable, from/to expressions, iterable expression.
- [ ] `ForEachNodeEditor`: array expression, item variable, variable picker, body branch hint.
- [ ] Add warnings for empty item variable.
- [ ] Run tests and type-check.
- [ ] Commit: `feat: add loop node editors`.

## Task 13: Output editor polish

**Files**

- Modify: `client-vue/src/features/plugin-creator/components/node-editors/OutputNodeEditor.vue`
- Test: `client-vue/src/features/plugin-creator/components/__tests__/OutputNodeEditor.contract.test.ts`

**Tasks**

- [ ] Write failing test for multiple output fields.
- [ ] Support list of output fields, not only first response mapping.
- [ ] Add source path/expression mode.
- [ ] Add output schema preview.
- [ ] Run test and type-check.
- [ ] Commit: `feat: polish plugin creator output editor`.

## Task 14: Integrate all editors in settings panel

**Files**

- Modify:
  - `client-vue/src/features/plugin-creator/components/PluginCreatorNodeSettingsPanel.vue`
  - `client-vue/src/features/plugin-creator/components/PluginCreatorNodeSettingsModal.vue`
  - `client-vue/src/app/pages/PluginCreatorPage.vue`
- Test:
  - `client-vue/src/features/plugin-creator/components/__tests__/PluginCreatorNodeSettingsPanel.contract.test.ts`
  - `client-vue/src/features/plugin-creator/components/__tests__/PluginCreatorNodeSettingsModal.contract.test.ts`

**Tasks**

- [ ] Write failing tests that all requested node types resolve to dedicated editors.
- [ ] Replace `PluginCreatorNodeEditorFields` fallback for requested nodes.
- [ ] Ensure save/run buttons still work from modal.
- [ ] Ensure node data updates refresh minimap preview.
- [ ] Run tests and type-check.
- [ ] Commit: `feat: wire rich plugin creator node editors`.

## Task 15: Browser smoke and final cleanup

**Files**

- Modify only files needed after smoke failures.

**Tasks**

- [ ] Run `cd client-vue && npm run type-check`.
- [ ] Run `cd client-vue && npm run build`.
- [ ] Run focused frontend node/editor tests.
- [ ] Run focused backend plugin creator compiler tests if Try/Catch changed.
- [ ] Browser smoke:
  - create/open plugin
  - add every requested node
  - open each editor
  - edit fields
  - verify canvas labels/handles update
  - connect If then/else
  - connect Switch cases/default
  - connect Try/Catch try/catch cases
  - verify minimap readable preview updates
  - run method test
- [ ] Fix only smoke failures.
- [ ] Commit: `fix: verify rich plugin creator node editors`.

## Suggested execution order

1. Foundation and split editors first.
2. Request/Mapping/Error/Code/Output core editors.
3. Control node visuals.
4. Try/Catch multi-catch backend + frontend.
5. Loop/transform/return editors.
6. Integration and smoke.

## Done criteria

- Every requested node has a dedicated editor.
- `PluginCreatorNodeEditorFields.vue` no longer owns requested node UI.
- If/Switch/Try/Catch have visible branch handles and quick-add buttons.
- Switch and Try/Catch use stable dynamic handles.
- Minimap shows readable method preview after edits.
- Type-check passes.
- Focused contracts pass.
- Browser smoke passes.
