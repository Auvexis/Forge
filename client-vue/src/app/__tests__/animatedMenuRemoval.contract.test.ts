import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const repoRoot = resolve(import.meta.dirname, '../../../..')
const currentFile = resolve(import.meta.filename)
const scannedRoots = [
  resolve(repoRoot, 'client-vue/src'),
  resolve(repoRoot, 'server/src'),
]
const forbiddenTerms = ['Woo' + 'by', 'woo' + 'by', 'Base' + 'Woo' + 'by' + 'Menu']

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = resolve(dir, entry)
    if (path === currentFile) return []

    const stats = statSync(path)
    if (stats.isDirectory()) return sourceFiles(path)
    if (!/\.(css|ts|vue)$/.test(path)) return []
    return [path]
  })
}

test('animated menu code is removed from frontend and backend sources', () => {
  const matches = scannedRoots
    .flatMap(sourceFiles)
    .flatMap((file) => {
      const source = readFileSync(file, 'utf8')
      return forbiddenTerms.some((term) => source.includes(term)) ? [file] : []
    })

  assert.deepEqual(matches, [])
})
