# Agent Panel Empty Plan Greeting Bugfix - 2026-06-04

Goal: corrigir saudacoes simples no Global Chat Agent para nao exibirem progresso de tools e corrigir crash `step.id?.trim is not a function`.

Rules:
- Trabalhar em `dev`.
- Usar TDD.
- Nao criar heuristica fragil para detectar saudacao.
- Planner deve poder retornar plano vazio quando nenhuma tool for necessaria.
- Validacao de plano deve rejeitar shape invalido com erro controlado.

## Task 1 - Empty Plan Sem Progress De Tool

- [x] Criar teste vermelho para `Boa noite!` com plano vazio.
- [x] Garantir que nenhuma tool seja chamada.
- [x] Garantir que `agent:thinking` / `agent:plan-*` nao sejam emitidos quando o plano e vazio.
- [x] Permitir `steps: []` como conversa normal sem tools.
- [x] Instruir planner: `Return steps: [] when no tool is needed for the user request.`
- [x] Ajustar final response para responder naturalmente quando nenhuma tool foi necessaria.

## Task 2 - Validacao Defensiva De Step

- [x] Criar teste vermelho para `step.id` nao-string.
- [x] Retornar `AGENT_PLAN_INVALID` em vez de `TypeError`.
- [x] Validar `toolName` como string antes de consultar catalogo.

## Verification

- [x] `node --test src/core/modules/agent-runtime/plan/*.test.ts`
- [x] `node --test src/core/modules/agent-runtime/agent-runner.test.ts`
- [x] `node --test src/core/routes/agent-panel.routes.test.ts`
- [x] `cd server && npm run build`
