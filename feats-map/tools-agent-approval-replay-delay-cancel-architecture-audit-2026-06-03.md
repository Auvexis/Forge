# Tools Agent Approval Replay Delay Cancel Architecture Audit - 2026-06-03

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Corrigir replay de steps depois de approval, reduzir delay entre steps, restaurar Stop/Cancel no Agent Panel e auditar acoplamento indevido entre Core/Engines e plugins especificos.

**Architecture:** O Core/Engine deve continuar generico: ele pode orquestrar tools pelo contrato `SailorAgentToolDefinition`, mas nao pode ter regra especial para Drive, Gmail, Discord ou qualquer plugin. Plugins continuam genericos e nao podem depender de comportamento interno do Tools Agent ou Workflow Engine.

**Tech Stack:** TypeScript, Node test runner, Fastify SSE, Vue/Pinia, WorkflowEngine, Agent Runtime.

---

## Diagnostico Inicial

- O replay depois do approval provavelmente vem de `WorkflowEngine.resumeExecutionAfterAgentApproval` reinvocando o node do agent com contexto que ainda permite replanejar desde o inicio.
- O fluxo correto e: apos aprovar `google_gmail_send_message`, o runtime deve executar somente a tool aprovada e continuar a partir dali, sem repetir `google_drive_list_files` e `google_drive_download_file`.
- O delay de 1 minuto nao parece ser delay visual simples. Pode ser uma nova chamada de LLM entre steps, timeout/retry silencioso, ou stream esperando o resume executar de novo.
- O botao Stop existe no frontend, mas depende de `store.activeExecutionId`. Se o `start` event nao chega cedo, ou se `activeExecutionId` limpa durante approval/resume, o botao some.
- A auditoria core/plugin deve procurar qualquer regra especifica por nome de plugin, method ou MIME no `server/src/core/**`. Regra especifica de Drive deve ficar no plugin Drive; regra generica de arquivo/ref deve ficar no core.

## Arquivos Alvo

- Modificar: `server/src/core/modules/workflows/executor.ts`
- Modificar: `server/src/core/modules/agent-runtime/agent-graph-builder.ts`
- Modificar: `server/src/core/modules/agent-runtime/plugin-tool-executor.ts`
- Modificar: `server/src/core/routes/agent-chat.routes.ts`
- Modificar: `server/src/core/routes/agent-panel.routes.ts`
- Modificar: `server/src/core/modules/agent-runtime/chat/agent-panel-chat-service.ts`
- Modificar: `client-vue/src/features/agent-panel/stores/agentPanel.store.ts`
- Modificar: `client-vue/src/features/agent-panel/components/AgentChatView.vue`
- Modificar: `client-vue/src/features/agent-panel/components/AgentChatComposer.vue`
- Testar: `server/src/core/modules/workflows/executor.test.ts`
- Testar: `server/src/core/modules/agent-runtime/agent-graph-builder.test.ts`
- Testar: `server/src/core/routes/agent-panel.routes.test.ts`
- Testar: `server/src/core/routes/agent-chat.routes.test.ts`
- Testar: `client-vue/src/features/agent-panel/__tests__/agentPanel.contract.test.ts`

## Task 1: Reproduzir Replay Pos-Approval

- [x] Escrever teste vermelho em `server/src/core/modules/workflows/executor.test.ts`.

Caso esperado:

```ts
it("resumes approval without replaying successful previous agent tools", async () => {
  const toolCalls: string[] = [];
  const firstRun = ["google_drive_list_files", "google_drive_download_file", "google_gmail_send_message"];
  const resumedRun = ["google_gmail_send_message"];

  // O fake agent/tool runtime deve:
  // 1. executar list_files e download_file com sucesso;
  // 2. pausar no gmail por approval;
  // 3. no resume, receber approvalToken aprovado;
  // 4. executar somente gmail.
  //
  // Assert principal:
  assert.deepEqual(toolCalls, [...firstRun, ...resumedRun]);
  assert.equal(toolCalls.filter((name) => name === "google_drive_list_files").length, 1);
  assert.equal(toolCalls.filter((name) => name === "google_drive_download_file").length, 1);
  assert.equal(toolCalls.filter((name) => name === "google_gmail_send_message").length, 2);
});
```

- [x] Rodar:

```powershell
cd server
node --test src/core/modules/workflows/executor.test.ts
```

Esperado: falhar mostrando replay de tools ja concluidas.

## Task 2: Corrigir Resume Sem Replanejar Do Zero

- [x] Investigar `continueWorkflowExecution` e o estado salvo em `execution.context_state`.
- [x] Garantir que `resumeExecutionAfterAgentApproval` preserve `context.steps[nodeId]` de forma resumivel, mas nao force o agent a reexecutar tools concluidas.
- [x] Ajustar o contrato generico do agent runtime para aceitar `approvalToken`, `approvalId`, `approvalToolName` e contexto anterior sem reiniciar plano inteiro.
- [x] Nao usar nomes como `google_drive_*`, `google_gmail_*`, `discord_*` na implementacao.
- [x] Rodar o teste vermelho da Task 1 ate passar.
- [x] Commit:

```powershell
git add server/src/core/modules/workflows/executor.ts server/src/core/modules/workflows/executor.test.ts
git commit -m "fix: resume agent approval without replaying completed tools"
```

## Task 3: Testar Escopo Da Tool Aprovada

- [x] Adicionar teste em `server/src/core/modules/agent-runtime/agent-graph-builder.test.ts`.

Caso esperado:

```ts
it("approval token unlocks only the approved pending tool", async () => {
  const executed: string[] = [];
  // Duas tools write/delete exigem approval.
  // approvalToolName = "send_email".
  // A primeira tool aprovada executa.
  // A segunda continua pedindo approval.
  assert.deepEqual(executed, ["send_email"]);
});
```

- [x] Rodar:

```powershell
cd server
node --test src/core/modules/agent-runtime/agent-graph-builder.test.ts
```

Esperado: passar sem regressao.

## Task 4: Medir E Cortar Delay Entre Steps

- [x] Adicionar instrumentacao de teste em `server/src/core/routes/agent-panel.routes.test.ts` para verificar que eventos `progress` consecutivos nao esperam dezenas de segundos.

Caso esperado:

```ts
it("streams next tool progress quickly after previous tool completion", async () => {
  const startedAt = Date.now();
  const events = await collectAgentPanelStream();
  const durationMs = Date.now() - startedAt;

  assert.equal(events.some((event) => event.type === "progress"), true);
  assert.ok(durationMs < 1500, `progress stream took ${durationMs}ms`);
});
```

- [x] Auditar onde pode existir espera:
  - `TOOL_PROGRESS_INITIAL_DELAY_MS`
  - `TOOL_PROGRESS_STEP_DELAY_MS`
  - retry com `delay(...)` em `agent-graph-builder.ts`
  - nova inferencia LLM entre steps
  - SSE esperando `sendMessage` terminar antes de flush
- [x] Remover delay artificial que nao for necessario para UX.
- [x] Se o delay for LLM/retry, emitir progress antes da chamada lenta e registrar evento `agent:model-start`/`agent:model-end` para saber onde travou.
- [x] Commit:

```powershell
git add server/src/core/routes/agent-panel.routes.ts server/src/core/routes/agent-panel.routes.test.ts server/src/core/modules/agent-runtime/agent-graph-builder.ts server/src/core/modules/agent-runtime/agent-graph-builder.test.ts
git commit -m "fix: stream agent tool progress without long gaps"
```

## Task 5: Restaurar Stop/Cancel Visivel Durante Execucao

- [x] Escrever teste vermelho em `client-vue/src/features/agent-panel/__tests__/agentPanel.contract.test.ts`.

Caso esperado:

```ts
it("shows Stop while an agent panel message is sending even before execution id arrives", () => {
  assert.match(composerSource, /props\.sending/);
  assert.match(composerSource, /Stop/);
  assert.doesNotMatch(chatViewSource, /:cancelable="Boolean\(store\.activeExecutionId\)"/);
});
```

- [x] Corrigir UI para mostrar Stop sempre que `store.sending === true`.
- [x] Manter cancel efetivo em duas camadas:
  - se `activeExecutionId` existir, chamar endpoint de cancelamento;
  - sempre abortar o stream local via `AbortController`/cancel local do request.
- [x] Se `agentPanelApi.sendMessageStream` nao aceitar abort signal, adicionar `AbortController` generico no client API.
- [x] Nao depender de plugin nenhum para cancelar.
- [x] Rodar:

```powershell
cd client-vue
node --test src/features/agent-panel/__tests__/agentPanel.contract.test.ts
```

- [x] Commit:

```powershell
git add client-vue/src/features/agent-panel/__tests__/agentPanel.contract.test.ts client-vue/src/features/agent-panel/stores/agentPanel.store.ts client-vue/src/features/agent-panel/components/AgentChatView.vue client-vue/src/features/agent-panel/components/AgentChatComposer.vue
git commit -m "fix: keep agent stop control visible while sending"
```

## Task 6: Cancelamento Real No Backend

- [x] Testar em `server/src/core/routes/agent-chat.routes.test.ts` que cancelar uma execucao ativa chama `CancellationRegistry.cancel(executionId)` e encerra workflow/agent loop.
- [x] Testar que cancelar durante approval/resume nao deixa resume em background rodando sem stream.
- [x] Corrigir endpoint generico de cancelamento se ele so estiver matando stream e nao execucao.
- [x] Rodar:

```powershell
cd server
node --test src/core/routes/agent-chat.routes.test.ts src/core/routes/agent-panel.routes.test.ts
```

- [x] Commit:

```powershell
git add server/src/core/routes/agent-chat.routes.ts server/src/core/routes/agent-chat.routes.test.ts server/src/core/routes/agent-panel.routes.ts server/src/core/routes/agent-panel.routes.test.ts
git commit -m "fix: cancel active agent executions from panel"
```

## Task 7: Auditoria Core/Plugin Especifico

- [x] Rodar busca:

```powershell
rg -n "google_|gmail|drive|discord|application/vnd.google-apps|sailor-ollama|openai|openrouter" server/src/core server/src/shared
```

- [x] Classificar cada match:
  - OK em testes quando e apenas fixture/nome fake.
  - OK em adapter de model provider quando trata provider generico registrado por adapter.
  - Suspeito se Core/Engine tiver regra de negocio de plugin, method ou MIME especifico.
  - Bloqueante se Core/Engine tiver `if toolName === "google_*"` ou conversao especial de Drive/Gmail.
- [x] Remover qualquer regra especifica do Core/Engine.
- [x] Se a regra for de arquivo/binario, mover para contrato generico:

```ts
interface AgentBinaryRef {
  ref: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
}
```

- [x] Se a regra for de export/download Google Drive, manter no plugin `server/src/plugins/sailor/google-drive/**`.
- [x] Se a regra for de envio de attachment Gmail, manter no plugin Gmail ou no contrato generico de `x-input-type: "file"`, nunca no Tools Agent por nome de Gmail.
- [x] Adicionar teste em `server/src/core/modules/agent-runtime/plugin-tool-executor.test.ts` garantindo que refs binarios funcionam com qualquer plugin ficticio.
- [x] Commit:

```powershell
git add server/src/core/modules/agent-runtime server/src/core/modules/workflows server/src/shared
git commit -m "refactor: keep agent runtime plugin generic"
```

## Task 8: Verificacao Final

- [x] Rodar testes focados:

```powershell
cd server
node --test src/core/modules/workflows/executor.test.ts src/core/modules/agent-runtime/agent-graph-builder.test.ts src/core/modules/agent-runtime/plugin-tool-executor.test.ts src/core/routes/agent-panel.routes.test.ts src/core/routes/agent-chat.routes.test.ts
```

- [x] Rodar testes frontend focados:

```powershell
cd client-vue
node --test src/features/agent-panel/__tests__/agentPanel.contract.test.ts
```

- [x] Rodar builds:

```powershell
cd server
npm run build
cd ../client-vue
npm run build
```

- [x] Rodar diff check:

```powershell
git diff --check
```

- [x] Teste manual:
  - pedir Drive download + Gmail send;
  - aprovar Gmail;
  - confirmar que nao repete Drive;
  - confirmar que Gmail executa;
  - confirmar que Stop aparece enquanto executa;
  - confirmar GPU/RAM cai depois da execucao ou cancelamento.

## Criterios De Aceite

- Depois de aprovar uma tool, o agent nao reexecuta tools ja concluidas.
- O step seguinte aparece em menos de 1.5s quando nao ha tool/model realmente rodando.
- Stop aparece sempre durante `sending`.
- Stop cancela stream local e execucao backend quando houver execution id.
- Core/Engines nao contem regra especifica de Drive/Gmail/Discord ou MIME Google.
- Plugins continuam sem importar ou chamar Core/Engines.
- Todos os testes e builds focados passam.
