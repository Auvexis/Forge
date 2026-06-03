# Tools Agent Plan Executor Rewrite

Goal: reescrever o Tools Agent para usar `LLM gera plano uma vez -> executor deterministico roda tools -> LLM repara/finaliza somente quando necessario`.

Rules:
- Trabalhar em `dev`.
- Fazer TDD por task.
- Commitar ao fim de cada fatia.
- Refazer o Tools Agent de verdade, nao adaptar a arquitetura antiga com remendos.
- Excluir arquivos, funcoes, testes e caminhos mortos da arquitetura antiga assim que o novo fluxo substituir o uso.
- Nao deixar resquicios do loop antigo `LLM -> tool -> LLM -> tool` em caminho de producao.
- Nao manter codigo duplicado "por garantia"; se nao for usado pelo novo fluxo ou por compatibilidade explicita, remover.
- Seguir clean code, SRP e nomes claros; cada modulo novo deve ter responsabilidade unica.
- Preferir contratos pequenos e testaveis: generator, executor, repairer, choice detector, chat file store.
- Nao criar abstracao antes da necessidade real, mas separar fronteiras quando reduz risco ou complexidade.
- Nao usar heuristica fragil quando o manifest puder declarar o comportamento.
- Erros devem ser classificados de forma deterministica antes de chamar LLM para repair.
- Nao criar acoplamento especifico de Drive/Gmail/Discord no Core.
- Plugins continuam genericos e nao importam Core/Engines.
- Manifest dos plugins deve guiar schema, selection, approval e UI.

## Estado Atual

- [x] Criado core inicial do plan executor.
- [x] Criado `AgentChoiceDetector` com selection explicita por manifest.
- [x] Criado `AgentPlanExecutor` minimo deterministico.
- [x] Criados testes focados do detector e executor.
- [x] Commit feito: `fcca4ce8 feat: add deterministic agent plan executor core`.

Arquivos ja criados:
- `server/src/core/modules/agent-runtime/plan/agent-plan-types.ts`
- `server/src/core/modules/agent-runtime/plan/agent-choice-detector.ts`
- `server/src/core/modules/agent-runtime/plan/agent-choice-detector.test.ts`
- `server/src/core/modules/agent-runtime/plan/agent-plan-executor.ts`
- `server/src/core/modules/agent-runtime/plan/agent-plan-executor.test.ts`

## Task 1 - Base Do Plan Executor

- [x] Criar tipos base:
  - `AgentPlan`
  - `AgentPlanStep`
  - `AgentPlanTool`
  - `AgentToolSelection`
  - `AgentPlanExecutionResult`
- [x] Criar teste vermelho para detectar multiplas opcoes somente com `agentTool.selection`.
- [x] Criar `AgentChoiceDetector`.
- [x] Criar teste vermelho para plano `Drive list -> Drive download -> Gmail send`.
- [x] Criar `AgentPlanExecutor` minimo.
- [x] Resolver refs estilo `$steps.search[0].id`.
- [x] Emitir lifecycle:
  - `agent:tool-intent`
  - `agent:tool-start`
  - `agent:tool-end`
  - `agent:tool-retry`
- [x] Testar repair de parametro uma vez.
- [x] Rodar:
  - `node --test src/core/modules/agent-runtime/plan/agent-choice-detector.test.ts`
  - `node --test src/core/modules/agent-runtime/plan/agent-plan-executor.test.ts`
- [x] Commitar.

## Task 2 - Agent Plan Generator

- [x] Criar `agent-plan-generator.test.ts`.
- [x] Criar contrato `AgentPlanModel`.
- [x] Criar `AgentPlanGenerator`.
- [x] O generator deve chamar modelo uma vez para gerar plano completo.
- [x] Plano deve conter:
  - `steps[].id`
  - `steps[].toolName`
  - `steps[].params`
  - `steps[].reason`
- [x] Prompt deve usar catalogo compacto das tools conectadas.
- [x] Prompt deve instruir refs para outputs anteriores:
  - `$steps.<stepId>`
  - `$steps.<stepId>.<field>`
  - `$steps.<stepId>[0].<field>`
- [x] Validar plano contra tools conectadas antes de executar.
- [x] Rejeitar tool inexistente.
- [x] Rejeitar plano vazio quando existem tools necessarias.
- [x] Emitir/salvar mensagens:
  - `Thinking`
  - `Generating Plan`
  - `Choosing the best tools`
- [x] Rodar teste focado.
- [x] Commitar.

## Task 3 - Agent Plan Repairer

- [x] Criar `agent-plan-repairer.test.ts`.
- [x] Criar `AgentPlanRepairer`.
- [x] Repairer recebe:
  - plano original
  - step que falhou
  - erro exato
  - outputs anteriores
  - schema da tool
- [x] Repairer retorna somente patch de params.
- [x] Repairer so roda para erro reparavel:
  - schema/params invalidos
  - valor ausente
  - ref resolvida como `undefined`
- [x] Repairer nao roda para:
  - auth
  - permission
  - approval rejected
  - not found irreparavel
- [x] Limite: 1 repair por step.
- [x] Emitir/salvar:
  - `Analyzing errors`
  - `Creating new parameters`
- [x] Rodar teste focado.
- [x] Commitar.

## Task 4 - Manifest Selection

- [x] Atualizar schema do loader para aceitar `agentTool.selection`.
- [x] Tipar em `SailorAgentToolDefinition`.
- [x] Propagar selection em `plugin-tool-adapter.ts`.
- [x] Propagar selection em `AgentToolRegistry.resolveConfiguredTools`.
- [x] Adicionar selection no Google Drive `listFiles`:
  - `path: "$"`
  - `labelFields: ["name"]`
  - `valueField: "id"`
  - `mode: "single"`
- [x] Adicionar teste de loader aceitando selection.
- [x] Adicionar teste de adapter propagando selection.
- [x] Sem heuristica por array sem manifest.
- [x] Rodar testes de loader/adapter/choice detector.
- [x] Commitar.

## Task 5 - Approval No Executor Novo

- [x] Criar teste: step com `requiresApproval` pausa antes de `invoke`.
- [x] Criar resultado `waiting-approval`.
- [x] Criar/emitir approval request com:
  - `approvalId`
  - `executionId`
  - `toolName`
  - `sideEffect`
  - args sanitizados
- [x] Approval aprovado continua do mesmo step.
- [x] Approval rejeitado encerra sem executar.
- [x] Nao repetir steps anteriores.
- [x] Persistir card `agentApproval`.
- [x] Rodar testes focados.
- [x] Commitar.

## Task 6 - AgentRunner Usa Plano Novo

- [x] Atualizar testes de `agent-runner.test.ts`.
- [x] `AgentRunner` deve resolver model/tools/memory como hoje.
- [x] Default runner usa:
  - `AgentPlanGenerator`
  - `AgentPlanExecutor`
  - `AgentPlanRepairer`
- [x] Remover default para `buildAgentGraph`.
- [x] Manter seam de teste apenas se necessario.
- [x] Emitir eventos de UX:
  - `agent:thinking`
  - `agent:plan-start`
  - `agent:plan-end`
  - `agent:repair-start`
  - `agent:repair-end`
- [x] Garantir que nao existe LLM entre tools em teste.
- [x] Rodar `agent-runner.test.ts`.
- [x] Commitar.

## Task 7 - Remover Loop Antigo

- [x] Remover `invokeCompactJsonToolLoop`.
- [x] Remover parameterizacao por LLM a cada tool.
- [x] Remover retry baseado em nova chamada de modelo por tool.
- [x] Remover hacks de repeated search do graph antigo quando substituidos por choice detector.
- [x] Manter somente utilitarios ainda usados ou mover para plan modules.
- [x] Ajustar testes antigos para novo contrato.
- [x] Rodar `agent-graph-builder.test.ts` ou remover testes obsoletos com substitutos no plan executor.
- [x] Commitar.

## Task 8 - Ollama Adapter Novo

- [ ] Atualizar `agent-model-adapter.ts`.
- [ ] Adicionar metodos:
  - `generatePlan`
  - `repairPlanStep`
  - `generateFinalResponse`
- [ ] Refatorar `ollama-adapter.ts` para esses metodos.
- [ ] Remover semantica de `invokeToolPlan` do loop antigo.
- [ ] Testar JSON invalido em cada chamada.
- [ ] Testar schema format enviado ao Ollama.
- [ ] Rodar `ollama-adapter.test.ts`.
- [ ] Commitar.

## Task 9 - Chat File Store

- [ ] Criar `AgentChatFileStore`.
- [ ] Salvar chats em:
  - `profiles/<profileId>/chats/<chatId>/chat.json`
- [ ] Criar pasta do chat ao criar session.
- [ ] Estrutura minima:
  - `session`
  - `messages`
  - `executions`
  - `updatedAt`
- [ ] Remover dependencia de `agent_chat_sessions` e `agent_chat_messages` para novos chats.
- [ ] Nao precisa migrar chats antigos.
- [ ] Delete chat remove pasta do chat.
- [ ] Testar create/list/get/append/delete.
- [ ] Commitar.

## Task 10 - Short Term Memory Por Chat

- [ ] Resolver caminho de memory:
  - `profiles/<profileId>/chats/<chatId>/memory.sqlite`
- [ ] Quando memory adapter for `sailor-internal`, passar esse caminho no `AgentRunInput.checkpointerDbPath`.
- [ ] Garantir que cada chat tem memory isolada.
- [ ] Delete chat com `memoryMode=session` remove `memory.sqlite`.
- [ ] Testar isolamento entre dois chats.
- [ ] Commitar.

## Task 11 - Agent Panel Stream Persistido

- [ ] Atualizar `agent-panel.routes.ts` para persistir todo evento de UX.
- [ ] Progress salvo no arquivo de chat imediatamente.
- [ ] Approval salvo no arquivo de chat imediatamente.
- [ ] Choice salvo no arquivo de chat imediatamente.
- [ ] Erro salvo no arquivo de chat imediatamente.
- [ ] Fechar painel e reabrir deve recarregar tudo do `chat.json`.
- [ ] Testar SSE + persistencia.
- [ ] Commitar.

## Task 12 - Frontend Choice UI

- [ ] Adicionar tipo `AgentPanelChoiceContent`.
- [ ] Adicionar stream event `choice`.
- [ ] Renderizar card de escolha no chat.
- [ ] Ao clicar opcao, enviar continuation com valor selecionado.
- [ ] Nao enviar texto fake tipo `Use X` como prompt novo.
- [ ] Persistir decisao escolhida no card.
- [ ] Testar contract no `agentPanel.contract.test.ts`.
- [ ] Commitar.

## Task 13 - Frontend Progress UX

- [ ] Renderizar mensagens:
  - `Thinking`
  - `Generating Plan`
  - `Choosing the best tools`
  - `Generating parameters`
  - `Executing`
  - `Success`
  - `Analyzing errors`
  - `Creating new parameters`
- [ ] Usar `agentProgress` persistido.
- [ ] Nao depender de pending local para progress real.
- [ ] Stop continua visivel durante execucao.
- [ ] Ao trocar/fechar chat, mensagens persistidas voltam iguais.
- [ ] Testar contract.
- [ ] Commitar.

## Task 14 - Final Response

- [ ] Criar gerador de resposta final.
- [ ] Input:
  - pedido do usuario
  - plano executado
  - outputs resumidos
  - errors/choices/approvals
- [ ] Output: texto curto em linguagem natural.
- [ ] Se `skipFinalResponseAfterToolUse` true, nao gerar final.
- [ ] Persistir resposta final.
- [ ] Testar.
- [ ] Commitar.

## Task 15 - Limpeza Da Arquitetura Antiga

- [ ] Rodar busca:
  - `rg -n "invokeCompactJsonToolLoop|generateValidatedToolArgs|buildCompactPlannerMessages|buildToolParameterMessages|toolHistory|shouldStopRepeatedToolCall" server/src/core`
- [ ] Remover codigo morto.
- [ ] Remover testes obsoletos que validam comportamento antigo.
- [ ] Garantir que nenhum fluxo de producao chama LLM entre tools.
- [ ] Garantir que Core nao tem regra especifica de plugin.
- [ ] Rodar testes focados.
- [ ] Commitar.

## Task 16 - Verificacao Final

- [ ] Backend:
  - `node --test src/core/modules/agent-runtime/plan/*.test.ts`
  - `node --test src/core/modules/agent-runtime/agent-runner.test.ts`
  - `node --test src/core/routes/agent-panel.routes.test.ts`
  - `node --test src/core/routes/agent-chat.routes.test.ts`
- [ ] Frontend:
  - `node --test src/features/agent-panel/__tests__/agentPanel.contract.test.ts`
- [ ] Builds:
  - `cd server && npm run build`
  - `cd client-vue && npm run build`
- [ ] Diff:
  - `git diff --check`
- [ ] Manual:
  - pedir Drive list/download + Gmail send
  - confirmar progress imediato
  - confirmar sem LLM entre tools
  - confirmar approval sem replay
  - confirmar escolha por opcoes quando Drive retorna varios arquivos
  - confirmar chat persiste ao fechar/reabrir
- [ ] Commit final se houver ajustes.
