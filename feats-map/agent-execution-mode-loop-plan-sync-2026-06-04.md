# Agent Execution Mode Loop Plan Sync - 2026-06-04

Goal: adicionar modo de execucao `loop | plan` no Tools Agent, com default `loop`, sincronizado entre editor e Global Agent Chat.

Rules:
- Trabalhar em `dev`.
- Fazer TDD antes da implementacao.
- Commitar ao fim da fatia.
- Default do Tools Agent deve ser `loop`.
- Composer do Global Agent Chat e editor do Tools Agent devem ler/escrever o mesmo campo do node.
- Separar caminho de runtime loop e plan em arquivos proprios.
- Nao enviar binarios grandes para LLM no modo loop.

## Task 1 - Campo De Modo No Agent

- [x] Criar testes/contratos vermelhos para default `loop`, modo `plan`, summary publicado e UI sync.
- [x] Adicionar tipos backend/frontend para `executionMode: "loop" | "plan"`.
- [x] Validar config com default `loop`.
- [x] Propagar node handler para `AgentRunInput.agent`.
- [x] Expor modo no PublishedAgentSummary.
- [x] Adicionar select no editor do Tools Agent.
- [x] Adicionar dropdown no composer do Global Agent Chat.
- [x] Enviar `executionMode` no payload do Global Agent Chat.
- [x] Iniciar persistencia do modo do composer no node do workflow.
- [x] Finalizar passagem de `executionMode` no backend `agent-panel.routes.ts` sem erro de tipo.
- [x] Reexecutar testes vermelhos e deixar verdes.
- [x] Ajustar contratos se algum regex ficou fragil.

## Task 2 - Runtime Loop Separado

- [x] Criar `agent-loop-runner.ts`.
- [x] Criar `agent-plan-runner.ts` para isolar o modo atual.
- [x] Criar serializer textual compacto por linhas.
- [x] Criar sanitizer que oculta Buffer/base64/blob/arquivos grandes.
- [x] Fazer `AgentRunner` escolher loop ou plan por `agent.executionMode`.
- [x] Testar retry por erro reparavel no loop.
- [x] Garantir que triggers webhook/cron/plugin usam default `loop`.

### Fatia Atual - 5 Tasks

- [x] Criar testes vermelhos para selecao `loop | plan` no `AgentRunner`.
- [x] Criar testes vermelhos para serializer/sanitizer textual do modo loop.
- [x] Implementar `agent-plan-runner.ts` isolando o fluxo plan atual.
- [x] Implementar `agent-loop-runner.ts` com retry simples por erro reparavel.
- [x] Ligar `AgentRunner` no modo correto e verificar default `loop`.

## Task 3 - Verificacao

- [x] Rodar testes backend focados.
- [x] Rodar testes frontend focados.
- [x] Rodar builds.
- [x] Commitar.

## Estado Atual Ao Pausar

Arquivos alterados nesta fatia:
- `server/src/core/modules/agent-runtime/agent-types.ts`
- `server/src/shared/models/workflow-types.ts`
- `server/src/core/modules/agent-runtime/agent-validation.ts`
- `server/src/core/nodes/handlers/ai-agent.ts`
- `server/src/core/modules/agent-runtime/directory/published-agent-directory.ts`
- `server/src/core/routes/agent-panel.routes.ts`
- `client-vue/src/core/types/workflow.types.ts`
- `client-vue/src/features/agent-runtime/types/agent.types.ts`
- `client-vue/src/features/workflow-editor/components/settings/editors/AiAgentEditor.vue`
- `client-vue/src/features/workflow-editor/components/SailorWorkflowCanvas.vue`
- `client-vue/src/features/agent-panel/types/agent-panel.types.ts`
- `client-vue/src/core/api/agent-panel.api.ts`
- `client-vue/src/features/agent-panel/stores/agentPanel.store.ts`
- `client-vue/src/features/agent-panel/components/AgentChatView.vue`
- `client-vue/src/features/agent-panel/components/AgentChatComposer.vue`

Testes criados/alterados:
- `server/src/core/modules/agent-runtime/agent-validation.test.ts`
- `server/src/core/modules/agent-runtime/directory/published-agent-directory.test.ts`
- `client-vue/src/features/workflow-editor/components/settings/editors/__tests__/agentEditors.contract.test.ts`
- `client-vue/src/features/agent-panel/__tests__/agentPanel.contract.test.ts`

Ultimo resultado de testes:
- Backend focado passou:
  - `node --test src/core/modules/agent-runtime/agent-validation.test.ts src/core/modules/agent-runtime/directory/published-agent-directory.test.ts src/core/nodes/handlers/ai-agent.test.ts src/core/routes/agent-panel.routes.test.ts`
- Frontend focado passou:
  - `node --test src/features/workflow-editor/components/settings/editors/__tests__/agentEditors.contract.test.ts src/features/agent-panel/__tests__/agentPanel.contract.test.ts`
- Builds passaram:
  - `cd server && npm run build`
  - `cd client-vue && npm run build`

Resultado Task 2:
- Runtime `plan` isolado em `server/src/core/modules/agent-runtime/plan/agent-plan-runner.ts`.
- Runtime `loop` criado em `server/src/core/modules/agent-runtime/loop/agent-loop-runner.ts`.
- Serializer/sanitizer criado em `server/src/core/modules/agent-runtime/loop/agent-tool-result-sanitizer.ts`.
- `AgentRunner` escolhe `plan` somente quando `agent.executionMode === "plan"`; default validado continua `loop`.
- Testes focados passaram:
  - `node --test src/core/modules/agent-runtime/agent-runner.test.ts src/core/modules/agent-runtime/loop/agent-tool-result-sanitizer.test.ts src/core/modules/agent-runtime/loop/agent-loop-runner.test.ts src/core/modules/agent-runtime/plan/agent-plan-generator.test.ts src/core/modules/agent-runtime/plan/agent-plan-executor.test.ts src/core/modules/agent-runtime/plan/agent-plan-repairer.test.ts src/core/modules/agent-runtime/plan/agent-final-response-generator.test.ts src/core/modules/agent-runtime/intent/agent-intent-router.test.ts`
- Backend build passou:
  - `cd server && npm run build`

## Task 4 - Bugfix Loop Decision

- [x] Criar teste reproduzindo resposta de loop com aliases comuns do modelo.
- [x] Aceitar `tool_call`, `tool`, `arguments`, `input`, `final_answer` e `message`.
- [x] Manter erro claro quando a decisao nao for parseavel.
- [x] Rodar testes focados do loop/runner.
- [x] Commitar.

## Task 5 - Bugfix Erro Local No Chat

- [x] Criar contrato para erro de stream encerrar progress local.
- [x] Inserir `agentError` local imediatamente quando stream retorna erro.
- [x] Marcar progress `planned/running/retrying` como `failed` no catch.
- [x] Aplicar mesma regra em continuation de choice.
- [x] Rodar testes frontend focados e commit.

## Task 6 - Bugfix Loop Decision Formatos Reais

- [x] Criar teste para resposta tipo plano `steps[]` no modo loop.
- [x] Criar teste para resposta tipo OpenAI `tool_calls[]`.
- [x] Aceitar `parameters` e `function.arguments`.
- [x] Melhorar prompt do loop com exemplos JSON estritos.
- [x] Rodar testes focados e commit.

Proximas 5 tasks sugeridas:
1. Finalizar `agent-panel.routes.ts` passando `executionMode` ate `AgentPanelChatService.sendMessage`.
2. Atualizar `AgentPanelChatService` para colocar `executionMode` no trigger payload.
3. Rodar e corrigir testes focados de tipos/editor/composer/default.
4. Commitar Task 1 completa.
5. Comecar Task 2 criando `agent-tool-result-sanitizer.ts` com testes.
