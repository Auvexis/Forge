<p align="center">
  <img src="app-assets/LOGO_DARK.svg" alt="Fabric" width="190" />
</p>

<h1 align="center">Fabric</h1>

<p align="center">
  Local automation workspace for workflows, forms, webhooks, pages, plugins, and agent tools.
</p>

<p align="center">
  <strong>Desktop</strong> · <strong>npm</strong> · <strong>Docker</strong>
</p>

<p align="center">
  <a href="https://github.com/Auvexis/fabric/releases">Releases</a>
  ·
  <a href="docs/release-npm.md">npm</a>
  ·
  <a href="docs/release-docker.md">Docker</a>
  ·
  <a href="docs/release-desktop.md">Desktop</a>
  ·
  <a href="COMMERCIAL-LICENSE.md">License</a>
</p>

> Fabric is currently alpha software. Expect breaking changes while the project
> evolves toward a stable public release.

## What is Fabric?

Fabric is a local-first automation app for building workflows visually and
running them through forms, webhooks, schedules, chat agents, pages, and plugin
integrations.

It is designed to feel like a professional creative tool: fast local editing,
visual workflow composition, public URLs when you need external access, and a
plugin SDK for extending what Fabric can do.

## Highlights

- Visual workflow editor with nodes, triggers, panels, timelines, and variables.
- Public forms and webhooks through a configurable Public URL.
- Agent workflows with chat sessions and plugin-backed tools.
- Pages and website editor foundation.
- Plugin architecture powered by Fabric SDK manifests.
- Desktop app with native windows, tray support, restart flows, and update checks.
- Production Docker gateway that exposes one public entrypoint.
- npm runner for local use without cloning the repository.

## Install

Fabric alpha is available through npm, Docker, and desktop builds.

Current alpha:

```text
0.1.0-alpha.10
```

### npm

Requires Node.js 22 or newer.

```sh
npx @auvexis/fabric@alpha
```

Open:

```text
http://localhost:23800
```

### Docker

Requires Docker Desktop or Docker Engine.

```sh
FABRIC_VERSION=0.1.0-alpha.10 docker compose -f docker-compose.prod.yml up -d
```

PowerShell:

```powershell
$env:FABRIC_VERSION = "0.1.0-alpha.10"
docker compose -f docker-compose.prod.yml up -d
```

Open:

```text
http://localhost:23800
```

Stop:

```sh
docker compose -f docker-compose.prod.yml down
```

### Desktop

Desktop builds are published from GitHub releases during alpha.

Expected release assets:

- Windows: `.exe`
- macOS: `.dmg`
- Linux: `.AppImage` or `.deb`

See [Desktop release docs](docs/release-desktop.md).

## Public URL

Set `FABRIC_PUBLIC_URL` when using a tunnel, domain, reverse proxy, public
forms, public webhooks, OAuth callbacks, or access from another device.

Use the gateway URL, not the API URL.

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
FABRIC_VERSION=0.1.0-alpha.10 FABRIC_PUBLIC_URL=https://example.ngrok-free.app docker compose -f docker-compose.prod.yml up -d
```

Fabric starts these local services:

| Service | URL |
| --- | --- |
| Gateway | `http://localhost:23800` |
| API | `http://localhost:23801` |
| Client | `http://localhost:23802` |

Open only the gateway URL in normal use.

## Development

Install dependencies:

```sh
npm install
```

Run the web app locally:

```sh
npm run dev
```

Run the desktop app locally:

```sh
npm run dev:desktop
```

Run checks:

```sh
npm run type-check
npm run test
```

## Release Channels

Fabric uses channel-based releases:

- `alpha`: current development preview.
- `beta`: release candidate channel.
- `stable`: production-ready channel.

npm:

```sh
npx @auvexis/fabric@alpha
```

Docker images:

```text
ghcr.io/auvexis/fabric-api:0.1.0-alpha.10
ghcr.io/auvexis/fabric-client:0.1.0-alpha.10
ghcr.io/auvexis/fabric-gateway:0.1.0-alpha.10
```

Release docs:

- [npm release](docs/release-npm.md)
- [Docker release](docs/release-docker.md)
- [Desktop release](docs/release-desktop.md)
- [Remote release validation](docs/remote-release-validation.md)

## Security Notes

- Treat Public URLs as internet-facing.
- Do not expose Fabric with secrets or private workflows on untrusted networks.
- Use HTTPS for public forms, webhooks, and OAuth callbacks.
- Keep API keys, OAuth credentials, and private URLs out of logs, issues, and
  screenshots.

## License

Fabric is source-available software, not open source software.

The source code is public for viewing, learning, experimentation, GitHub forks,
personal noncommercial use, and contributions.

Commercial use, redistribution, relicensing, hosted SaaS offerings, or building
a competing commercial product from Fabric source code is not permitted without
explicit written permission.

See [LICENSE](LICENSE) and [Commercial Use Policy](COMMERCIAL-LICENSE.md).
