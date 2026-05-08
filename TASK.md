# TASK.md — Forge Project Bug & Feature Tracker

> Mantido por: Staff Engineer  
> Última atualização: 2026-05-08

---

## Bugs Ativos

_(nenhum bug ativo no momento)_

---

## Tarefas Pendentes

_(nenhuma tarefa pendente no momento)_

---

## Concluído

### ✅ [BUG-002] Trigger node sem shimmer laranja ao iniciar execução
- **Commit:** `fix(ui): trigger node shimmer + edge status for form/all triggers`
- **Root Cause:** O servidor nunca emite `node:start` para o nó trigger. `BaseNode.effectiveStatus` ficava `idle` → sem `NodeShimmer`.
- **Fix:** `setTriggerRunning()` no `execution.store.ts`, chamado em `execute()` e no fluxo do Form Trigger no Canvas.

### ✅ [BUG-003] Edges ficam verdes imediatamente ao iniciar qualquer execução
- **Commit:** `fix(ui): trigger node shimmer + edge status for form/all triggers`
- **Root Cause:** `BaseEdge.edgeStatus` usava `hasActiveExecution || workflowStatus` para determinar o status do trigger — tornando-o `'success'` assim que `isStreaming = true`, antes de qualquer nó rodar.
- **Fix:** `edgeStatus` agora lê `nodeStatuses['trigger']?.status` real. Só faz fallback para `'success'` quando `workflowStatus === 'SUCCESS'` (workflow de fato concluiu). O primeiro `node:start` recebido via SSE auto-transiciona o trigger para `'success'`.


### ✅ [BUG-001] Form Trigger — fields não apareciam no Input dos nós downstream
- **Commit:** `fix(ui): resolve form trigger fields in VariableTree`
- **Arquivo:** `client-vue/.../VariableTree.vue`
- **Fix:** Branch para `type === 'form'` em `allPaths` mapeia `formFields[]` → `trigger.fields.<name>`.

### ✅ [FEAT-001] Form Trigger "Run" — abre form em nova aba e monitora execução
- **Commit:** `feat(ui): open form in new tab on Run for form triggers`
- **Arquivos:** `Nod8WorkflowCanvas.vue`, `FormPage.vue`
- **Como funciona:**
  1. Ao clicar em **Run** com trigger do tipo `form`, o editor gera um `clientExecId`
  2. Abre `window.open(/forms-test/:formId?execId=XXXX, '_blank')`
  3. O `executionStore.startStream(clientExecId)` começa a escutar SSE imediatamente
  4. O `FormPage.vue` lê `?execId` da URL e o passa como `X-Nod8-Execution-Id` ao submeter
  5. O servidor associa a submissão ao `executionId` e os eventos chegam via SSE para o editor
  6. O form exibe um badge "Editor is watching" pulsando enquanto o execId está presente
