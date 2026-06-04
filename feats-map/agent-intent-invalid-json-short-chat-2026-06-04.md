# Agent Intent Invalid JSON Short Chat - 2026-06-04

Goal: impedir que JSON invalido do intent router transforme perguntas curtas de chat em planner/tool error.

Rules:
- Trabalhar em `dev`.
- Fazer TDD antes da correcao.
- Commitar ao fim da fatia.
- Perguntas curtas de conversa/identidade continuam `chat`, mesmo com tools configuradas.
- Pedidos claros de acao continuam `tool_plan` quando o router falha.
- Nao hardcodar plugins especificos.

## Task 1 - Short Chat Fallback

- [x] Criar teste vermelho para `Who's you?` com router falhando e tools configuradas.
- [x] Implementar fallback mais conservador.
- [x] Rodar testes focados.
- [x] Rodar build server.
- [x] Commitar.
