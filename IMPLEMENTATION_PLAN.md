# Nod8 — Publish/Unpublish Workflow Feature Plan

## 1. Análise do Estado Atual

### O que já existe
- `WorkflowMetadata.isActive` (boolean) — controla se o workflow aparece no Scheduler e nos webhooks. Atualmente é usado como "ativo/inativo" sem distinção de modo de execução.
- `WorkflowMetadata.isDraft` (boolean) — indica que o workflow ainda não foi publicado (só existe na UI).
- `POST /workflows/:id/publish` — já existe, mas apenas faz `isDraft = false` e chama `Scheduler.resync()`. **Não tem semântica de produção real**.
- `GET /webhooks/:webhookPath` — serve webhooks apenas de `getActiveWorkflows()` (is_active=1 AND is_draft=0). **Não diferencia test vs. production**.
- `Scheduler` — inicializa cron jobs de todos os `activeWorkflows`. **Não tem noção de "publicado em produção"**.
- `GlobalAppPanel` — sistema de painel global já existe com `AppPanelStore` (`position: 'left' | 'right' | 'bottom'`), suporta qualquer componente injetado via `openPanel({ component, title, position })`.
- `TriggerEditor.vue` — já tem seção de webhook com URL display, HTTP methods e HMAC secret. **Não tem campo de nome customizado nem expected body schema**.

### O problema central
O sistema atual mistura dois conceitos que devem ser ortogonais:
- **Draft vs. Published** → estado de edição (já temos `isDraft`)
- **Active/Production vs. Inactive** → estado de execução em segundo plano (ainda não existe)

Isso significa que hoje, salvar um workflow com `isActive=true` e `isDraft=false` já o bota para rodar em cron e receber webhooks — sem nenhuma ação explícita do usuário. No n8n (e em qualquer plataforma profissional), **Publish é uma ação intencional separada do Save**.

---

## 2. Modelo Mental (como vai funcionar)

```
┌─────────────────────────────────────────────────────────────┐
│                      Ciclo de vida                          │
│                                                             │
│   [Criar]  →  DRAFT                                         │
│               │                                             │
│               │  Save (auto-save no editor)                 │
│               │  → continua DRAFT                           │
│               │                                             │
│               │  Publish                                     │
│               ▼                                             │
│            PUBLISHED  ←──────────────────────────┐          │
│               │                                  │          │
│               │  Unpublish                        │  Re-Publish
│               ▼                                  │          │
│            UNPUBLISHED ──────────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### Estados de um workflow
| Estado | `is_draft` | `is_active` | Cron roda? | Webhook endpoint |
|---|---|---|---|---|
| Draft | 1 | qualquer | ❌ | `/webhook-test/:path` |
| Published | 0 | 1 | ✅ | `/webhook/:path` |
| Unpublished | 0 | 0 | ❌ | nenhum |

---

## 3. Solução de Arquitetura

### 3.1 — Sem nova tabela de banco (por que)
A sugestão de criar uma tabela separada para workflows publicados seria overhead desnecessário. O `workflows.db` já tem `is_active` e `is_draft`. A solução correta é **separar a semântica dos dois campos** e adicionar um campo de auditoria: `published_at`.

### 3.2 — Migration em `workflows.db`
Adicionar a coluna `published_at TEXT` (nullable) para rastrear quando o workflow foi publicado pela última vez. Isso também serve de log de auditoria no futuro.

```sql
ALTER TABLE workflows ADD COLUMN published_at TEXT;
```

### 3.3 — Novos endpoints de API

```
POST /workflows/:id/publish    → is_active=1, is_draft=0, published_at=now
POST /workflows/:id/unpublish  → is_active=0
```

O endpoint `/publish` já existe, mas será **refatorado** para ter semântica clara.

### 3.4 — Endpoints de Webhook (dois modos)

| Modo | URL | Condição de match |
|---|---|---|
| Test | `/webhook-test/:path` | qualquer `webhookPath` correspondente |
| Production | `/webhook/:path` | `is_active=1 AND is_draft=0` |

O endpoint de test **executa de forma síncrona** (aguarda o resultado para facilitar debug).
O endpoint de produção **executa de forma assíncrona** (dispara e responde 202).

### 3.5 — Scheduler
O `Scheduler` **não muda** sua lógica. Ele já usa `getActiveWorkflows()` (is_active=1 AND is_draft=0). Com a nova semântica, isso mapeará exatamente para "workflows publicados".

---

## 4. Feature: Webhook com Nome Customizado e Expected Body

### 4.1 — Problema
O `webhookPath` hoje é auto-gerado como `wh_{id}_{hex}` — opaco e difícil de memorizar. Não há como o usuário documentar o schema esperado do body da requisição.

### 4.2 — Solução no tipo `WorkflowTrigger`
Adicionar dois campos opcionais ao tipo `WorkflowTrigger` (shared):

```typescript
webhookSlug?: string;     // Nome legível, ex: "nova-venda" → /webhook/nova-venda
webhookBodySchema?: Record<string, WebhookBodyField>; // Expected body shape
```

Onde `WebhookBodyField`:
```typescript
interface WebhookBodyField {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  description?: string;
}
```

### 4.3 — Lógica de resolução do path
Ao fazer match do webhook na rota, a prioridade será:
1. Se `webhookSlug` está definido e é único → usa o slug como path (`/webhook/nova-venda`)
2. Caso contrário → usa o `webhookPath` auto-gerado (`/webhook/wh_abc123`)

O `webhookSlug` será validado no backend (kebab-case, unicidade).

### 4.4 — Expected Body como documentação + validação opcional
O `webhookBodySchema` serve dois propósitos:
1. **Documentação** → mostrado no `TriggerEditor.vue` como "O que esse webhook espera receber"
2. **Validação opcional** → se `strict: true`, o backend rejeita bodies que não correspondem ao schema (futuro)

### 4.5 — Atualização do `TriggerEditor.vue`
Adicionar na seção WEBHOOK:
- Campo **"Endpoint Slug"** (input text): permite o usuário definir um nome legível. Abaixo, mostra a URL resultante atualizada em tempo real.
- Seção **"Expected Body"** (igual ao "Expected Manual Inputs" do trigger manual): lista de campos com nome, tipo e required.

---

## 5. Feature: Painel "Production Monitor" (Esquerda)

### 5.1 — Conceito
Um painel lateral esquerdo fixo na sidebar que lista todos os workflows publicados (`is_active=1 AND is_draft=0`) com:
- Nome do workflow
- Tipo de trigger (badge: cron / webhook / event)
- Status da última execução (✅ success / ❌ error / ⏳ running)
- Timestamp da última execução (ex: "há 3 min")
- Botão rápido para Unpublish

### 5.2 — Integração com o sistema de painéis existente
O `GlobalAppPanel` já suporta `position: 'left'`. Bastará criar:
- `ProductionMonitorPanel.vue` — o componente de conteúdo
- Um ícone na sidebar que chama `panelStore.openPanel({ component: ProductionMonitorPanel, title: 'Production', position: 'left' })`

### 5.3 — Dados necessários (novo endpoint)
```
GET /workflows/production-status
```
Retorna array de workflows publicados com dados do último log de execução:
```json
[
  {
    "id": "wf_abc",
    "name": "Nova Venda → CRM",
    "triggerType": "webhook",
    "isActive": true,
    "publishedAt": "2026-04-28T...",
    "lastExecution": {
      "id": "exec_123",
      "status": "success",
      "startTime": 1714339200000,
      "endTime": 1714339201234
    }
  }
]
```

### 5.4 — Atualização automática
O painel fará polling leve (`setInterval` de 10s) quando estiver aberto, ou poderá ser atualizado manualmente via botão de refresh. **Sem WebSocket por ora** — polling é suficiente para o MVP.

---

## 6. Contratos de API (Detalhado)

### `POST /workflows/:id/publish`
```json
{ "status_code": 200, "message": "Workflow published and running in production",
  "data": { "metadata": { "isActive": true, "isDraft": false, "publishedAt": "2026-04-28T..." } } }
```

### `POST /workflows/:id/unpublish`
```json
{ "status_code": 200, "message": "Workflow unpublished — removed from production",
  "data": { "metadata": { "isActive": false } } }
```

### `GET /webhook-test/:path` (novo)
- Executa **síncronamente**, retorna `contextState` final. Ideal para debug no editor.

### `GET /webhook/:path` (refatorado)
- Só responde para `is_active=1 AND is_draft=0`. Match por `webhookSlug` ou `webhookPath`.
- Executa **assincronamente** (202 + executionId).

### `GET /workflows/production-status` (novo)
- Retorna workflows publicados com dados do último `workflow_executions` row (LEFT JOIN).

---

## 7. Fases de Implementação (Roadmap)

### Fase 1 — Backend: Migration + Tipos compartilhados
1. Criar `002_add_published_at.ts` em `migrations/workflows/`.
2. Adicionar `publishedAt?: string` em `WorkflowMetadata` (server shared types).
3. Adicionar `webhookSlug?: string` e `webhookBodySchema?` em `WorkflowTrigger`.
4. Atualizar `WorkflowRepository.saveWorkflow` para persistir `published_at`.

### Fase 2 — Backend: Endpoints de Publish/Unpublish + Production Status
1. Refatorar `POST /workflows/:id/publish`.
2. Criar `POST /workflows/:id/unpublish`.
3. Criar `GET /workflows/production-status`.
4. Ambos publish/unpublish chamam `Scheduler.resync()`.

### Fase 3 — Backend: Webhook Dual-Mode + Slug
1. Renomear `/webhooks/:path` → `/webhook/:path` (production).
2. Criar `/webhook-test/:path` (síncrono, sem filtro de `is_active`).
3. Atualizar match logic para resolver `webhookSlug` antes de `webhookPath`.

### Fase 4 — Frontend: Webhook Slug + Expected Body no TriggerEditor
1. Adicionar campo `webhookSlug` ao tipo `WorkflowTrigger` no client-vue.
2. Adicionar campo `webhookBodySchema` ao tipo.
3. Atualizar `TriggerEditor.vue`:
   - Campo "Endpoint Slug" com URL preview em tempo real.
   - Seção "Expected Body" (igual ao manual schema builder).
4. Mostrar URL de test e URL de produção separadas.

### Fase 5 — Frontend: WorkflowPublishButton + Badge de status
1. Criar `WorkflowPublishButton.vue` com 3 estados (draft / published / unpublished).
2. Integrar na toolbar do editor de workflows.
3. Atualizar listagem de workflows com badge de status.

### Fase 6 — Frontend: Production Monitor Panel
1. Criar `ProductionMonitorPanel.vue` consumindo `GET /workflows/production-status`.
2. Adicionar ícone na sidebar (`activity`) que abre o painel à esquerda via `panelStore.openPanel`.
3. Implementar polling de 10s quando o painel estiver aberto.
4. Cards de workflow com: nome, trigger badge, status badge, tempo relativo, botão Unpublish.

---

## 8. Manutenção do Core Limpo

- **Sem dependências novas**: A feature inteira usa o que já existe. Nenhum pacote novo.
- **Backward compatible**: Workflows com `is_active=1, is_draft=0` já serão "publicados" automaticamente.
- **Scheduler inalterado**: `getActiveWorkflows()` já filtra corretamente.
- **GlobalAppPanel reutilizado**: o painel de produção usa exatamente o sistema de painéis já existente, apenas com `position: 'left'`.
- **Slug é opcional**: se não definido, o `webhookPath` auto-gerado continua funcionando normalmente.
