# Plugin Creator Execution Trace And Control Flow Plan

## Goal

Fazer o Plugin Creator validar e executar exatamente o mesmo plano que ele publica em `methods.ts`.

Hoje o risco principal e este:
- `Run` usa `PluginTestRunner` e testa apenas `method.request`.
- `Publish` usa `generatePluginMethodsSource` e pode incluir `Code Block`, mappers e fluxo por nodes.
- Entao um plugin pode parecer funcionar no Run, mas falhar depois de publicado.

Este plano corrige isso transformando o canvas em AST visual de `methods.ts`: cada node vira um step compilavel, executavel, rastreavel e com output proprio.

## Non Goals

Nao transformar Plugin Creator em Workflow Editor.

Nao adicionar nodes de runtime/policy como:
- Cache
- Delay
- Rate Limit
- Retry policy
- Dynamic Options
- Auth refresh generico

Essas coisas pertencem ao workflow runtime, ao manifest, ou a uma feature separada. O Plugin Creator deve modelar codigo manual de plugin: requisicao HTTP, transformacao, controle de fluxo e retorno.

## Good Nodes For Plugin Authoring

Estes nodes fazem sentido porque aparecem em codigo manual de `methods.ts`:
- `Method`
- `HTTP Request`
- `Response Mapper`
- `Error Mapper`
- `Code Block`
- `If`
- `Switch`
- `Try/Catch`
- `JSON Transform`
- `Return`
- `For`
- `ForEach`

## Architecture

Separar em responsabilidades pequenas.

Backend:
- `plugin-method-plan.ts`: le blueprint/canvas e cria plano executavel.
- `plugin-method-plan-types.ts`: tipos do AST/plano, sem logica.
- `plugin-method-code-writer.ts`: gera `methods.ts` a partir do plano.
- `plugin-method-plan-runner.ts`: executa o mesmo plano no backend para preview/test.
- `plugin-method-trace-types.ts`: eventos e outputs de execucao por node.
- `plugin-method-expression-evaluator.ts`: avalia expressoes seguras de `If`, `Switch`, `For`, `ForEach`, `JSON Transform`.
- `plugin-publish-validator.ts`: valida build/compile/smoke antes de publicar.

Frontend:
- `pluginCreatorExecution.store.ts`: estado de execucao por node/edge/timeline/output.
- `PluginCreatorEdge.vue`: edge propria do Plugin Creator, baseada no `BaseEdge` visual do Workflow Editor, mas lendo store do Plugin Creator.
- `PluginCreatorExecutionBottomPanel.vue`: copia visual do `ExecutionBottomPanel`, renomeada e simplificada.
- `PluginCreatorNodeOutputPanel.vue`: copia visual do `NodeOutputPanel`.
- `PluginCreatorRunMethodPanel.vue`: copia visual do `RunWorkflowPanel`, focado em method params/credentials.
- `PluginCreatorVariableTree.vue`: copiar `VariableTree`, mas com contexto `params`, `credentials`, `previous`, `steps`.
- `PluginCreatorExpressionInput.vue` e `PluginCreatorExpressionTextarea.vue`: copiar ExpressionInput/Textarea para expressoes TS/JS seguras.

Regra de seguranca:
- Codigo gerado continua plugin generico.
- Plugin gerado nao chama core/engine.
- `Code Block` e expressoes nao podem usar `import`, `require`, `process`, `fs`, `child_process`, `eval`, `Function`, `globalThis`, `__dirname`, `__filename`.

## Copy From Workflow Editor

Pode copiar 100% o visual e adaptar nomes/props:
- `client-vue/src/features/workflow-editor/stores/execution.store.ts`
- `client-vue/src/features/workflow-editor/components/nodes/NodeShimmer.vue`
- status classes em `BaseNode.vue`
- logica de edge status em `BaseEdge.vue`
- `client-vue/src/features/workflow-editor/components/execution/ExecutionBottomPanel.vue`
- `client-vue/src/features/workflow-editor/components/execution/NodeOutputPanel.vue`
- `client-vue/src/features/workflow-editor/components/execution/RunWorkflowPanel.vue`
- `client-vue/src/features/workflow-editor/components/settings/editors/VariableTree.vue`
- `client-vue/src/features/workflow-editor/components/settings/expressions/ExpressionInput.vue`
- `client-vue/src/features/workflow-editor/components/settings/expressions/ExpressionTextarea.vue`
- `client-vue/src/features/workflow-editor/components/settings/expressions/VariablePicker.vue`
- quick-add entre edges
- edge labels
- rename node id com update de edges

Importante: copiar visual e padroes, mas nao compartilhar store do Workflow Editor.

## File Map

Backend types and validation:
- Modify: `server/src/core/modules/plugin-creator/plugin-blueprint-types.ts`
- Modify: `server/src/core/modules/plugin-creator/plugin-blueprint-validation.ts`
- Modify: `client-vue/src/core/types/plugin-creator.types.ts`
- Test: `server/src/core/modules/plugin-creator/plugin-blueprint-validation.test.ts`

Backend plan/compiler:
- Modify: `server/src/core/modules/plugin-creator/plugin-method-plan.ts`
- Create: `server/src/core/modules/plugin-creator/plugin-method-plan-types.ts`
- Modify: `server/src/core/modules/plugin-creator/plugin-method-code-writer.ts`
- Test: `server/src/core/modules/plugin-creator/plugin-method-plan.test.ts`
- Test: `server/src/core/modules/plugin-creator/plugin-method-code-writer.test.ts`

Backend runner/trace:
- Create: `server/src/core/modules/plugin-creator/plugin-method-plan-runner.ts`
- Create: `server/src/core/modules/plugin-creator/plugin-method-trace-types.ts`
- Create: `server/src/core/modules/plugin-creator/plugin-method-expression-evaluator.ts`
- Test: `server/src/core/modules/plugin-creator/plugin-method-plan-runner.test.ts`
- Test: `server/src/core/modules/plugin-creator/plugin-method-expression-evaluator.test.ts`

Backend routes:
- Modify: `server/src/core/routes/plugin-creator.routes.ts`
- Test: `server/src/core/routes/plugin-creator-run-method-plan.routes.test.ts`

Publish validation:
- Create: `server/src/core/modules/plugin-creator/plugin-publish-validator.ts`
- Modify: `server/src/core/modules/plugin-creator/plugin-publish-service.ts`
- Test: `server/src/core/modules/plugin-creator/plugin-publish-validator.test.ts`
- Test: `server/src/core/modules/plugin-creator/plugin-publish-service.test.ts`

Frontend execution:
- Create: `client-vue/src/features/plugin-creator/stores/pluginCreatorExecution.store.ts`
- Modify: `client-vue/src/features/plugin-creator/components/PluginCreatorCanvas.vue`
- Create: `client-vue/src/features/plugin-creator/components/PluginCreatorEdge.vue`
- Create: `client-vue/src/features/plugin-creator/components/PluginCreatorExecutionBottomPanel.vue`
- Create: `client-vue/src/features/plugin-creator/components/PluginCreatorNodeOutputPanel.vue`
- Create: `client-vue/src/features/plugin-creator/components/PluginCreatorRunMethodPanel.vue`
- Modify: `client-vue/src/app/pages/PluginCreatorPage.vue`
- Test: `client-vue/src/features/plugin-creator/stores/__tests__/pluginCreatorExecution.store.test.ts`
- Test: `client-vue/src/features/plugin-creator/components/__tests__/PluginCreatorExecution.contract.test.ts`

Frontend control flow nodes:
- Modify: `client-vue/src/features/plugin-creator/components/PluginCreatorAddItemPanel.vue`
- Modify: `client-vue/src/features/plugin-creator/components/PluginCreatorCanvas.vue`
- Create: `client-vue/src/features/plugin-creator/components/nodes/IfNode.vue`
- Create: `client-vue/src/features/plugin-creator/components/nodes/SwitchNode.vue`
- Create: `client-vue/src/features/plugin-creator/components/nodes/TryCatchNode.vue`
- Create: `client-vue/src/features/plugin-creator/components/nodes/JsonTransformNode.vue`
- Create: `client-vue/src/features/plugin-creator/components/nodes/ReturnNode.vue`
- Create: `client-vue/src/features/plugin-creator/components/nodes/ForNode.vue`
- Create: `client-vue/src/features/plugin-creator/components/nodes/ForEachNode.vue`
- Modify: `client-vue/src/features/plugin-creator/components/node-editors/PluginCreatorNodeEditorFields.vue`
- Test: `client-vue/src/features/plugin-creator/components/__tests__/PluginCreatorControlFlowNodes.contract.test.ts`

Frontend expressions/variables:
- Create: `client-vue/src/features/plugin-creator/components/expressions/PluginCreatorExpressionInput.vue`
- Create: `client-vue/src/features/plugin-creator/components/expressions/PluginCreatorExpressionTextarea.vue`
- Create: `client-vue/src/features/plugin-creator/components/expressions/PluginCreatorVariablePicker.vue`
- Create: `client-vue/src/features/plugin-creator/components/PluginCreatorVariableTree.vue`
- Test: `client-vue/src/features/plugin-creator/components/__tests__/PluginCreatorExpressionTools.contract.test.ts`

---

## Task 1: Define AST Types For Control Flow Nodes

Why:
- O plano precisa representar codigo real de metodo.
- Tipos claros evitam if/switch/loop virarem strings soltas.
- SRP: tipos e validacao separados do runner e writer.

- [ ] Write failing validation tests for node types:
  - `if`
  - `switch`
  - `tryCatch`
  - `jsonTransform`
  - `return`
  - `for`
  - `forEach`
- [ ] Add backend and frontend blueprint types.
- [ ] Add Zod schemas for node data.
- [ ] Keep backward compatibility for old node types.
- [ ] Run:

```bash
cd server
node --test src/core/modules/plugin-creator/plugin-blueprint-validation.test.ts
```

- [ ] Commit:

```bash
git add server/src/core/modules/plugin-creator/plugin-blueprint-types.ts server/src/core/modules/plugin-creator/plugin-blueprint-validation.ts server/src/core/modules/plugin-creator/plugin-blueprint-validation.test.ts client-vue/src/core/types/plugin-creator.types.ts
git commit -m "feat: add plugin creator control flow blueprint types"
```

## Task 2: Expand Method Plan Builder

Why:
- O canvas precisa virar AST ordenado.
- `If`, `Switch`, `Try/Catch`, `For`, `ForEach` precisam preservar branches/children.
- SRP: plan builder nao executa e nao gera codigo.

- [ ] Write failing tests proving:
  - linear graph becomes ordered steps.
  - `if` creates `thenSteps` and `elseSteps`.
  - `switch` creates cases and default steps.
  - `tryCatch` creates `trySteps` and `catchSteps`.
  - `forEach` nests child steps.
  - `return` ends method plan.
- [ ] Move plan interfaces to `plugin-method-plan-types.ts`.
- [ ] Implement graph-to-plan nesting rules.
- [ ] Keep fallback legacy plan.
- [ ] Run:

```bash
cd server
node --test src/core/modules/plugin-creator/plugin-method-plan.test.ts
```

- [ ] Commit:

```bash
git add server/src/core/modules/plugin-creator/plugin-method-plan.ts server/src/core/modules/plugin-creator/plugin-method-plan-types.ts server/src/core/modules/plugin-creator/plugin-method-plan.test.ts
git commit -m "feat: compile plugin creator control flow method plans"
```

## Task 3: Add Safe Expression Evaluator

Why:
- `If`, `Switch`, `For`, `ForEach`, `JSON Transform` precisam avaliar expressoes.
- Nao pode usar `eval` solto.
- Precisa bloquear acesso a runtime perigoso.

Allowed context:
- `params`
- `credentials`
- `previous`
- `steps`
- `response`
- `body`
- `headers`
- `status`

- [ ] Write failing safety tests.
- [ ] Reject forbidden tokens:
  - `import`
  - `require`
  - `process`
  - `fs`
  - `child_process`
  - `eval`
  - `Function`
  - `globalThis`
  - `window`
  - `document`
  - `__dirname`
  - `__filename`
- [ ] Implement evaluator with strict sandbox strategy already used by project dependencies if available.
- [ ] Return typed error messages for unsafe expressions.
- [ ] Run:

```bash
cd server
node --test src/core/modules/plugin-creator/plugin-method-expression-evaluator.test.ts
```

- [ ] Commit:

```bash
git add server/src/core/modules/plugin-creator/plugin-method-expression-evaluator.ts server/src/core/modules/plugin-creator/plugin-method-expression-evaluator.test.ts
git commit -m "feat: add safe plugin creator expression evaluator"
```

## Task 4: Execute The Same Method Plan Used For Publish

Why:
- Corrige o gap perigoso entre Run e Publish.
- `Run` precisa executar request, mapper, error mapper, code block e control flow.
- `Code Block` deixa de ser apenas preview e passa a ser testavel.

- [ ] Write failing runner tests:
  - request node returns rendered request and response.
  - response mapper returns mapped output.
  - error mapper throws/returns mapped error.
  - code block executes and returns output.
  - return node controls final method output.
  - if/switch branch only executes selected branch.
  - try/catch catches request/code errors.
  - for/forEach aggregate outputs.
- [ ] Create `plugin-method-plan-runner.ts`.
- [ ] Create `plugin-method-trace-types.ts`.
- [ ] Emit trace events:
  - `node:running`
  - `node:success`
  - `node:failed`
  - `method:success`
  - `method:failed`
- [ ] Keep credentials redaction.
- [ ] Keep timeout support.
- [ ] Run:

```bash
cd server
node --test src/core/modules/plugin-creator/plugin-method-plan-runner.test.ts src/core/modules/plugin-creator/plugin-creator-secret-redaction.integration.test.ts
```

- [ ] Commit:

```bash
git add server/src/core/modules/plugin-creator/plugin-method-plan-runner.ts server/src/core/modules/plugin-creator/plugin-method-trace-types.ts server/src/core/modules/plugin-creator/plugin-method-plan-runner.test.ts
git commit -m "feat: run plugin creator generated method plans"
```

## Task 5: Replace PluginTestRunner Path With Plan Runner

Why:
- `PluginTestRunner` testa so HTTP request.
- Precisamos que endpoint de run use o mesmo plano do compiler.

- [ ] Write failing route test proving code block affects method output.
- [ ] Modify `PluginCreatorEngine.testMethod` to use plan runner.
- [ ] Preserve old response shape where possible.
- [ ] Add `trace` to test result payload.
- [ ] Run:

```bash
cd server
node --test src/core/routes/plugin-creator-test-method.routes.test.ts src/core/modules/plugin-creator/plugin-creator-engine.test.ts
```

- [ ] Commit:

```bash
git add server/src/core/modules/plugin-creator/plugin-creator-engine.ts server/src/core/routes/plugin-creator.routes.ts server/src/core/routes/plugin-creator-test-method.routes.test.ts server/src/core/modules/plugin-creator/plugin-creator-engine.test.ts
git commit -m "feat: run plugin creator tests through generated method plan"
```

## Task 6: Add Plugin Creator Execution Store

Why:
- Workflow execution store nao pode ser usado diretamente.
- Plugin Creator precisa estado proprio para nodes/edges/timeline/output.
- SRP: store de execucao separado da store de blueprint.

Copy pattern from:
- `client-vue/src/features/workflow-editor/stores/execution.store.ts`

- [ ] Write failing Pinia tests for:
  - patch node status.
  - set output per node.
  - derive edge status from source/target.
  - timeline append.
  - clear execution.
- [ ] Create `pluginCreatorExecution.store.ts`.
- [ ] Add types:
  - `PluginCreatorNodeExecutionStatus`
  - `PluginCreatorNodeExecutionState`
  - `PluginCreatorTimelineEvent`
- [ ] Run:

```bash
cd client-vue
node --test src/features/plugin-creator/stores/__tests__/pluginCreatorExecution.store.test.ts
```

- [ ] Commit:

```bash
git add client-vue/src/features/plugin-creator/stores/pluginCreatorExecution.store.ts client-vue/src/features/plugin-creator/stores/__tests__/pluginCreatorExecution.store.test.ts
git commit -m "feat: add plugin creator execution state"
```

## Task 7: Paint Nodes And Edges From Plugin Creator Execution State

Why:
- Usuario precisa ver waiting/running/success/failed no canvas.
- Edges precisam ficar verde/vermelho/amarelo conforme node anterior/proximo.

Copy visual from:
- `BaseNode.vue`
- `NodeShimmer.vue`
- `BaseEdge.vue`

- [ ] Write frontend contracts proving:
  - canvas passes `status` to Plugin Creator nodes.
  - `PluginCreatorEdge` reads plugin creator execution store.
  - marker ids include idle/success/failed/running.
  - `NodeShimmer` is used when status is waiting/running.
- [ ] Create `PluginCreatorEdge.vue`.
- [ ] Keep `BaseNode` visual, but do not use Workflow execution store.
- [ ] Update `PluginCreatorCanvas.vue`.
- [ ] Run:

```bash
cd client-vue
node --test src/features/plugin-creator/components/__tests__/PluginCreatorExecution.contract.test.ts
```

- [ ] Commit:

```bash
git add client-vue/src/features/plugin-creator/components/PluginCreatorCanvas.vue client-vue/src/features/plugin-creator/components/PluginCreatorEdge.vue client-vue/src/features/plugin-creator/components/__tests__/PluginCreatorExecution.contract.test.ts
git commit -m "feat: show plugin creator node and edge execution status"
```

## Task 8: Add Execution Panels And Node Output

Why:
- So pintar node nao basta.
- Usuario precisa ver timeline, output por node, erro por node e final output.

Copy visual from:
- `ExecutionBottomPanel.vue`
- `NodeOutputPanel.vue`
- `RunWorkflowPanel.vue`

- [ ] Write contracts for:
  - bottom execution panel exists.
  - node output panel shows selected node output.
  - run method panel handles params and credentials.
  - clear execution action resets store.
- [ ] Create:
  - `PluginCreatorExecutionBottomPanel.vue`
  - `PluginCreatorNodeOutputPanel.vue`
  - `PluginCreatorRunMethodPanel.vue`
- [ ] Mount in `PluginCreatorPage.vue`.
- [ ] Wire `lastTestResult.trace` into execution store.
- [ ] Run:

```bash
cd client-vue
node --test src/features/plugin-creator/components/__tests__/PluginCreatorExecutionPanels.contract.test.ts
```

- [ ] Commit:

```bash
git add client-vue/src/features/plugin-creator/components/PluginCreatorExecutionBottomPanel.vue client-vue/src/features/plugin-creator/components/PluginCreatorNodeOutputPanel.vue client-vue/src/features/plugin-creator/components/PluginCreatorRunMethodPanel.vue client-vue/src/app/pages/PluginCreatorPage.vue client-vue/src/features/plugin-creator/components/__tests__/PluginCreatorExecutionPanels.contract.test.ts
git commit -m "feat: add plugin creator execution panels"
```

## Task 9: Add Control Flow And Transform Nodes UI

Why:
- Esses nodes representam codigo manual real de plugins.
- Eles ajudam a criar APIs externas sem virar workflow runtime.

Nodes:
- `If`
- `Switch`
- `Try/Catch`
- `JSON Transform`
- `Return`
- `For`
- `ForEach`

- [ ] Write palette/canvas contracts.
- [ ] Add node components.
- [ ] Add settings editor sections:
  - If: condition, then/else handles.
  - Switch: expression, cases, default.
  - Try/Catch: catch error variable name.
  - JSON Transform: expression/source mapping.
  - Return: value expression.
  - For: init/condition/after or range.
  - ForEach: array expression, item variable.
- [ ] Add handles for branch nodes.
- [ ] Run:

```bash
cd client-vue
node --test src/features/plugin-creator/components/__tests__/PluginCreatorControlFlowNodes.contract.test.ts
```

- [ ] Commit:

```bash
git add client-vue/src/features/plugin-creator/components/PluginCreatorAddItemPanel.vue client-vue/src/features/plugin-creator/components/PluginCreatorCanvas.vue client-vue/src/features/plugin-creator/components/nodes client-vue/src/features/plugin-creator/components/node-editors/PluginCreatorNodeEditorFields.vue client-vue/src/features/plugin-creator/components/__tests__/PluginCreatorControlFlowNodes.contract.test.ts
git commit -m "feat: add plugin creator control flow nodes"
```

## Task 10: Generate TypeScript For Control Flow Nodes

Why:
- Preview e publish precisam produzir codigo igual ao plano.
- Control flow nao pode ser so visual.

- [ ] Write writer tests for each node:
  - if/else emits branch code.
  - switch emits cases.
  - try/catch emits catch block.
  - jsonTransform emits named const.
  - return emits final return.
  - for/forEach emits loops.
- [ ] Update `plugin-method-code-writer.ts`.
- [ ] Preserve node comments:
  - `// Node If: node_id`
  - `// Node Return: node_id`
- [ ] Run:

```bash
cd server
node --test src/core/modules/plugin-creator/plugin-method-code-writer.test.ts src/core/modules/plugin-creator/plugin-methods-generator.test.ts
```

- [ ] Commit:

```bash
git add server/src/core/modules/plugin-creator/plugin-method-code-writer.ts server/src/core/modules/plugin-creator/plugin-method-code-writer.test.ts server/src/core/modules/plugin-creator/plugin-methods-generator.test.ts
git commit -m "feat: generate plugin creator control flow code"
```

## Task 11: Add Expression And Variable Tools

Why:
- Control flow sem variable picker vira dificil de usar.
- Workflow Editor ja tem solucao boa.

Copy from Workflow Editor and adapt context:
- `ExpressionInput`
- `ExpressionTextarea`
- `VariablePicker`
- `VariableTree`

Plugin Creator context:
- `params`
- `credentials`
- `previous`
- `steps.<nodeId>.output`
- `steps.<nodeId>.status`
- `steps.<nodeId>.error`
- `response.status`
- `response.headers`
- `response.body`

- [ ] Write contracts for expression components.
- [ ] Implement variable tree inference from current method graph.
- [ ] Use expression components in If/Switch/Transform/Return/For/ForEach settings.
- [ ] Run:

```bash
cd client-vue
node --test src/features/plugin-creator/components/__tests__/PluginCreatorExpressionTools.contract.test.ts
```

- [ ] Commit:

```bash
git add client-vue/src/features/plugin-creator/components/expressions client-vue/src/features/plugin-creator/components/PluginCreatorVariableTree.vue client-vue/src/features/plugin-creator/components/node-editors/PluginCreatorNodeEditorFields.vue client-vue/src/features/plugin-creator/components/__tests__/PluginCreatorExpressionTools.contract.test.ts
git commit -m "feat: add plugin creator expression variable tools"
```

## Task 12: Validate Publish With Generated Code

Why:
- Publish precisa bloquear codigo que nao compila.
- Publish precisa bloquear code block inseguro.
- Publish deve ser a etapa mais confiavel.

- [ ] Write failing publish validator tests:
  - invalid generated TS fails.
  - unsafe code block fails.
  - valid generated plugin passes.
  - smoke run can execute one selected method with safe mock or sample params.
- [ ] Create `plugin-publish-validator.ts`.
- [ ] Call validator before release write.
- [ ] Return clear error messages to frontend.
- [ ] Run:

```bash
cd server
node --test src/core/modules/plugin-creator/plugin-publish-validator.test.ts src/core/modules/plugin-creator/plugin-publish-service.test.ts
```

- [ ] Commit:

```bash
git add server/src/core/modules/plugin-creator/plugin-publish-validator.ts server/src/core/modules/plugin-creator/plugin-publish-validator.test.ts server/src/core/modules/plugin-creator/plugin-publish-service.ts server/src/core/modules/plugin-creator/plugin-publish-service.test.ts
git commit -m "feat: validate plugin creator publish output"
```

## Task 13: End-To-End Verification

Why:
- Essa feature mexe em run, publish, compiler, canvas e UX.
- Precisa provar que o caminho todo funciona.

- [ ] Run backend tests:

```bash
cd server
node --test src/core/modules/plugin-creator/plugin-method-plan.test.ts src/core/modules/plugin-creator/plugin-method-code-writer.test.ts src/core/modules/plugin-creator/plugin-method-plan-runner.test.ts src/core/modules/plugin-creator/plugin-method-expression-evaluator.test.ts src/core/modules/plugin-creator/plugin-publish-validator.test.ts src/core/routes/plugin-creator-test-method.routes.test.ts
```

- [ ] Run frontend tests:

```bash
cd client-vue
node --test src/features/plugin-creator/stores/__tests__/pluginCreatorExecution.store.test.ts src/features/plugin-creator/components/__tests__/PluginCreatorExecution.contract.test.ts src/features/plugin-creator/components/__tests__/PluginCreatorExecutionPanels.contract.test.ts src/features/plugin-creator/components/__tests__/PluginCreatorControlFlowNodes.contract.test.ts src/features/plugin-creator/components/__tests__/PluginCreatorExpressionTools.contract.test.ts
```

- [ ] Run builds:

```bash
cd client-vue
npm run type-check
npm run build

cd ../server
npm run build
```

- [ ] Browser smoke:
  - create plugin.
  - add method.
  - add request.
  - add JSON Transform before request.
  - add response mapper.
  - add If.
  - add Return.
  - run method.
  - confirm node shimmer/status.
  - confirm edges green/red.
  - inspect node outputs.
  - save.
  - publish.
  - export zip.

- [ ] Commit verification fixes:

```bash
git add <only verification fix files>
git commit -m "fix: verify plugin creator execution trace flow"
```

## Implementation Order

1. Backend plan AST.
2. Backend runner trace.
3. Frontend execution store/status.
4. Execution panels.
5. Control flow nodes.
6. Code writer for control flow.
7. Expression tools.
8. Publish validation.

Reason:
- Primeiro garante fonte da verdade.
- Depois pinta UI.
- Depois adiciona novos nodes.
- Por ultimo endurece publish.

## Acceptance Criteria

- `Run` executa o mesmo plano que `methods.ts` usa.
- `Code Block` e control flow sao testados antes de publish.
- Node mostra `waiting/running/success/failed`.
- Node tem shimmer em `waiting/running`.
- Edge fica verde/vermelha/amarela conforme execucao do source/target.
- Timeline mostra eventos por node.
- Cada node tem output/erro inspecionavel.
- Publish falha se codigo gerado nao compila.
- Plugin gerado continua sem dependencia do core/engine.
- Todos os novos nodes geram TypeScript legivel, com comentarios por node.
