# Fabric npm Release

The npm package starts Fabric locally without Docker.

## Run

```sh
npx @auvexis/fabric
```

Open:

```text
http://localhost:23800
```

The npm CLI starts:

- API on `23801`.
- Client static server on `23802`.
- Gateway on `23800`.

Only the gateway should be opened in the browser.

## Public URL

Set `FABRIC_PUBLIC_URL` when using a tunnel or public host.

PowerShell:

```powershell
$env:FABRIC_PUBLIC_URL = "https://example.ngrok-free.app"
npx @auvexis/fabric
```

## Ports

Override ports only when needed:

```powershell
$env:FABRIC_GATEWAY_PORT = "23800"
$env:FABRIC_API_PORT = "23801"
$env:FABRIC_CLIENT_PORT = "23802"
npx @auvexis/fabric
```

## Package Validation

Before publishing:

```sh
npm run pack:check
```

Then install the generated tarball in a clean folder and validate:

```text
http://localhost:23800/
http://localhost:23800/home
http://localhost:23800/profiles
```

## Alpha Publish

Local publish uses the `alpha` dist-tag:

```sh
npm run publish:alpha
```

GitHub Actions publishes automatically for alpha tags matching:

```text
v*-alpha.*
```

Repository secret required:

```text
NPM_TOKEN
```

Safe setup:

1. Create an npm automation/classic token with publish access to the `@auvexis` scope.
2. Add it in GitHub at `Settings` -> `Secrets and variables` -> `Actions` -> `New repository secret`.
3. Use `NPM_TOKEN` as the secret name.
4. Paste the token only into GitHub. Do not paste it in issues, commits, logs, or chat.
5. Confirm the secret exists without printing its value:

```sh
gh secret list
```

The workflow validates npm packaging on every push, but it only publishes when a pushed tag matches `v*-alpha.*`.

Create and push an alpha tag only after the secret exists:

```sh
git tag v0.1.0-alpha.3
git push origin v0.1.0-alpha.3
```

Users can run the alpha package with:

```sh
npx @auvexis/fabric@alpha
```
