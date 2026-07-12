import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '../../../../..')

function read(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

test('universe core particle shader uses a custom color attribute name', () => {
  const source = read('src/features/universe/systems/galaxySystem.ts')

  assert.match(source, /setAttribute\('aColor'/)
  assert.match(source, /attribute vec3 aColor;/)
  assert.match(source, /vColor = aColor;/)
  assert.doesNotMatch(source, /attribute vec3 color;/)
})

test('universe mode collapses the app sidebar shell area', () => {
  const source = read('src/app/App.vue')

  assert.match(source, /isSidebarCollapsed \|\| appUiStore\.isUniverseMode/)
})
