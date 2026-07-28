import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const source = readFileSync(fileURLToPath(new URL('../app.ts', import.meta.url)), 'utf8')
const dockerfile = readFileSync(resolve(process.cwd(), 'Dockerfile'), 'utf8')

describe('app constants contract', () => {
  it('uses relative API URLs outside the local Vite dev server', () => {
    assert.match(source, /function resolveApiBaseUrl/)
    assert.match(source, /port === '23802'/)
    assert.match(source, /return isLocalVite \? 'http:\/\/localhost:23801' : ''/)
  })

  it('does not bake the local API origin into the production Docker image', () => {
    assert.match(dockerfile, /ARG VITE_API_URL=\s*\n/)
    assert.doesNotMatch(dockerfile, /ARG VITE_API_URL=http:\/\/localhost:23801/)
  })
})
