# Dev Workflow Serious Issues Fix

## Objetivo

Corrigir os problemas serios documentados em `DEV_WORKFLOW_SERIOUS_ISSUES_AUDIT_REPORT.md` sem quebrar o fluxo atual.

## Tasks

- [x] Adicionar testes de regressao para riscos P0/P1.
- [x] Separar webhook dev de webhook producao.
- [x] Evitar perda de eventos iniciais da sessao dev.
- [x] Emitir `trigger:received` somente quando job entrar na fila.
- [x] Tratar falhas de enqueue dev sem estado falso.
- [x] Corrigir anti-loop acumulado de event trigger.
- [x] Tornar plugin setup coerente com `session:ready`.
- [x] Adicionar grace period para reconnect SSE.
- [x] Validar backend/frontend.
- [x] Commit.

## Correcoes

- `SessionEventBus` agora guarda replay curto por sessao para o frontend nao perder eventos emitidos antes do SSE abrir.
- `/webhook/:path` nao intercepta mais dev session; dev fica em `/webhook-test/:path`.
- Plugin trigger em dev recebe URL de teste e `session:ready` espera setup terminar.
- `trigger:received` so e emitido apos enqueue bem-sucedido; falha vira `job:failed`.
- Anti-loop de event trigger agora usa janela de tempo, nao contador da sessao inteira.
- SSE dev tem grace period de 5s antes de parar sessao por disconnect.

## Validacao

- `node --import ts-node/register --test src/core/modules/workflows/dev-session/dev-workflow-session-manager.test.ts src/core/modules/workflows/dev-session/session-event-bus.test.ts src/core/modules/workflows/dev-session/runtime.test.ts src/core/modules/workflows/dev-session/execution-queue.test.ts src/core/modules/workflows/dev-session/workflow-job-runner.test.ts`
- `npm run build` em `server`
- `npm run build` em `client-vue`
