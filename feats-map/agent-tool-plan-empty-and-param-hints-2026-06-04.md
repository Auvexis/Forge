# Agent Tool Plan Empty And Param Hints - 2026-06-04

Goal: corrigir tool intent que termina sem chamadas de ferramentas e melhorar o planner com parametros compactos.

Rules:
- Trabalhar em `dev`.
- Fazer TDD antes da correcao.
- Commitar ao fim da fatia.
- Se o router decidir `tool_plan`, plano vazio nao pode virar resposta final normal.
- Planner pode receber parametros compactos, mas nao schema bruto, credentials, manifests ou internals.
- Nao quebrar chat comum com plano vazio.

## Task 1 - Plano Vazio Em Tool Intent

- [x] Criar teste vermelho: `tool_plan` + `steps: []` falha antes da final response.
- [x] Implementar validacao para exigir plano nao vazio quando intent for `tool_plan`.
- [x] Manter chat comum aceitando `steps: []`.

## Task 2 - Param Hints Compactos

- [x] Criar teste vermelho para prompt com `params` compactos.
- [x] Implementar resumo de parametros com nome/tipo/required.
- [x] Garantir que schema bruto nao aparece no prompt.
- [x] Rodar testes focados.
- [x] Rodar build server.
- [x] Commitar.
