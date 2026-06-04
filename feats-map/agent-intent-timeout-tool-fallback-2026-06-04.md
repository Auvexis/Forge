# Agent Intent Timeout Tool Fallback - 2026-06-04

Goal: evitar que timeout/falha do intent router transforme pedido claro de ferramenta em chat comum.

Rules:
- Trabalhar em `dev`.
- Fazer TDD antes da correcao.
- Commitar ao fim da fatia.
- Chat simples continua rapido.
- Pedido com tools disponiveis nao pode cair em final response sem toolCalls por timeout do router.
- Nao hardcodar Gmail/Drive; deve funcionar com qualquer plugin/tool configurada.

## Task 1 - Timeout Com Tools

- [x] Criar teste vermelho para router travado + mensagem de acao + tools disponiveis => `tool_plan`.
- [x] Criar teste para conversa simples continuar `chat`.
- [x] Implementar fallback conservador para `tool_plan`.
- [x] Rodar testes focados.
- [x] Rodar build server.
- [x] Commitar.
