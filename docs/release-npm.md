# Fabric npm Release

The npm package starts Fabric locally without Docker.

## Run

```sh
npx fabric
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
npx fabric
```

## Ports

Override ports only when needed:

```powershell
$env:FABRIC_GATEWAY_PORT = "23800"
$env:FABRIC_API_PORT = "23801"
$env:FABRIC_CLIENT_PORT = "23802"
npx fabric
```

## Package Validation

Before publishing:

```sh
npm pack --dry-run
```

Then install the generated tarball in a clean folder and validate:

```text
http://localhost:23800/
http://localhost:23800/home
http://localhost:23800/profiles
```
