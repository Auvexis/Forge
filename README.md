# Fabric

Fabric is a local automation workspace for workflows, forms, webhooks, pages and agent tools.

Fabric alpha can run as:

- npm CLI
- Docker production compose
- Desktop app, planned

## Status

Fabric is currently alpha software. Use it for testing, local automation and early production experiments where you can tolerate breaking changes between alpha versions.

Current alpha:

```text
0.1.0-alpha.7
```

## Run With npm

Requires Node.js 22 or newer.

```sh
npx @auvexis/fabric@alpha
```

Open:

```text
http://localhost:23800
```

Fabric starts:

- Gateway on `23800`
- API on `23801`
- Client on `23802`

Open only the gateway URL in the browser.

## Run With Docker

Requires Docker Desktop or Docker Engine.

```sh
FABRIC_VERSION=0.1.0-alpha.7 docker compose -f docker-compose.prod.yml up -d
```

PowerShell:

```powershell
$env:FABRIC_VERSION = "0.1.0-alpha.7"
docker compose -f docker-compose.prod.yml up -d
```

Open:

```text
http://localhost:23800
```

In production compose, only the gateway is exposed on the host. The API and client stay inside the Docker network.

Stop:

```sh
docker compose -f docker-compose.prod.yml down
```

## Public URL

Set `FABRIC_PUBLIC_URL` to the public gateway URL when using a tunnel, domain, reverse proxy, webhooks, forms, OAuth callbacks or access from another device.

Ngrok example:

```sh
ngrok http 23800
FABRIC_PUBLIC_URL=https://example.ngrok-free.app npx @auvexis/fabric@alpha
```

PowerShell:

```powershell
ngrok http 23800
$env:FABRIC_PUBLIC_URL = "https://example.ngrok-free.app"
npx @auvexis/fabric@alpha
```

Docker:

```sh
FABRIC_VERSION=0.1.0-alpha.7 FABRIC_PUBLIC_URL=https://example.ngrok-free.app docker compose -f docker-compose.prod.yml up -d
```

Use the gateway port, not the API port, for public URLs.

## Security Notes

- Treat public URLs as internet-facing.
- Do not expose Fabric with secrets or private workflows on untrusted networks without a trusted tunnel, reverse proxy or access control.
- Keep API keys and OAuth credentials out of logs, issues and screenshots.
- Prefer HTTPS public URLs for webhooks, forms and OAuth callbacks.

## Release Channels

Install the current alpha:

```sh
npx @auvexis/fabric@alpha
```

Docker images:

```text
ghcr.io/auvexis/fabric-api:0.1.0-alpha.7
ghcr.io/auvexis/fabric-client:0.1.0-alpha.7
ghcr.io/auvexis/fabric-gateway:0.1.0-alpha.7
```

More release docs:

- [npm release](docs/release-npm.md)
- [Docker release](docs/release-docker.md)
- [Remote release validation](docs/remote-release-validation.md)
