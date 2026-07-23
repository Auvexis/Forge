import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const source = readFileSync(fileURLToPath(new URL('../app.ts', import.meta.url)), 'utf8')

describe('app constants contract', () => {
  it('uses relative API URLs outside the local Vite dev server', () => {
    assert.match(source, /function resolveApiBaseUrl/)
    assert.match(source, /port === '23802'/)
    assert.match(source, /return isLocalVite \? 'http:\/\/localhost:23801' : ''/)
  })
})
