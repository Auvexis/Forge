# Feature: Publish & Unpublish de Workflows

**Objetivo:** Implementar um ciclo de vida explícito de publicação para workflows, separando claramente o estado de edição (draft) do estado de execução em produção (published/unpublished). Inclui webhook com nome customizado, expected body schema e painel de monitoramento de produção.

---

## Tarefas a Executar:

### 🗄️ Backend — Banco de Dados

- [ ] **1. Migration: adicionar `published_at` ao `workflows.db`**
  - Criar `server/src/core/database/migrations/workflows/002_add_published_at.ts`.
  - Adicionar coluna `published_at TEXT` (nullable) à tabela `workflows`.

- [ ] **2. Atualizar tipos compartilhados (server)**
  - Adicionar `publishedAt?: string` em `WorkflowMetadata`.
  - Adicionar `webhookSlug?: string` em `WorkflowTrigger` (nome legível para o endpoint).
  - Adicionar `webhookBodySchema?: Record<string, WebhookBodyField>` em `WorkflowTrigger`.
  - Criar interface `WebhookBodyField { type, required?, description? }`.
  - Atualizar `WorkflowRepository.saveWorkflow` para persistir `published_at`.

### ⚡ Backend — Endpoints

- [ ] **3. Refatorar `POST /workflows/:id/publish`**
  - Setar `is_active=1`, `is_draft=0`, `published_at=datetime('now')` no banco.
  - Chamar `Scheduler.resync()`.
  - Retornar o workflow atualizado com `publishedAt`.

- [ ] **4. Criar `POST /workflows/:id/unpublish`**
  - Setar `is_active=0` no banco.
  - Chamar `Scheduler.resync()` para remover cron job.
  - Retornar o workflow atualizado.

- [ ] **5. Criar `GET /workflows/production-status`**
  - Query: todos os workflows com `is_active=1 AND is_draft=0`.
  - Para cada um, buscar o último registro de `workflow_executions` (LEFT JOIN ou subquery).
  - Retornar: `id, name, triggerType, publishedAt, lastExecution { id, status, startTime, endTime }`.

- [ ] **6. Webhook Dual-Mode + Slug Resolution**
  - Renomear rota atual `/webhooks/:path` → `/webhook/:path` (production only, is_active=1).
  - Criar `/webhook-test/:path` (qualquer workflow com o path, execução **síncrona**, retorna `contextState`).
  - Atualizar match logic: resolver `webhookSlug` antes de `webhookPath`.
  - Validar `webhookSlug`: formato kebab-case e unicidade no banco.

### 🎨 Frontend — TriggerEditor (Webhook)

- [ ] **7. Adicionar tipos no client-vue**
  - Adicionar `webhookSlug?: string` ao tipo `WorkflowTrigger`.
  - Adicionar `webhookBodySchema?: Record<string, WebhookBodyField>` ao tipo.
  - Adicionar `publishedAt?: string` ao tipo `WorkflowMetadata`.

- [ ] **8. Atualizar `TriggerEditor.vue` — seção Webhook**
  - Adicionar campo **"Endpoint Slug"** (input text, kebab-case hint).
  - URL preview em tempo real: mostrar `/webhook-test/{slug}` e `/webhook/{slug}`.
  - Adicionar seção **"Expected Body"** com builder igual ao Manual Schema (add/remove campos com nome, tipo, required).

### 🎨 Frontend — Publish/Unpublish UI

- [ ] **9. Criar `WorkflowPublishButton.vue`**
  - 3 estados visuais: `draft` (cinza, "Publish"), `published` (verde, "Unpublish"), `unpublished` (laranja, "Re-publish").
  - Calls: `POST /workflows/:id/publish` ou `POST /workflows/:id/unpublish`.
  - Loading state durante a requisição.

- [ ] **10. Integrar `WorkflowPublishButton` na toolbar do editor**
  - Exibir ao lado do botão de Save na `Nod8WorkflowCanvas.vue` ou toolbar do editor.

- [ ] **11. Badge de status na listagem de workflows**
  - Exibir pill/badge `Draft`, `Published` ou `Inactive` em cada card da lista.
  - Exibir `publishedAt` formatado (ex: "Publicado há 2 dias").

### 🖥️ Frontend — Production Monitor Panel

- [ ] **12. Criar `ProductionMonitorPanel.vue`**
  - Consumir `GET /workflows/production-status`.
  - Card por workflow: nome, trigger badge (cron/webhook/event), status badge (success/error/running), tempo relativo da última execução, botão "Unpublish".
  - Polling de 10s quando painel estiver aberto (`onMounted` → `setInterval`, `onUnmounted` → `clearInterval`).
  - Botão de refresh manual.
  - Estado vazio quando nenhum workflow publicado.

- [ ] **13. Integrar painel na sidebar**
  - Adicionar ícone `activity` na `AppSidebar` (via `App.vue`).
  - Ao clicar: `panelStore.openPanel({ component: ProductionMonitorPanel, title: 'Production', position: 'left', width: 'md' })`.

### ✅ Validação

- [ ] **14. Testes e validação**
  - Workflows com `is_draft=1` não aparecem no Scheduler nem no `/webhook/:path`.
  - `/webhook-test/:path` retorna `contextState` completo da execução.
  - `/webhook/:path` retorna 404 para workflows não publicados.
  - Unpublish remove o cron job imediatamente (`Scheduler.resync()`).
  - Re-publish reativa o cron job.
  - `webhookSlug` customizado gera URL correta e bloqueia duplicatas.
  - Production Monitor atualiza a cada 10s e reflete o status correto.
