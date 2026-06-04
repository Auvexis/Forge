# Agent Plan Index Ref Resolution - 2026-06-04

Goal: corrigir refs por indice geradas pelo modelo, como `$steps[1][0].id`, sem acoplar em Drive/Gmail.

Rules:
- Trabalhar em `dev`.
- Fazer TDD antes da correcao.
- Commitar ao fim da fatia.
- Nao hardcodar plugins.
- Resolver refs por `step.id` e por indice de step.

## Task 1 - Resolver `$steps[index]`

- [x] Criar teste vermelho para `$steps[1][0].id`.
- [x] Implementar resolucao generica por indice do plano.
- [x] Manter suporte existente para `$steps.<stepId>[0].id`.
- [x] Rodar testes focados.
- [x] Rodar build backend.
- [x] Commitar.
