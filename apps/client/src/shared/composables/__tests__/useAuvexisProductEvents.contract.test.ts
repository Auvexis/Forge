import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '../../../..')

function read(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

test('Auvexis product events composable exposes a simple frontend trigger', () => {
  const source = read('src/shared/composables/useAuvexisProductEvents.ts')

  assert.match(source, /export function useAuvexisProductEvents/)
  assert.match(source, /triggerAuvexisEvent/)
  assert.match(source, /auvexisAccountApi\.emitProductEvent\(input\)/)
  assert.match(source, /isEmitting/)
  assert.match(source, /lastResult/)
  assert.doesNotMatch(source, /accessToken|refreshToken|idToken/)
})
