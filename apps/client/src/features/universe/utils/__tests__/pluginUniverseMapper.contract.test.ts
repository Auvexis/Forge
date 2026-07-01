import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '../../../../..')

function read(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

test('universe mapper reads plugin metadata categories from the SDK v2 contract', () => {
  const source = read('src/features/universe/utils/pluginUniverseMapper.ts')

  assert.match(source, /metadata\.categories/)
  assert.match(source, /primaryCategory/)
  assert.doesNotMatch(source, /metadata\.category/)
})
