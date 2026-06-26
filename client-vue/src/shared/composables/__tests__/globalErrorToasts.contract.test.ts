import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

function read(relativePath: string) {
  return fs.readFileSync(path.resolve(relativePath), 'utf8')
}

describe('global error toasts contract', () => {
  it('main installs global browser error capture before mounting the app', () => {
    const source = read('src/main.ts')

    assert.match(source, /installGlobalErrorToasts\(app\)/)
    assert.ok(source.indexOf('installGlobalErrorToasts(app)') < source.indexOf("app.mount('#app')"))
  })

  it('global error capture forwards console and runtime errors to toast', () => {
    const source = read('src/shared/composables/globalErrorToasts.ts')

    assert.match(source, /useToast/)
    assert.match(source, /console\.error\s*=/)
    assert.match(source, /addEventListener\('error'/)
    assert.match(source, /addEventListener\('unhandledrejection'/)
    assert.match(source, /app\.config\.errorHandler/)
    assert.match(source, /toast\.error/)
  })
})
