# Agent Panel English Tool Catalog And Planner Prompt - 2026-06-04

Goal: corrigir pergunta em ingles sobre ferramentas e reduzir o catalogo enviado ao planner.

Rules:
- Trabalhar em `dev`.
- Usar TDD.
- Perguntas de catalogo de tools nao podem chamar LLM nem executar tools.
- Planner deve receber apenas nome e instructions/description das tools.
- Nao enviar schemas/properties/required no prompt do planner.

## Task 1 - English Tool Catalog Question

- [x] Criar teste vermelho para `Hi, what tools do you have available to use?`.
- [x] Detectar `available/use/access/list` em perguntas de catalogo.
- [x] Responder catalogo deterministico.
- [x] Nao chamar planner.
- [x] Nao executar tool.

## Task 2 - Planner Catalog Sem Schema

- [x] Criar teste vermelho garantindo que prompt nao contem `inputSchema`, `properties`, `required` nem campos de schema.
- [x] Enviar apenas `name`, `description` e `instructions`.

## Verification

- [x] `node --test src/core/modules/agent-runtime/agent-runner.test.ts`
- [x] `node --test src/core/modules/agent-runtime/plan/agent-plan-generator.test.ts`
- [x] `cd server && npm run build`
- [x] `git diff --check -- <arquivos da task>`
