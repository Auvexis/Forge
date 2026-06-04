# Agent Intent Router - 2026-06-04

Goal: adicionar um roteador de intencao antes do planner para separar chat normal de execucao de ferramentas sem depender de idioma ou keywords fixas.

Rules:
- Trabalhar em `dev`.
- Fazer TDD por task.
- Commitar ao fim de cada fatia.
- Nao executar tools para mensagens classificadas como `chat`.
- Nao emitir progress/shimmer para mensagens classificadas como `chat`.
- Router e planner recebem somente catalogo minimo de tools.
- Nao enviar schemas, credentials, manifests ou internals de plugin para o router.

## Task 1 - Intent Router Core

- [x] Criar `agent-intent-router.test.ts`.
- [x] Criar `agent-intent-router.ts`.
- [x] Suportar `mode: chat | tool_plan`.
- [x] Validar `reason`, `confidence` e `answer`.
- [x] Fallback para `chat` em baixa confianca.
- [x] Fallback para `chat` em output invalido.
- [x] Garantir prompt sem schemas/plugin internals.
- [x] Rodar teste focado.
- [x] Commitar.

## Task 2 - AgentRunner Usa Router

- [x] Adicionar testes de chat intent sem planner/tool.
- [x] Adicionar teste de tool_plan continuando para planner deterministico.
- [x] Integrar `routeAgentIntent` antes do `generateAgentPlan`.
- [x] Adicionar `routeIntent` no wrapper de modelo.
- [x] Atualizar testes antigos para declarar intent explicitamente.
- [x] Rodar testes focados.
- [x] Commitar.

## Task 3 - Rotas, UI Contract E Verificacao

- [x] Adicionar teste de rota: chat intent streama delta/done sem progress.
- [x] Adicionar contrato frontend: chat intent nao depende de shimmer/progress.
- [x] Rodar:
  - `node --test src/core/modules/agent-runtime/intent/agent-intent-router.test.ts`
  - `node --test src/core/modules/agent-runtime/agent-runner.test.ts`
  - `node --test src/core/routes/agent-panel.routes.test.ts`
  - `node --test src/features/agent-panel/__tests__/agentPanel.contract.test.ts`
  - `cd server && npm run build`
  - `cd client-vue && npm run build`
  - `git diff --check -- <arquivos da task>`
- [x] Commitar.
