import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const desktopPackage = JSON.parse(
  await readFile(new URL('../package.json', import.meta.url), 'utf8'),
);
const ciWorkflow = await readFile(
  new URL('../../../.github/workflows/ci.yml', import.meta.url),
  'utf8',
);
const readme = await readFile(
  new URL('../../../README.md', import.meta.url),
  'utf8',
);

test('desktop release artifact names are stable for landing page downloads', () => {
  assert.equal(
    desktopPackage.build.artifactName,
    'Fabric-${version}-${os}-${arch}.${ext}',
  );
  assert.equal(desktopPackage.build.directories.output, 'release');

  assert.deepEqual(desktopPackage.build.win.target, [
    { target: 'nsis', arch: ['x64'] },
  ]);
  assert.deepEqual(desktopPackage.build.mac.target, [
    { target: 'dmg', arch: ['x64', 'arm64'] },
  ]);
  assert.deepEqual(desktopPackage.build.linux.target, ['AppImage', 'deb']);
});

test('desktop CI uploads every alpha installer format', () => {
  assert.match(ciWorkflow, /name:\s+Desktop package/);
  assert.match(ciWorkflow, /script:\s+dist:win/);
  assert.match(ciWorkflow, /script:\s+dist:mac/);
  assert.match(ciWorkflow, /script:\s+dist:linux/);
  assert.match(ciWorkflow, /apps\/desktop\/release\/\*\.exe/);
  assert.match(ciWorkflow, /apps\/desktop\/release\/\*\.dmg/);
  assert.match(ciWorkflow, /apps\/desktop\/release\/\*\.AppImage/);
  assert.match(ciWorkflow, /apps\/desktop\/release\/\*\.deb/);
  assert.match(ciWorkflow, /CSC_IDENTITY_AUTO_DISCOVERY:\s+"false"/);
});

test('README discloses unsigned alpha installers', () => {
  assert.match(readme, /unsigned alpha installers/);
  assert.match(readme, /Do not claim/);
  assert.match(readme, /Fabric-<version>-win-x64\.exe/);
  assert.match(readme, /Fabric-<version>-mac-x64\.dmg/);
  assert.match(readme, /Fabric-<version>-mac-arm64\.dmg/);
  assert.match(readme, /Fabric-<version>-linux-x64\.AppImage/);
  assert.match(readme, /Fabric-<version>-linux-amd64\.deb/);
});
