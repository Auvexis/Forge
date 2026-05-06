# Milestone 1.6 — Task Tracker

## Task 1: Type System Evolution (Backend + Frontend)
- [x] Adicionar `TriggerRegistrationContext` em `server/src/shared/models/plugin-types.ts`
- [x] Adicionar `PluginTriggerManifest` e `PluginTriggerHooks` em `plugin-types.ts`
- [x] Estender `PluginManifest` com `triggers?: Record<string, PluginTriggerManifest>`
- [x] Estender `Nod8Plugin` com `triggers?: Record<string, PluginTriggerHooks>`
- [x] Adicionar `"plugin"` ao `WorkflowTrigger.type` em `workflow-types.ts` (backend)
- [x] Adicionar campos `pluginId`, `triggerName`, `triggerParams` ao `WorkflowTrigger`
- [x] Adicionar `lastTriggerPayload` ao `WorkflowTrigger` para persistência do payload capturado
- [x] Espelhar mudanças nos tipos do frontend (`client-vue/src/core/types/`)

## Task 2: DB Migration — `last_trigger_payload`
- [x] Criar migration `003_add_last_trigger_payload.ts` para a coluna na tabela `workflows`
- [x] Adicionar `saveLastTriggerPayload(workflowId, payload)` no `WorkflowRepository`
- [x] Adicionar `getLastTriggerPayload(workflowId)` no `WorkflowRepository`

## Task 3: `TriggerListenerRegistry` (Core — Stateless, In-Memory)
- [x] Criar `server/src/core/modules/workflows/trigger-listener-registry.ts`
- [x] Implementar `register(webhookPath, sseSend)`, `consume(webhookPath)`, `has(webhookPath)`

## Task 4: Rota SSE `GET /workflows/:workflowId/trigger/listen`
- [x] Criar endpoint SSE em `workflows.routes.ts`
- [x] Registrar workflow no `TriggerListenerRegistry` com timeout de 120s
- [x] Enviar `{ type: 'listening' }` ao conectar e `{ type: 'timeout' }` ao expirar

## Task 5: Webhook Intercept no `webhooks.routes.ts`
- [x] Checar `TriggerListenerRegistry` antes de executar workflow
- [x] Se "listening": salvar payload via `WorkflowRepository.saveLastTriggerPayload`, emitir via SSE, retornar 200 fast
- [x] Se não: seguir fluxo normal de execução

## Task 6: `WorkflowLifecycleManager` (Core Module)
- [x] Criar `server/src/core/modules/workflows/lifecycle.ts`
- [x] `activate(workflow)`: chamar `plugin.triggers[name].setup(ctx)` se trigger type = "plugin"
- [x] `deactivate(workflow)`: chamar `plugin.triggers[name].teardown(ctx)` se trigger type = "plugin"
- [x] Erro no `setup()` deve retornar erro estruturado (não 500 genérico)

## Task 7: Hook do Lifecycle nas Rotas
- [x] `POST /workflows/:id/publish` → chamar `WorkflowLifecycleManager.activate`
- [x] `POST /workflows/:id/unpublish` → chamar `WorkflowLifecycleManager.deactivate`
- [x] `DELETE /workflows/:id` → chamar `WorkflowLifecycleManager.deactivate`

## Task 8: Telegram Plugin — Adicionar Trigger
- [x] Adicionar `triggers.onMessage` em `telegram/index.ts`
- [x] Implementar `setup()`: chamar `setWebhook` na API do Telegram
- [x] Implementar `teardown()`: chamar `deleteWebhook` na API do Telegram
- [x] Adicionar `onMessage` em `telegram/manifest.json` na seção `triggers`

## Task 9: Frontend — Tipos e API
- [x] Atualizar `client-vue/src/core/types/plugin.types.ts` com `PluginTriggerManifest`, `triggers` no `PluginManifest`
- [x] Atualizar `client-vue/src/core/types/workflow.types.ts` com tipo `"plugin"` e campos novos no trigger
- [x] Adicionar `listenForTrigger(workflowId)` em `workflows.api.ts` (retorna EventSource SSE)
- [x] Adicionar `getLastTriggerPayload(workflowId)` em `workflows.api.ts`

## Task 10: Frontend — `TriggerEditor.vue` Plugin Trigger Section
- [x] Adicionar opção "Plugin Trigger" no dropdown de tipo
- [x] Renderizar seletor de plugin (reusa `pluginsApi.getAll()`)
- [x] Renderizar seletor de trigger name (da `plugin.manifest.triggers`)
- [x] Renderizar form de params do trigger (reusa lógica de renderização do `PluginEditor.vue`)
- [x] Implementar botão "Listen for Event" com estado SSE (idle → listening → captured → timeout)

## Task 11: Frontend — Left Pane com Payload Capturado
- [x] No `NodeInspectorModal.vue`, para TriggerNode, exibir `lastTriggerPayload` no left pane
- [x] Atualizar `workflow.store.ts` para carregar e expor `lastTriggerPayload`
- [x] Quando "Listen" captura evento, atualizar o store imediatamente sem reload
