# Agent Intent Router Chat Stall - 2026-06-04

Goal: corrigir travamento/fallback ruim em mensagens de chat comum depois da primeira resposta.

Rules:
- Trabalhar em `dev`.
- Fazer TDD antes da correcao.
- Commitar ao fim da fatia.
- Chat comum nao pode executar planner/tools.
- Chat comum nao pode responder `I can help with that: ...`.
- Router deve ter limite curto e nao prender GPU por minutos.
- Se o router falhar ou demorar, responder pelo fluxo normal de chat/final response.

## Task 1 - Router Timeout E Chat Fallback Natural

- [x] Criar teste vermelho para timeout do router.
- [x] Criar teste vermelho para runner responder chat fallback via `generateFinalResponse`.
- [x] Implementar timeout curto no router.
- [x] Remover fallback textual `I can help with that:`.
- [x] Garantir que planner/tools continuam pulados em chat.
- [x] Rodar testes focados.
- [x] Rodar build server.
- [x] Commitar.
