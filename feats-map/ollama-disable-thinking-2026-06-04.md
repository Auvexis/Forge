# Ollama Disable Thinking - 2026-06-04

Goal: garantir que chamadas nativas do Ollama desativem thinking por padrao para evitar lentidao em chat comum.

Rules:
- Trabalhar em `dev`.
- Fazer TDD antes da correcao.
- Commitar ao fim da fatia.
- Enviar `think: false` no payload do Ollama quando thinking nao estiver explicitamente habilitado.
- Nao quebrar `thinkingEnabled: true`.
- Manter JSON/plan/final response usando o mesmo comportamento.

## Task 1 - Payload Think False

- [x] Criar teste vermelho para `think: false` no payload.
- [x] Criar teste para preservar `think: true` quando habilitado.
- [x] Implementar payload `think`.
- [x] Rodar teste focado.
- [x] Rodar build server.
- [x] Commitar.
