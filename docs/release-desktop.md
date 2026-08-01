# Desktop Release

Fabric Desktop is currently distributed as unsigned alpha installers.

Expected GitHub Release assets:

- `Fabric-<version>-win-x64.exe`
- `Fabric-<version>-mac-x64.dmg`
- `Fabric-<version>-mac-arm64.dmg`
- `Fabric-<version>-linux-x64.AppImage`
- `Fabric-<version>-linux-amd64.deb`

Build locally:

```bash
npm run dist:win --workspace @fabric/desktop
npm run dist:mac --workspace @fabric/desktop
npm run dist:linux --workspace @fabric/desktop
```

Unsigned installers may show operating system security warnings.
