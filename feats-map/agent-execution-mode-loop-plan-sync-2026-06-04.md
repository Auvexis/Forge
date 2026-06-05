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

## Task 17 - Pos-Approval Persistente E Cleanup De Cache

- [x] Criar teste para approval resolvido nao voltar como pendente ao reabrir chat.
- [x] Persistir mensagem/summary final da continuation aprovada no historico do chat.
- [x] Evitar duplicar card de approval pendente quando ja existe resolucao aprovada/rejeitada.
- [x] Criar teste para cleanup de `cache/files` depois de sucesso final.
- [x] Limpar refs de arquivo persistentes quando a execucao aprovada concluir com sucesso.
- [x] Rodar testes focados, builds e commit.

## Task 18 - Maximum Retries Per Tool/Step

- [x] Adicionar `maxRetriesPerTool` no config do AI Agent com default 3, minimo 0 e maximo 100.
- [x] Mostrar campo no editor do Tools Agent dentro de Execution Limits.
- [x] Propagar o valor do node para AgentRunner.
- [x] Fazer Plan Executor respeitar o limite por step.
- [x] Fazer Loop Runner respeitar o limite por tool/error.
- [x] Rodar testes focados, builds e commit.

## Task 19 - Guard Contra Tool De Sucesso Duplicada No Loop

- [x] Criar teste vermelho para tool ja concluida nao executar de novo com mesmos params.
- [x] Registrar instrucao no historico para o modelo usar o output anterior e seguir para o proximo step.
- [x] Manter `maxRetriesPerTool` restrito a erros reparaveis, nao a sucessos duplicados.
- [x] Rodar testes focados, build e commit.

## Task 20 - Fallback Deterministico Quando Ollama Falha Entre Steps

- [x] Criar teste vermelho para erro `AGENT_MODEL_PROVIDER_ERROR` apos resultado unico selecionavel.
- [x] Inferir proxima tool obrigatoria usando `selection` do output anterior e `inputSchema` da proxima tool.
- [x] Executar fallback somente quando houver uma unica opcao clara, sem regra especifica de plugin.
- [x] Rodar testes focados, build e commit.

## Task 21 - Param Schema Rico No Loop Sem Fallback De Provider

- [x] Remover fallback deterministico para erro real do provider.
- [x] Criar teste para `enum`, `default` e `description` aparecerem no prompt de tools.
- [x] Criar teste garantindo que `AGENT_MODEL_PROVIDER_ERROR` continua visivel.
- [x] Atualizar resumo de params sem mandar schema gigante.
- [x] Rodar testes focados, build e commit.

## Task 22 - Ref Obrigatorio Antes De Approval Com Arquivo Baixado

- [x] Criar teste para params de approval com attachment sem `agent-file://` serem recusados antes do approval.
- [x] Registrar erro no historico orientando usar o ref real ja baixado.
- [x] Permitir nova decisao do modelo com o ref correto antes de pedir approval.
- [x] Manter regra generica para parametros tipo file/attachment, sem Drive/Gmail especifico.
- [x] Rodar testes focados, build e commit.

## Task 23 - Duplicado Deve Ignorar Params Fora Do Schema

- [x] Criar teste para mesma tool com mesmo parametro real e campo extra nao executar de novo.
- [x] Gerar chave de sucesso usando apenas propriedades declaradas no `inputSchema`.
- [x] Manter fallback para params completos quando a tool nao declarar properties.
- [x] Rodar testes focados, build e commit.

## Task 24 - Loop Nao Pode Ficar RUNNING Entre Tools

- [x] Criar teste para decisao do modelo pendurada depois de tool bem-sucedida.
- [x] Passar `AbortSignal` para `invokeJson` do loop via adapter runtime.
- [x] Aplicar timeout por decisao do loop para transformar hang em erro visivel.
- [x] Propagar `abortSignal` e `timeoutMs` do agente para o loop.
- [x] Rodar testes focados, build e commit.

## Task 25 - Approval No Meio Do Loop Deve Continuar

- [x] Criar teste para workflow `download -> email approval -> upload -> email approval` continuar apos primeira approval.
- [x] Persistir estado generico do loop no request de approval.
- [x] Retomar historico, toolCalls e guard de duplicados depois da approval.
- [x] Manter compatibilidade com approvals antigas sem estado.
- [x] Rodar testes focados, build e commit.

## Task 26 - Intent Forte Com Tools Nao Pode Virar Chat

- [x] Criar teste para pedido multi-tool em PT com Drive/Gmail/YouTube nao responder que nao ha ferramentas.
- [x] Forcar `tool_plan` quando heuristica local encontra verbo de tool e tools conectadas.
- [x] Manter perguntas simples e catalogo de tools como chat direto.
- [x] Rodar testes focados, build e commit.

## Task 27 - Status Visivel Entre Steps Do Loop

- [x] Criar teste para emitir status enquanto o loop espera a proxima decisao do modelo.
- [x] Emitir `agent:thinking` antes de cada decisao do loop.
- [x] Garantir que o stream persiste/renderiza o status com shimmer existente.
- [x] Rodar testes focados, build e commit.

## Task 28 - Evitar Replay De Download E Melhorar Status Live

- [x] Criar teste para nao repetir uma tool de leitura/download ja concluida apos approval quando ainda ha side-effect pendente.
- [x] Bloquear repeticao generica de ferramenta read/fetch ja concluida e orientar o modelo a consumir o output anterior.
- [x] Ajustar UI para status nao-tool trocar na mesma linha com animacao vertical.
- [x] Fazer icone Lucide de loading girar durante status running/retrying.
- [x] Rodar testes focados, build e commit.

## Task 29 - Plan Default E Approval Deterministico

- [x] Criar teste para `plan` pausar approval via WorkflowEngine com resumeState contendo plano, step e outputs.
- [x] Retomar approval do `plan` sem regenerar plano e sem repetir steps anteriores.
- [x] Trocar default de Tools Agent/Global Agent para `plan`.
- [x] Garantir que pedidos com duas chamadas da mesma tool continuam no plano deterministico.
- [x] Rodar testes focados, build e commit.

## Task 30 - Loop Default E Plan Opcional

- [x] Reverter default do Tools Agent/Global Agent para `loop`.
- [x] Manter `plan` disponivel e com approval resume deterministico.
- [x] Atualizar contratos backend/frontend para default `loop`.
- [x] Rodar testes focados, build e commit.
