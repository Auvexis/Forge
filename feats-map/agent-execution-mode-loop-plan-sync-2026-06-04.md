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

## Task 7 - Bugfix Retry E Live Progress

- [x] Classificar erro de validacao de plugin como `AGENT_TOOL_ARGS_INVALID`.
- [x] Fazer loop retry em erro de validacao de tool.
- [x] Garantir que stream aguarda progress antes de emitir erro terminal.
- [x] Rodar testes backend focados.
- [x] Commitar.

## Task 8 - Bugfix Invalid JSON No Loop

- [x] Criar teste para retry quando modelo retorna JSON invalido na decisao do loop.
- [x] Rechamar decisao do loop uma vez com instrucao JSON mais estrita.
- [x] Melhorar schema/prompt do loop para reduzir JSON malformado no Ollama.
- [x] Rodar testes focados e build backend.
- [x] Commitar.

## Task 9 - Tool Steps Dinamicos

- [x] Fazer loop retry para `File not found` de tool.
- [x] Incluir params sanitizados nos eventos `agent:tool-intent/start`.
- [x] Incluir output sanitizado nos eventos `agent:tool-end`.
- [x] Renderizar step de tool persistente com details colapsavel no chat.
- [x] Rodar testes focados e commit.

## Task 10 - Retry Error Step E Timeline UX

- [x] Mostrar erro vermelho do step antes do retry.
- [x] Evitar que erro terminal sobrescreva todos os steps pendentes.
- [x] Colocar botao expand/collapse com `LucideIcon` ao lado do texto do step.
- [x] Adicionar transicao suave ao expand/collapse dos details.
- [x] Rodar testes focados, builds e commit.

## Task 11 - Approval Continuation Sem Falso Sucesso

- [x] Criar teste para approval-complete sem resultado nao escrever `Concluido.`.
- [x] Fazer approval stream exigir `done`/`waiting-approval`/delta real antes de mensagem final.
- [x] Mostrar erro claro quando continuation de approval falhar ou nao retornar resultado.
- [x] Rodar testes focados e builds.
- [x] Commitar.

## Task 12 - File Ref Cache Para Attachments

- [x] Fazer download de plugin virar file ref local persistente no cache do chat.
- [x] Ensinar loop a mostrar refs de arquivo para o modelo em vez de metadado fake.
- [x] Resolver refs de arquivo antes de chamar tools como Gmail.
- [x] Garantir approval usa refs persistentes, nao Buffer/base64 bruto.
- [x] Rodar testes focados, builds e commit.

## Task 13 - Guard Contra Final Prematuro No Loop

- [x] Criar teste reproduzindo `listFiles` concluido e resposta final falsa antes de `downloadFile` + `sendMessage`.
- [x] Extrair objetivos obrigatorios da intencao do usuario em passos textuais simples, sem buzz words fixas.
- [x] Bloquear `final` do modelo quando ainda faltam tools obrigatorias para cumprir a intencao.
- [x] Fazer o loop pedir pro modelo continuar com a proxima tool quando tentar finalizar cedo.
- [x] Mostrar erro claro se o modelo insistir em finalizar sem cumprir os objetivos.
- [x] Rodar testes focados, builds e commit.

## Task 14 - Continuidade Real Entre Outputs De Tools

- [x] Garantir que output de `google_drive_list_files` alimenta selecao real de arquivo do proximo step.
- [x] Garantir que output/cache de `google_drive_download_file` alimenta attachment real do Gmail.
- [x] Evitar que o modelo invente ids, filenames ou attachments quando existe output de tool anterior.
- [x] Sanitizar outputs grandes sem esconder refs pequenas e uteis para a proxima tool.
- [x] Rodar testes focados, builds e commit.

## Task 15 - Timeline Final Correta

- [x] Nao renderizar mensagem final antes de todos os steps obrigatorios terminarem.
- [x] Persistir `downloadFile` e `sendMessage` na timeline junto com `listFiles`.
- [x] Mostrar "completed" apenas quando a ultima tool obrigatoria tiver sucesso confirmado.
- [x] Se uma tool falhar depois de retry, finalizar com erro, nao com resposta positiva.
- [x] Rodar testes focados, builds e commit.

## Proximas 5 Tasks Sugeridas

1. Comecar Task 12 com teste vermelho para attachment fake sem cache persistente.
2. Implementar file ref cache por chat/sessao em AppData/macOS/Linux.
3. Resolver file refs antes da invocacao de plugin, incluindo continuation de approval.
4. Comecar Task 13 com teste vermelho para final prematuro depois de `google_drive_list_files`.
5. Corrigir o loop para continuar ate `downloadFile` + `google_gmail_send_message` ou erro real.

## Task 16 - Approval Deve Persistir File Ref, Nao Stream Sanitizado

- [x] Criar teste reproduzindo approval com attachment virando `{ type: "Readable" }`.
- [x] Nao resolver `agent-file://` antes de uma tool que ainda vai pedir approval.
- [x] Manter refs pequenas no request de approval para continuar depois.
- [x] Resolver refs para stream real somente na execucao aprovada.
- [x] Rodar testes focados, builds e commit.
