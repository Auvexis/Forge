import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

const nodesDir = path.resolve('src/features/plugin-creator/components/nodes')

describe('plugin creator MVP nodes', () => {
  it('render names, handles and connection handles', () => {
    const files = ['MethodNode.vue', 'InputNode.vue', 'CredentialNode.vue', 'RequestNode.vue']

    for (const file of files) {
      const source = fs.readFileSync(path.join(nodesDir, file), 'utf8')
      assert.match(source, /data\.name|data\.label/)
      assert.match(source, /data\.handle|data\.name/)
      assert.match(source, /BaseNode/)
      assert.match(source, /:id="id"/)
      assert.match(source, /has-source/)
      assert.match(source, /has-target/)
      assert.match(source, /hasOutgoingConnection|has-outgoing-connection/)
    }
  })
})
