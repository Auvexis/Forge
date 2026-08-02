import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const read = (file: string) => readFileSync(new URL(file, import.meta.url), 'utf8')

test('workspace host teleports one Vue tree into a native window document', () => {
  const host = read('../BaseWorkspaceWindow.vue')
  const controller = read('../workspace-window.controller.ts')

  assert.match(host, /<Teleport[^>]*:to="target"/)
  assert.match(host, /<slot name="tabs"/)
  assert.match(host, /<slot \/>/)
  assert.match(controller, /window\.open\(/)
  assert.match(controller, /syncStyles/)
  assert.match(controller, /syncDocumentTheme/)
})

test('workspace host uses the shared Fabric window controls', () => {
  const host = read('../BaseWorkspaceWindow.vue')
  const topbar = read('../../components/layout/AppTopbar.vue')

  assert.match(host, /<BaseWindowControls/)
  assert.match(topbar, /<BaseWindowControls/)
})
