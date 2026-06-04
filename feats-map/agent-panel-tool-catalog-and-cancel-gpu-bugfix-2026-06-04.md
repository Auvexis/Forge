# Agent Panel Tool Catalog And Cancel GPU Bugfix - 2026-06-04

Goal: corrigir pergunta de catalogo de ferramentas e garantir que Stop encerra animacoes/progresso ativo.

Rules:
- Trabalhar em `dev`.
- Usar TDD.
- Nao executar tools para pergunta sobre ferramentas disponiveis.
- Nao chamar LLM para resposta deterministica de catalogo.
- Stop deve abortar stream e deixar a UI sem shimmer/loading infinito.
- Usar tokens/animacoes existentes; nao adicionar animacao pesada.

## Task 1 - Pergunta Sobre Ferramentas

- [x] Criar teste vermelho para `Quais ferramentas voce tem acesso?`.
- [x] Responder com catalogo de tools configuradas.
- [x] Nao chamar planner/final model.
- [x] Nao executar tool.

## Task 2 - Stop Encerra Animacoes Ativas

- [x] Criar teste vermelho de contrato para assentar progress rows animados.
- [x] Converter progressos `planned`, `running` e `retrying` do turno ativo para `failed`.
- [x] Usar mensagem `Cancelled.`.
- [x] Aplicar em cancelamento manual e dispose do painel.

## Verification

- [x] `node --test src/core/modules/agent-runtime/agent-runner.test.ts`
- [x] `node --test src/features/agent-panel/__tests__/agentPanel.contract.test.ts`
- [x] `cd server && npm run build`
- [x] `cd client-vue && npm run build`
- [x] `git diff --check -- <arquivos da task>`
