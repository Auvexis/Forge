# Agent Planner Text Fallback - 2026-06-04

Goal: evitar que o planner quebre quando modelo local retorna JSON invalido.

Rules:
- Trabalhar em `dev`.
- Fazer TDD antes da correcao.
- Commitar ao fim da fatia.
- Planner nao pode depender 100% de JSON perfeito.
- Fallback deve ser generico para qualquer tool/plugin configurado.
- Sem hardcode de Drive/Gmail.
- Plano final continua validado contra tools disponiveis.

## Task 1 - Fallback Textual Do Planner

- [x] Criar teste vermelho: `generatePlan` falha com JSON invalido, `invoke` retorna plano textual, executor roda tools.
- [x] Implementar prompt textual compacto.
- [x] Implementar parser de `STEP/TOOL/PARAM/REASON/ENDSTEP`.
- [x] Validar plano parseado com o validador existente.
- [x] Rodar testes focados.
- [x] Rodar build server.
- [x] Commitar.
