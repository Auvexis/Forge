# Remote Release Validation

Use this checklist after pushing `dev` or a release tag.

## Current Alpha

```text
v0.1.0-alpha.5
```

## GitHub Actions

Required:

- GitHub Actions enabled for `Auvexis/fabric`.
- Authenticated GitHub access when the repository is private.

Validate:

- `CI` runs for `dev`.
- `CI` runs for `v0.1.0-alpha.5`.
- `test-build` passes for API, Client and Gateway.
- `docker-build` passes for API, Client and Gateway.
- `docker-publish` publishes alpha tags.

## GHCR

Required:

- GHCR packages visible to the validating account.
- Docker logged in to `ghcr.io` when packages are private.

Expected images:

```text
ghcr.io/auvexis/fabric-api:0.1.0-alpha.5
ghcr.io/auvexis/fabric-client:0.1.0-alpha.5
ghcr.io/auvexis/fabric-gateway:0.1.0-alpha.5
```

Alpha and beta images must not publish `latest`.

Previous local result:

```text
docker pull ghcr.io/auvexis/fabric-api:0.1.0-alpha.5 -> unauthorized
docker pull ghcr.io/auvexis/fabric-client:0.1.0-alpha.5 -> unauthorized
docker pull ghcr.io/auvexis/fabric-gateway:0.1.0-alpha.5 -> unauthorized
```

This means the Docker engine is working, but GHCR still needs authentication or package visibility changes.

Authenticated local result:

```text
docker pull ghcr.io/auvexis/fabric-api:0.1.0-alpha.5 -> ok
docker pull ghcr.io/auvexis/fabric-client:0.1.0-alpha.5 -> ok
docker pull ghcr.io/auvexis/fabric-gateway:0.1.0-alpha.5 -> ok
```

## Docker Smoke

Required:

- Docker Desktop running with Linux engine.

Current local result:

```text
Docker Desktop Linux engine is reachable.
```

PowerShell:

```powershell
$env:FABRIC_VERSION = "0.1.0-alpha.5"
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

Current local result:

```text
http://localhost:23800/ -> 200
http://localhost:23800/home -> 200
fabric-server -> healthy, internal 23801/tcp only
fabric-client -> internal 80/tcp only
fabric-gateway -> published 23800/tcp
```
