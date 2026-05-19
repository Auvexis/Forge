# Plugin Light/Dark Icons

Goal: adicionar suporte oficial a `metadata.iconLight` e `metadata.iconDark` no manifest do SDK e atualizar os plugins default para usar os assets corretos.

Rules:
- TDD antes de alterar contrato.
- Atualizar SDK real em `../sailor-sdk`, não criar workaround no loader.
- Manter `metadata.icon` como fallback compatível.
- Plugins continuam genéricos e isolados.

## Task 1 - SDK manifest contract

- [x] Escrever teste falhando no `sailor-sdk` validando `iconLight` e `iconDark`.
- [x] Atualizar tipos `PluginMetadata`.
- [x] Atualizar JSON Schema do manifest.
- [x] Rodar testes e build do SDK.
- [x] Commit no `sailor-sdk`.

## Task 2 - Sailor consume SDK and types

- [x] Instalar/atualizar `@auvexis/sailor-sdk` no server a partir do SDK local.
- [x] Atualizar tipos frontend para `iconLight` e `iconDark`.
- [x] Atualizar resolução de ícone no frontend para preferir light/dark quando existir.
- [x] Rodar testes/typecheck focados.

## Task 3 - Plugin manifests

- [x] Atualizar icons dos manifests solicitados.
- [x] Adicionar `iconLight`/`iconDark` para GitHub, Notion, Ollama, OpenRouter e OpenAI.
- [x] Validar loader/manifests.
- [x] Commit no `sailor`.
