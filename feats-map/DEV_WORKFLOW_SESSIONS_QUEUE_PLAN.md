# Dev Workflow Sessions + In-Memory Queue

## Objetivo

Implementar o modo "Run Manual" como uma sessao temporaria de desenvolvimento, capaz de manter todos os triggers habilitados de um workflow ativos ao mesmo tempo, com jobs em paralelo e parada automatica quando o editor desconectar.

Esse modo deve simular o comportamento de um workflow publicado, mas sem persistir runtime quando o dev fecha o editor. Publish continua sendo o modo persistente.

## Decisao Aprovada

Usar a opcao 1:

- Sessao dev em memoria.
- Fila em memoria.
- Concorrencia controlada.
- Interfaces limpas para trocar por BullMQ/Redis depois.

Nao usar `worker_threads` como base agora. Workflow aqui e majoritariamente I/O, eventos, webhooks, plugins, HTTP, forms e cron. Uma fila com concorrencia resolve melhor, com menos complexidade. `worker_threads` pode entrar depois para nodes CPU-bound, especialmente CodeNode pesado.

## Problema Atual

Hoje o frontend/backend tratam "Run" como uma execucao unica. Isso quebra a ideia de varios triggers porque:

- Apenas um trigger vira ponto inicial.
- A SSE fecha no primeiro `workflow:success`.
- O estado visual e global demais e pode pintar edges/nodes de outros ramos como sucesso.
- Webhook/form/plugin/cron precisam ficar aguardando eventos, mas a execucao atual tenta terminar.
- O botao Stop cancela uma execucao, nao uma sessao com multiplos listeners/jobs.

## Novo Modelo Mental

Run Manual nao e mais "execute workflow uma vez".

Run Manual passa a ser:

> "Abrir uma sessao de desenvolvimento para este workflow."

Enquanto a sessao estiver ativa:

- Trigger manual dispara uma execucao inicial.
- Trigger event fica inscrito para eventos internos.
- Trigger webhook aceita chamadas pela Public URL de teste.
- Trigger plugin registra o listener temporario do plugin.
- Trigger form aceita submit pela Public URL de teste.
- Wait For Form gera URL temporaria e espera submit como hoje, mas dentro de jobs da sessao.
- Trigger cron agenda e dispara jobs enquanto a sessao existir.
- Cada evento recebido cria um job novo na fila.
- Cada job roda somente o ramo conectado ao `triggerNodeId`.
- Jobs podem rodar em paralelo, com limite.
- Stop encerra tudo.
- Se o editor/SSE desconectar, encerra tudo automaticamente.

Publish continua separado:

- Publicado roda persistente.
- Nao depende do editor.
- Deve usar a mesma base arquitetural no futuro, mas com runtime persistente.

## Arquitetura Proposta

### 1. DevWorkflowSessionManager

Responsavel por criar, consultar e encerrar sessoes dev.

Responsabilidades:

- Criar `sessionId`.
- Guardar `workflowId`, `status`, timestamps e motivo de encerramento.
- Guardar lista de trigger runtimes ativos.
- Guardar fila da sessao.
- Fechar sessao quando:
  - usuario clica Stop;
  - SSE desconecta;
  - workflow e deletado;
  - workflow e salvo com mudancas invalidas para a sessao;
  - timeout defensivo acontece.

Nao deve executar nodes diretamente.

### 2. DevTriggerRuntime

Responsavel por ativar/desativar os triggers habilitados de uma sessao.

Por tipo:

- `manual`: enfileira um job inicial ao iniciar a sessao.
- `event`: registra listener no InternalEventBus e enfileira job quando evento bater.
- `webhook`: registra rota/payload handler em modo dev e enfileira job quando URL receber payload.
- `plugin`: ativa lifecycle temporario do plugin e enfileira job quando plugin emitir payload.
- `form`: registra form trigger em modo dev e enfileira job quando submit acontecer.
- `cron`: agenda job com node-cron somente durante a sessao.

Cada runtime precisa ter teardown idempotente.

### 3. ExecutionQueue

Fila em memoria por sessao.

Responsabilidades:

- Receber jobs com `sessionId`, `workflowId`, `triggerNodeId`, `payload`, `source`.
- Limitar concorrencia por sessao.
- Limitar concorrencia global.
- Evitar que jobs pendentes continuem depois do Stop.
- Emitir eventos:
  - `job:queued`
  - `job:start`
  - `job:success`
  - `job:failed`
  - `job:cancelled`

Trade-off:

- Em memoria e simples e rapido para dev.
- Se o servidor reiniciar, sessoes somem. Isso e aceitavel para Run Manual.
- Para publish escalavel real, depois trocar por BullMQ/Redis mantendo a interface.

### 4. WorkflowJobRunner

Responsavel por executar um job.

Fluxo:

- Recebe job.
- Gera ou usa `executionId`.
- Chama `WorkflowEngine.executeWorkflowFromTrigger`.
- Repassa eventos da execucao para a stream da sessao.
- Respeita cancelamento.

Nao deve conhecer detalhes de webhook/form/plugin. So executa ramo.

### 5. SessionEventStream

SSE por `sessionId`, nao por `executionId`.

Hoje a stream fecha no `workflow:success`. No novo modo dev, ela deve continuar aberta ate a sessao encerrar.

Eventos devem incluir:

- `session:start`
- `session:ready`
- `trigger:waiting`
- `trigger:received`
- `job:queued`
- `job:start`
- `node:start`
- `node:success`
- `node:failed`
- `job:success`
- `job:failed`
- `session:stopping`
- `session:stopped`

Cada evento de node deve carregar:

- `sessionId`
- `executionId`
- `triggerNodeId`
- `nodeId`
- `jobId`

Isso permite o frontend nao misturar ramos.

### 6. Frontend Execution Store

O store atual e centrado em uma execucao.

Precisamos evoluir para:

- `activeSessionId`
- `sessionStatus`
- `activeJobs`
- `nodeStatusesByExecution`
- `triggerStatuses`
- timeline agrupada por job/trigger

UX esperada:

- Botao Run vira "rodando" ate Stop.
- Toast de sucesso nao aparece no primeiro job. Deve aparecer no Stop ou em erro relevante.
- Triggers passivos mostram estado "waiting".
- Quando webhook/form/plugin recebe evento, aquele trigger pulsa/sinaliza recebido.
- Nodes do ramo executado ficam verdes apenas para aquele job.
- Edges de outros ramos nao ficam verdes.
- Logs mostram multiplos jobs.

## Rotas/API Propostas

### Criar sessao dev

`POST /workflows/:workflowId/dev-sessions`

Entrada:

- payload inicial opcional para manual trigger.

Saida:

- `sessionId`
- lista de triggers ativados
- URLs de teste para webhook/form/plugin quando aplicavel

Comportamento:

- Cria sessao.
- Ativa triggers.
- Enfileira triggers manuais.
- Retorna rapido para o frontend abrir SSE.

### Stream da sessao

`GET /workflows/dev-sessions/:sessionId/stream`

Comportamento:

- Mantem conexao aberta.
- Envia eventos de todos os jobs da sessao.
- Ao fechar conexao, para a sessao automaticamente.

### Stop da sessao

`POST /workflows/dev-sessions/:sessionId/stop`

Comportamento:

- Para listeners.
- Para cron jobs.
- Cancela pendentes.
- Solicita cancelamento dos jobs rodando.
- Emite `session:stopped`.

### Status da sessao

`GET /workflows/dev-sessions/:sessionId`

Util para debug e reconexao curta, se necessario.

## Integracao com URLs Publicas em Modo Dev

Webhook:

- `/webhook-test/:webhookPath` deve procurar primeiro sessoes dev ativas.
- Se achar trigger dev, enfileira job naquela sessao.
- Se nao achar, cai no comportamento atual.

Form:

- `/forms-test/:formId` deve resolver form trigger em sessao dev ativa.
- Submit enfileira job pelo `triggerNodeId` correto.
- Form publicado continua usando fluxo persistente.

Plugin Trigger:

- Ao iniciar sessao dev, ativar lifecycle temporario do plugin trigger.
- Ao parar sessao, desativar lifecycle temporario.
- O plugin nao deve saber se e dev ou publish; ele so recebe URL/callback generico.

Wait For Form:

- Continua sendo node no meio do fluxo.
- Quando job chega no Wait For Form, cria uma URL temporaria vinculada ao `executionId`.
- Submit libera aquele job especifico.
- Precisa respeitar Stop da sessao.

Cron:

- Cron dev existe apenas dentro da sessao.
- Deve usar o mesmo parser/validador de cron atual.
- Se cron dispara mais rapido que jobs terminam, fila controla concorrencia.

Event:

- Event trigger deve ouvir eventos internos enquanto sessao estiver ativa.
- Event node dentro de um workflow pode emitir evento.
- Esse evento pode disparar outro trigger event, inclusive no mesmo workflow, mas com protecao anti-loop.

## Seguranca e Estabilidade

### Limites

Adicionar limites configuraveis:

- max sessoes dev simultaneas;
- max jobs pendentes por sessao;
- max jobs concorrentes por sessao;
- max jobs concorrentes global;
- max tempo de sessao sem heartbeat;
- max tamanho de payload capturado;
- max eventos SSE em buffer.

### Cancelamento

Stop deve:

- marcar sessao como stopping;
- remover listeners primeiro;
- parar cron;
- rejeitar novos jobs;
- cancelar pendentes;
- sinalizar cancelamento para jobs rodando;
- encerrar SSE com `session:stopped`.

### Idempotencia

Todos os teardowns devem poder rodar mais de uma vez sem erro:

- SSE close;
- Stop manual;
- erro no plugin;
- workflow deleted;
- server shutdown.

### Isolamento

Uma sessao nao pode receber evento de outra.

Chaves de resolucao devem incluir:

- `sessionId` quando for dev;
- `workflowId`;
- `triggerNodeId`;
- `webhookPath`/`formSlug` quando aplicavel.

### Anti-loop

Event trigger pode causar loops.

Adicionar protecao:

- limite de encadeamento por job;
- opcionalmente `causationId`;
- contador por `sessionId + eventName`;
- erro claro quando limite for atingido.

## UX Esperada

### Botao Run

Ao clicar Run:

- salva workflow se necessario ou exige que esteja salvo;
- cria sessao dev;
- abre stream da sessao;
- botao vira Stop;
- triggers aparecem como:
  - manual: running/success apos execucao inicial;
  - webhook/plugin/form/event/cron: waiting;
  - disabled: disabled/ignored.

### Botao Stop

Ao clicar Stop:

- mostra estado "Stopping...";
- remove listeners;
- cancela fila;
- limpa estados running;
- mostra "Dev session stopped".

### Canvas

Nao pintar edges globais como sucesso.

Estado visual deve ser por job/execution:

- ultimo job pode pintar ramo executado;
- triggers waiting permanecem em waiting;
- outros ramos ficam idle;
- opcional: filtro/selector de execucao no painel de logs.

### Logs

Painel precisa mostrar:

- sessao;
- triggers ativos;
- jobs em ordem;
- cada job com origem:
  - manual;
  - webhook;
  - cron;
  - form;
  - plugin;
  - event.

Nao mostrar toast de workflow success para cada job em modo dev. Isso vira ruido.

## Trade-offs

### Por que in-memory agora

Vantagens:

- Menos infra.
- Mais rapido de implementar.
- Otimo para modo dev.
- Mais facil testar.
- Sem Redis obrigatorio.

Custos:

- Nao sobrevive restart.
- Nao escala entre multiplos processos.
- Nao serve como runtime persistente final de publish em cluster.

Mitigacao:

- Criar interfaces `ExecutionQueue` e `TriggerRuntime`.
- Nao acoplar engine ao storage da fila.
- Depois trocar implementacao por BullMQ/Redis.

### Por que nao worker_threads agora

Vantagens de worker_threads:

- Bom para CPU pesado.
- Isola travamentos de JS pesado.

Problemas agora:

- Mais dificil compartilhar plugins, DB e registries.
- Mais custo de serializacao.
- Nao resolve sozinho listeners/webhook/cron/session.
- Workflow e mais I/O-bound que CPU-bound.

Melhor caminho:

- Fila primeiro.
- Worker pool depois, atras da mesma interface, para nodes CPU-bound.

## Plano de Tasks

### Task 1 - Especificar contratos de sessao e job

- [x] Criar tipos server-side para `DevWorkflowSession`, `WorkflowJob`, `WorkflowJobStatus`, `SessionEvent`.
- [x] Definir estados de sessao: `starting`, `running`, `stopping`, `stopped`, `failed`.
- [x] Definir estados de job: `queued`, `running`, `success`, `failed`, `cancelled`.
- [x] Testar transicoes invalidas.
- [x] Commit.

### Task 2 - Criar ExecutionQueue in-memory

- [x] Criar fila por sessao.
- [x] Implementar concorrencia por sessao.
- [x] Implementar concorrencia global.
- [x] Rejeitar novos jobs quando sessao estiver stopping/stopped.
- [x] Cancelar jobs pendentes.
- [x] Testar ordem, concorrencia e cancelamento.
- [x] Commit.

### Task 3 - Criar WorkflowJobRunner

- [x] Encapsular chamada para `WorkflowEngine.executeWorkflowFromTrigger`.
- [x] Gerar `jobId` e `executionId`.
- [x] Propagar `triggerNodeId`, `payload`, `source`.
- [x] Integrar com CancellationRegistry.
- [x] Testar sucesso, falha e cancelamento.
- [x] Commit.

### Task 4 - Criar DevWorkflowSessionManager

- [x] Criar sessao.
- [x] Guardar registro em memoria.
- [x] Conectar sessao a uma fila.
- [x] Parar sessao com teardown idempotente.
- [x] Remover sessao depois de parada.
- [x] Testar start/stop/close duplicado.
- [x] Commit.

### Task 5 - Criar SessionEventBus/SSE

- [x] Criar bus por sessionId.
- [x] Encaminhar eventos de jobs e nodes.
- [x] Criar endpoint de stream por sessao.
- [x] Nao fechar SSE em `job:success`.
- [x] Fechar SSE apenas em `session:stopped` ou desconexao.
- [x] Testar stream continua apos primeiro job.
- [x] Commit.

### Task 6 - Adaptar Run Manual para criar sessao dev

- [x] Criar endpoint `POST /workflows/:workflowId/dev-sessions`.
- [x] Frontend chamar esse endpoint no Run.
- [x] Store guardar `activeSessionId`.
- [x] Botao Run virar Stop enquanto sessao ativa.
- [x] Testar que Run nao chama mais execucao unica antiga.
- [x] Commit.

### Task 7 - Ativar trigger manual na sessao

- [x] No start da sessao, listar triggers habilitados.
- [x] Enfileirar job inicial para triggers manuais.
- [x] Ignorar manual disabled.
- [x] Testar workflow com multiplos triggers e manual em qualquer ordem.
- [x] Commit.

### Task 8 - Ativar webhook dev

- [x] Registrar webhookPath/forma de resolucao para sessao dev.
- [x] Fazer `/webhook-test/:webhookPath` enfileirar job na sessao.
- [x] Garantir que trigger disabled nao registra.
- [x] Garantir que webhook publicado nao mistura com dev.
- [x] Testar payload e triggerNodeId corretos.
- [x] Commit.

### Task 9 - Ativar form trigger dev

- [x] Resolver `/forms-test/:formId` contra sessoes dev ativas.
- [x] Submit de form trigger enfileira job.
- [x] Manter comportamento publicado separado.
- [x] Testar formSlug duplicado/disabled.
- [x] Commit.

### Task 10 - Ativar cron dev

- [x] Registrar cron jobs por sessionId + triggerNodeId.
- [x] Enfileirar job a cada tick.
- [x] Parar cron no Stop/SSE close.
- [x] Testar que cron nao dispara apos stop.
- [x] Commit.

### Task 11 - Ativar event trigger dev

- [x] Registrar listener de evento interno por sessao.
- [x] Enfileirar job quando evento bater.
- [x] Adicionar protecao anti-loop basica.
- [x] Testar evento dispara ramo correto.
- [x] Commit.

### Task 12 - Ativar plugin trigger dev

- [x] Usar lifecycle temporario para plugin triggers da sessao.
- [x] Enfileirar job quando plugin emitir payload.
- [x] Teardown no Stop/SSE close.
- [x] Garantir que plugin nao conhece detalhes da sessao.
- [x] Testar ativacao e teardown com mock plugin.
- [x] Commit.

### Task 13 - Integrar Wait For Form com sessao

- [ ] Garantir que wait-form cria URL temporaria ligada ao executionId/jobId.
- [ ] Submit libera job correto.
- [ ] Stop cancela waits pendentes.
- [ ] Testar submit depois do Stop retorna erro claro.
- [ ] Commit.

### Task 14 - Corrigir estado visual de nodes e edges

- [ ] Mudar frontend para estado por `sessionId/jobId/executionId`.
- [ ] Nao marcar edges de ramos nao executados como success.
- [ ] Triggers passivos ficam waiting.
- [ ] Ultimo job pode destacar apenas seu ramo.
- [ ] Testar store com dois jobs de triggers diferentes.
- [ ] Commit.

### Task 15 - Melhorar painel de logs

- [ ] Agrupar eventos por job.
- [ ] Mostrar origem do job.
- [ ] Mostrar triggers ativos/waiting.
- [ ] Remover toast de success por job no modo dev.
- [ ] Testar timeline com jobs paralelos.
- [ ] Commit.

### Task 16 - Stop automatico ao desconectar

- [ ] SSE close chama stop da sessao.
- [ ] Stop manual fecha stream com evento final.
- [ ] Garantir teardown idempotente.
- [ ] Testar disconnect encerra cron/listeners/fila.
- [ ] Commit.

### Task 17 - Limites e hardening

- [ ] Adicionar limites de sessoes, jobs, payload e concorrencia.
- [ ] Adicionar logs de diagnostico.
- [ ] Adicionar cleanup em server shutdown.
- [ ] Testar limites e mensagens de erro.
- [ ] Commit.

### Task 18 - Regressao end-to-end local

- [ ] Criar workflow com manual, webhook, cron, form, plugin/event mock.
- [ ] Run deve manter sessao aberta.
- [ ] Manual deve rodar no start.
- [ ] Webhook deve rodar somente ao receber request.
- [ ] Form deve rodar somente no submit.
- [ ] Cron deve disparar enquanto sessao ativa.
- [ ] Stop deve encerrar tudo.
- [ ] Build backend e frontend.
- [ ] Commit final se houver ajustes.

## Criterios de Aceite

- Run Manual nao termina no primeiro trigger.
- SSE da sessao continua aberta apos jobs finalizados.
- Webhook/plugin/form/cron/event funcionam sem publish enquanto editor esta aberto.
- Fechar editor para sessao automaticamente.
- Stop para tudo.
- Cada trigger dispara apenas o ramo conectado nele.
- Jobs de triggers diferentes podem rodar em paralelo.
- Edges/nodes de outros ramos nao aparecem como sucesso falso.
- Triggers disabled nao registram e nao rodam.
- Workflow publicado continua funcionando como antes.
- Codigo fica modular, com engine limpa e sem logica de rota dentro da engine.

## Ordem Recomendada Para Amanha

1. Backend contratos + fila + session manager.
2. SSE de sessao.
3. Run Manual criando sessao.
4. Manual + webhook dev.
5. Stop automatico.
6. Cron/form/event/plugin.
7. UX visual dos estados.
8. Hardening e regressao completa.

## Riscos

- Misturar runtime dev com publish. Mitigacao: registries separados e nomes claros.
- SSE antiga por executionId conflitar com nova por sessionId. Mitigacao: manter execucao unica antiga para testes isolados, usar session stream no Run Manual.
- Plugin lifecycle temporario ficar ativo apos disconnect. Mitigacao: teardown idempotente e cleanup global.
- Cron gerar jobs demais. Mitigacao: limites de fila e concorrencia.
- Event trigger criar loop. Mitigacao: limite anti-loop desde a primeira versao.

## Notas Para Implementacao

- TDD por task.
- Commits pequenos.
- Nao alterar contratos de plugin para conhecer core.
- Manter `WorkflowEngine.executeWorkflowFromTrigger` como executor de ramo.
- Colocar orquestracao fora da engine.
- Preferir arquivos pequenos:
  - session manager;
  - queue;
  - trigger runtimes;
  - event stream;
  - job runner;
  - routes.
- O frontend deve tratar sessao como runtime principal do Run Manual.
