# Dev Workflow Serious Issues Audit Report

## Resumo

Foram encontrados problemas serios na implementacao atual. Nao alterei codigo nesta rodada; apenas documentei riscos e recomendacoes.

## P0/P1 Achados

### P0 - Dev session pode perder eventos do primeiro job manual

Arquivo:

- `client-vue/src/features/workflow-editor/stores/execution.store.ts`
- `server/src/core/modules/workflows/dev-session/dev-workflow-session-manager.ts`

Fluxo atual:

1. Front chama `createDevSession()`.
2. Backend cria sessao, ativa triggers e pode enfileirar job manual.
3. Job pode iniciar/finalizar antes do frontend abrir `startSessionStream()`.
4. SSE nao tem replay/buffer.

Impacto:

- logs incompletos;
- node status errado;
- trigger manual pode parecer parado/rodando errado;
- bug pior em workflows muito rapidos.

Sugestao:

- abrir SSE antes de iniciar jobs, ou
- criar sessao em estado `starting`, abrir stream, depois endpoint `start`, ou
- adicionar buffer/replay curto por `sessionId`.

### P0 - Rota `/webhook/:path` de producao pode ser interceptada por sessao dev

Arquivo:

- `server/src/core/routes/workflows.routes.ts`

Na rota de producao `/webhook/:webhookPath`, o codigo chama `devWorkflowSessionRuntime.manager.enqueueWebhook()` antes de resolver workflow publicado.

Impacto:

- uma sessao dev ativa pode capturar webhook que deveria ir para producao;
- risco real se `webhookSlug` for igual;
- comportamento perigoso em ambiente compartilhado.

Sugestao:

- dev session deve escutar apenas `/webhook-test/:path`, ou
- exigir token/session id em webhook dev, ou
- separar registries dev/prod por rota e modo.

### P1 - Anti-loop de event trigger bloqueia eventos legitimos depois de 25 usos

Arquivo:

- `server/src/core/modules/workflows/dev-session/dev-workflow-session-manager.ts`

`eventTriggerCounts` conta por `sessionId:eventName` durante a sessao inteira.

Impacto:

- depois de 25 eventos legitimos, o trigger para de rodar;
- isso nao detecta loop por cadeia/causation, detecta volume acumulado;
- cron/eventos frequentes quebram sessao longa.

Sugestao:

- contar por `causationId`/job chain;
- usar janela de tempo;
- separar limite anti-loop de limite de volume.

### P1 - `trigger:received` pode ser emitido mesmo quando job nao entra na fila

Arquivo:

- `server/src/core/modules/workflows/dev-session/dev-workflow-session-manager.ts`

`enqueueWebhook()`, `enqueueForm()` e `enqueueInternalEvent()` emitem `trigger:received` antes de `enqueueJob()`.

Impacto:

- se payload exceder limite ou sessao parar no meio, UI mostra trigger recebido;
- job nao roda;
- usuario recebe estado falso.

Sugestao:

- validar payload antes;
- enfileirar primeiro;
- emitir `trigger:received` somente apos enqueue bem-sucedido;
- se falhar, emitir `job:failed`/`trigger:failed`.

### P1 - Erro em enqueue dev pode virar 500 e impedir fallback esperado

Arquivos:

- `server/src/core/routes/workflows.routes.ts`
- `server/src/core/modules/forms/form-submission.ts`

Chamadas para `enqueueWebhook()`/`enqueueForm()` nao tratam erro.

Impacto:

- payload grande ou erro interno quebra request;
- em `/webhook/:path`, pode impedir execucao publicada;
- em forms test, pode deixar resposta inconsistente.

Sugestao:

- `enqueueWebhook/Form` retornar resultado estruturado: `{ matched, queued, error }`;
- rotas decidirem resposta;
- nao interceptar producao se enqueue dev falhar.

### P1 - Plugin trigger dev fica marcado como pronto antes do setup terminar

Arquivo:

- `server/src/core/modules/workflows/dev-session/dev-workflow-session-manager.ts`
- `server/src/core/modules/workflows/lifecycle.ts`

`activatePluginLifecycle()` chama setup async em background e `session:ready` sai logo depois.

Impacto:

- UI acha que trigger plugin esta pronto;
- webhook/evento pode chegar antes do plugin registrar tudo;
- erro de setup aparece como `job:failed`, mas sessao continua como running.

Sugestao:

- aguardar setup antes de `session:ready`, ou
- emitir `trigger:activating`/`trigger:failed`;
- se setup falhar, marcar trigger indisponivel.

### P2 - Fechar/reconectar SSE para a sessao inteira

Arquivo:

- `server/src/core/routes/workflows.routes.ts`

`close` do SSE chama `stopSession(sessionId, "sse disconnected")`.

Impacto:

- reconnect automatico do browser pode matar sessao;
- troca de rede/aba/sleep encerra tudo;
- ruim para cron/webhook aguardando.

Sugestao:

- heartbeat com grace period;
- parar so depois de timeout curto sem reconnect;
- endpoint de reconnect usando mesmo `sessionId`.

## Pontos Bons

- Fila e runner estao separados.
- `WorkflowEngine.executeWorkflowFromTrigger()` mantem execucao por ramo.
- Stop tem teardown idempotente.
- Limites basicos existem.
- Frontend ja separa `activeSessionId`, jobs e trigger statuses.

## Ordem Recomendada De Correcao

1. Remover interceptacao dev da rota `/webhook/:path` de producao.
2. Resolver perda de eventos iniciais com buffer/replay ou start em duas fases.
3. Ajustar `trigger:received` para emitir so apos enqueue valido.
4. Trocar anti-loop acumulado por contador por causation/janela.
5. Aguardar ou representar corretamente setup de plugin trigger.
6. Adicionar grace period para reconnect SSE.
