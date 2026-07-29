- [x] Preparar 0.1.0-alpha.10
- [x] Validar gateway
- [x] Commitar e pushar
- [x] Publicar release
- [x] Validar Docker

Nota: alpha.10 publica a correcao do gateway para rotas API com Accept HTML.

Release:
- Tag: v0.1.0-alpha.10
- CI da tag: success
- npm dist-tag alpha: 0.1.0-alpha.10
- Docker GHCR: api, client e gateway publicados

Validacao Docker:
- `http://127.0.0.1:23800/workflows` com Accept HTML sem navegacao retornou JSON parseavel.
- `http://127.0.0.1:23800/workflows` com `Sec-Fetch-Mode: navigate` retornou HTML do client.
- Compose de producao foi derrubado apos a validacao.
- Logs locais:
  - `logs/release-alpha-npm-0.1.0-alpha.10.log`
  - `logs/release-alpha-docker-0.1.0-alpha.10.log`
