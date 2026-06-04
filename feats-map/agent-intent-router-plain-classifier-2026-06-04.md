# Agent Intent Router Plain Classifier - 2026-06-04

Goal: melhorar a arquitetura do intent router para nao depender de JSON nem de fallback por frase exata.

Rules:
- Trabalhar em `dev`.
- Fazer TDD antes da correcao.
- Commitar ao fim da fatia.
- Router deve classificar intencao, nao responder chat.
- Router deve aceitar saida simples `CHAT` ou `TOOL_PLAN`.
- Chat response e tool planning continuam separados.
- Fallback nao deve tentar adivinhar demais por texto exato.
- Nao hardcodar plugins especificos.

## Task 1 - Classificador Sem JSON

- [x] Criar teste vermelho para saida plain text `CHAT`.
- [x] Criar teste vermelho para saida plain text `TOOL_PLAN`.
- [x] Criar teste vermelho para texto explicativo contendo `tool_plan`.
- [x] Atualizar adapter do runner para nao parsear JSON no routeIntent via `invoke`.
- [x] Atualizar normalizacao do router para aceitar string.
- [x] Remover dependencia de `answer` do router para chat comum.
- [x] Rodar testes focados.
- [x] Rodar build server.
- [x] Commitar.
