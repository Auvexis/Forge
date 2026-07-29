# Fabric Pre-Release Checklist

Esta checklist define o minimo para publicar o Fabric com seguranca em Docker, npm e Desktop.

## Status Atual

Fase atual:

```text
Fase 1 - fundacao de release/CI/CD
```

Ja esta pronto:

- CI por workspace para API, Client e Gateway.
- Type-check por workspace.
- Vitest por workspace.
- Node tests por workspace.
- Build por workspace.
- Docker build e smoke test por imagem.
- Dockerfiles multi-stage.
- API rodando JavaScript compilado em producao.
- Publicacao de imagens Docker no GHCR.
- Compose de producao com gateway publico e API/client internos.
- Guia Docker em `docs/release-docker.md`.

## Gate Local

Antes de abrir release:

```sh
npm run type-check
npm run test:vitest
npm run test:node
npm run build
docker compose -f docker-compose.prod.yml config
```

Observacao:

```text
npm run ci pode demorar no Windows local. Se estourar timeout, rode os comandos separados.
```

## Gate GitHub Actions

Antes de publicar uma versao:

- Push em `dev` deve passar no workflow `CI`.
- Os jobs `test-build` devem passar para API, Client e Gateway.
- Os jobs `docker-build` devem passar para API, Client e Gateway.
- O job `docker-publish` deve publicar as imagens `dev` e `sha-*`.

Para release por tag:

- Criar tag pre-release `vX.Y.Z-alpha.N` ou `vX.Y.Z-beta.N`.
- Criar tag stable `vX.Y.Z` apenas quando estiver pronto para publico geral.
- Workflow alpha/beta deve publicar `vX.Y.Z-alpha.N`, `X.Y.Z-alpha.N` e `sha-*`.
- Workflow stable deve publicar `vX.Y.Z`, `X.Y.Z`, `X.Y`, `latest` e `sha-*`.
- Confirmar as tres imagens no GHCR:
  - `ghcr.io/auvexis/fabric-api`
  - `ghcr.io/auvexis/fabric-client`
  - `ghcr.io/auvexis/fabric-gateway`

## Gate Docker Producao

Antes de recomendar Docker para usuarios:

```sh
FABRIC_VERSION=dev docker compose -f docker-compose.prod.yml pull
FABRIC_VERSION=dev docker compose -f docker-compose.prod.yml up -d
```

Verificar:

- `http://localhost:23800` abre o Fabric.
- `http://localhost:23800/home` abre via gateway.
- Webhooks usam o gateway.
- Forms temporarios usam o gateway.
- OAuth usa callback publico quando `FABRIC_PUBLIC_URL` aponta para o gateway.
- API e client nao precisam estar expostos diretamente no host.

## Gate Public URL

Com ngrok:

```sh
ngrok http 23800
FABRIC_PUBLIC_URL=https://example.ngrok-free.app docker compose -f docker-compose.prod.yml up -d
```

Verificar:

- A URL publica abre o frontend.
- Chamadas do frontend passam pelo gateway sem CORS.
- Webhooks recebem chamadas externas.
- Forms publicados abrem em outro dispositivo.
- Login/conexao Auvexis nao quebra por CORS ou callback incorreto.

## Gate Alpha Manual

Use este gate antes de promover uma nova alpha para testers. Ele valida o fluxo real que mais importa: app abrindo, gateway roteando, URL publica funcionando e triggers externos chegando no backend certo.

### npm

Em uma pasta limpa:

```sh
npm install -g @auvexis/fabric@alpha
fabric
```

Verificar:

- `http://localhost:23800` abre o Fabric pelo gateway.
- Criar um perfil novo funciona.
- Reiniciar o Fabric preserva o perfil esperado.
- Abrir `/home` e `/workflows` nao gera erro de CORS.
- Abrir `/workflows` nao gera `Failed to parse response as JSON`.
- Criar um workflow simples funciona.
- Publicar o workflow funciona.

### Docker

Com Docker ligado:

```sh
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up
```

Verificar:

- `http://localhost:23800` abre o Fabric.
- Criar ou selecionar um perfil funciona.
- Abrir `/home` e `/workflows` nao gera erro de CORS.
- API, client e gateway sobem sem expor API/client diretamente como requisito para uso normal.
- Parar o compose ao final do teste.

### Public URL

Com ngrok apontando para o gateway:

```sh
ngrok http 23800
```

No Fabric, configurar a URL publica gerada pelo ngrok quando necessario.

Verificar:

- A URL publica abre o frontend em outro dispositivo.
- Criar workflow com trigger de formulario.
- Testar o formulario em modo dev.
- Publicar o workflow.
- Abrir o formulario publicado pelo celular.
- Enviar o formulario pelo celular.
- Confirmar que a execucao aparece no Fabric.
- Confirmar que nao ha erro de CORS no browser.

### Evidencia

Salvar logs locais quando possivel:

- `logs/release-alpha-npm-<version>.log`
- `logs/release-alpha-docker-<version>.log`

Registrar no `feats-map/release-alpha-<n>-*.md`:

- Versao testada.
- Resultado npm.
- Resultado Docker.
- Resultado Public URL.
- Resultado do teste pelo celular.
- Qualquer erro encontrado.

## Gate npm

Antes de publicar no npm:

- Definir quais pacotes serao publicos.
- Remover `private: true` apenas dos pacotes publicaveis.
- Criar binario CLI para iniciar Fabric localmente.
- Decidir se o npm roda gateway, API e client juntos.
- Garantir que build do client esteja empacotado ou baixavel.
- Documentar `npx` e instalacao global.
- Testar instalacao em pasta limpa.

## Gate Desktop

Antes de publicar Electron:

- Criar app Electron com lifecycle para API, client e gateway.
- Definir diretorio de dados por SO.
- Garantir update/restart quando Public URL mudar.
- Garantir shutdown limpo dos processos internos.
- Assinar builds quando necessario.
- Criar build Windows primeiro.
- Depois macOS e Linux.

## Gate Seguranca

Antes de uma release publica:

- Rodar `npm audit`.
- Revisar vulnerabilidades high/critical.
- Garantir que secrets nao entram em logs.
- Garantir que Docker nao expoe API/client direto em producao.
- Confirmar CORS pelo gateway e `FABRIC_PUBLIC_URL`.
- Confirmar que dados persistentes ficam em volume/diretorio esperado.

## Sequencia Recomendada

1. Fechar Fase 1 com Docker confiavel.
2. Rodar um release `v0.1.0-alpha.5` de teste.
3. Testar Docker em maquina limpa.
4. Implementar npm CLI.
5. Implementar Electron.
6. Criar release unificado com Docker, npm e Desktop.
