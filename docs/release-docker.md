# Fabric Docker Release

This guide covers the production Docker path for Fabric.

## Images

The CI publishes these images to GitHub Container Registry:

- `ghcr.io/auvexis/fabric-api`
- `ghcr.io/auvexis/fabric-client`
- `ghcr.io/auvexis/fabric-gateway`

Branch builds from `dev` publish:

- `dev`
- `sha-<commit>`

Pre-release tags like `v0.1.0-alpha.5` publish:

- `v0.1.0-alpha.5`
- `0.1.0-alpha.5`
- `sha-<commit>`

Stable tags like `v1.2.3` publish:

- `v1.2.3`
- `1.2.3`
- `1.2`
- `latest`
- `sha-<commit>`

## Run Production

Use the production compose file:

```sh
docker compose -f docker-compose.prod.yml up -d
```

Open:

```text
http://localhost:23800
```

Only the gateway is exposed on the host. The API and client stay private inside the Docker network.

## Public URL

For public webhooks, forms, OAuth callbacks, and access through another device, set `FABRIC_PUBLIC_URL` to the gateway URL.

Local macOS/Linux:

```sh
FABRIC_PUBLIC_URL=http://localhost:23800 docker compose -f docker-compose.prod.yml up -d
```

Local PowerShell:

```powershell
$env:FABRIC_PUBLIC_URL = "http://localhost:23800"
docker compose -f docker-compose.prod.yml up -d
```

Ngrok macOS/Linux:

```sh
ngrok http 23800
FABRIC_PUBLIC_URL=https://example.ngrok-free.app docker compose -f docker-compose.prod.yml up -d
```

Ngrok PowerShell:

```powershell
ngrok http 23800
$env:FABRIC_PUBLIC_URL = "https://example.ngrok-free.app"
docker compose -f docker-compose.prod.yml up -d
```

Server macOS/Linux:

```sh
FABRIC_PUBLIC_URL=https://fabric.example.com docker compose -f docker-compose.prod.yml up -d
```

Server PowerShell:

```powershell
$env:FABRIC_PUBLIC_URL = "https://fabric.example.com"
docker compose -f docker-compose.prod.yml up -d
```

When `FABRIC_PUBLIC_URL` is configured, the API also allows that origin for browser requests.

## Version Selection

Use `FABRIC_VERSION` to choose the image tag.

```sh
FABRIC_VERSION=1.2.3 docker compose -f docker-compose.prod.yml up -d
```

PowerShell:

```powershell
$env:FABRIC_VERSION = "1.2.3"
docker compose -f docker-compose.prod.yml up -d
```

Default:

```text
FABRIC_VERSION=dev
```

Use `latest` only for stable release deployments. Use explicit tags like `0.1.0-alpha.5` for alpha and beta.

## Registry Override

The default registry is:

```text
ghcr.io/auvexis
```

Override it if you publish images under another owner:

```sh
FABRIC_IMAGE_REGISTRY=ghcr.io/my-org docker compose -f docker-compose.prod.yml up -d
```

PowerShell:

```powershell
$env:FABRIC_IMAGE_REGISTRY = "ghcr.io/my-org"
docker compose -f docker-compose.prod.yml up -d
```

## Data

Fabric stores persistent data in the Docker volume:

```text
fabric_data
```

Do not delete this volume unless you intentionally want to remove local Fabric data.

## Release Flow

1. Merge changes into `dev`.
2. Wait for CI to pass.
3. Create a pre-release or stable version tag:

```sh
git tag v0.1.0-alpha.5
git push origin v0.1.0-alpha.5
```

4. Wait for Docker images to publish.
5. Deploy with:

```sh
FABRIC_VERSION=0.1.0-alpha.5 docker compose -f docker-compose.prod.yml pull
FABRIC_VERSION=0.1.0-alpha.5 docker compose -f docker-compose.prod.yml up -d
```

PowerShell:

```powershell
$env:FABRIC_VERSION = "0.1.0-alpha.5"
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```
