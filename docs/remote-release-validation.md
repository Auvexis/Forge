# Remote Release Validation

Use this checklist after pushing `dev` or a release tag.

## Current Alpha

```text
v0.1.0-alpha.2
```

## GitHub Actions

Required:

- GitHub Actions enabled for `Auvexis/fabric`.
- Authenticated GitHub access when the repository is private.

Validate:

- `CI` runs for `dev`.
- `CI` runs for `v0.1.0-alpha.2`.
- `test-build` passes for API, Client and Gateway.
- `docker-build` passes for API, Client and Gateway.
- `docker-publish` publishes alpha tags.

## GHCR

Required:

- GHCR packages visible to the validating account.
- Docker logged in to `ghcr.io` when packages are private.

Expected images:

```text
ghcr.io/auvexis/fabric-api:0.1.0-alpha.2
ghcr.io/auvexis/fabric-client:0.1.0-alpha.2
ghcr.io/auvexis/fabric-gateway:0.1.0-alpha.2
```

Alpha and beta images must not publish `latest`.

## Docker Smoke

Required:

- Docker Desktop running with Linux engine.

PowerShell:

```powershell
$env:FABRIC_VERSION = "0.1.0-alpha.2"
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

Open:

```text
http://localhost:23800
```

Validate:

- `/home` opens through gateway.
- API and client are not exposed directly by compose.
- Public URL points to the gateway.
