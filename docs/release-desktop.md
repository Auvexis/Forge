# Desktop Release

Fabric Desktop is currently distributed as unsigned alpha installers.
Do not claim that alpha desktop builds are signed or notarized.

Expected GitHub Release assets:

- `Fabric-<version>-win-x64.exe`
- `Fabric-<version>-mac-x64.dmg`
- `Fabric-<version>-mac-arm64.dmg`
- `Fabric-<version>-linux-x64.AppImage`
- `Fabric-<version>-linux-amd64.deb`

CI artifact sources:

- Windows: `apps/desktop/release/*.exe`
- macOS: `apps/desktop/release/*.dmg`
- Linux: `apps/desktop/release/*.AppImage`
- Linux package: `apps/desktop/release/*.deb`

Build locally:

```bash
npm run dist:win --workspace @fabric/desktop
npm run dist:mac --workspace @fabric/desktop
npm run dist:linux --workspace @fabric/desktop
```

Unsigned installers may show operating system security warnings.

## Signing Policy

Alpha:

- Build unsigned installers.
- Keep `CSC_IDENTITY_AUTO_DISCOVERY=false` in CI.
- Document OS warnings honestly on download pages.
- Prefer GitHub Release assets over third-party mirrors.

Beta:

- Keep unsigned builds acceptable only for limited testers.
- Re-evaluate Windows code signing and Apple Developer ID before wider distribution.

Stable:

- Require Windows code signing.
- Require macOS signing and notarization.
- Keep Linux AppImage and deb checksums attached to the release.

## Manual QA

Run this checklist on each artifact before announcing a desktop alpha.

Windows `.exe`:

- [ ] Installer opens and shows Fabric name/icon.
- [ ] Install for current user works.
- [ ] Desktop shortcut launches Fabric.
- [ ] Start menu shortcut launches Fabric.
- [ ] First startup waits for backend/gateway readiness.
- [ ] Create profile.
- [ ] Restart app and confirm profile persists.
- [ ] Close/minimize behavior follows tray settings.
- [ ] Restart action restarts the app after Public URL changes.
- [ ] External OAuth/browser links open outside Electron.
- [ ] Native notifications appear only when Fabric is not focused.
- [ ] Update check opens the GitHub release URL.

macOS `.dmg`:

- [ ] DMG opens and contains Fabric app.
- [ ] App copies to Applications.
- [ ] First launch behavior is understood for unsigned alpha builds.
- [ ] First startup waits for backend/gateway readiness.
- [ ] Create profile.
- [ ] Restart app and confirm profile persists.
- [ ] Close/minimize behavior follows tray settings.
- [ ] External OAuth/browser links open outside Electron.
- [ ] Update check opens the GitHub release URL.

Linux `.AppImage` and `.deb`:

- [ ] AppImage starts after executable permission is set if needed.
- [ ] deb installs through the system package manager.
- [ ] Fabric launches with icon/name.
- [ ] First startup waits for backend/gateway readiness.
- [ ] Create profile.
- [ ] Restart app and confirm profile persists.
- [ ] Tray behavior is visible in the active desktop environment when supported.
- [ ] External OAuth/browser links open outside Electron.
- [ ] Update check opens the GitHub release URL.

Public URL regression:

- [ ] Expose gateway `23800` through ngrok or a real domain.
- [ ] Configure Public URL in Fabric.
- [ ] Confirm the restart prompt appears.
- [ ] Restart from the prompt.
- [ ] Open the public URL on another device.
- [ ] Submit a published form trigger.
- [ ] Confirm the execution appears in Fabric.
