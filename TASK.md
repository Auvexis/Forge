# TASK.md — Marco 1.2: O Portfólio de Plugins "Matadores"

> **Regra de Ouro:** Nenhum código deste Marco deve tocar na engine principal (`executor.ts`, `manager.ts`, `PluginEditor.vue`). Todo código específico vive dentro de `server/src/plugins/nod8/*`.

---

## Estado Atual da Engine (Referência)

| Arquivo | Responsabilidade |
|---|---|
| `plugins/executor.ts` | Executa método, auto-refresh OAuth2, cooking de params (file/base64) |
| `plugins/loader.ts` | Carrega plugins por filesystem, valida manifest, sync com DB registry |
| `plugins/validator.ts` | AJV — valida params contra JSON Schema, remove campos extras |
| `plugins/credential-store.ts` | CRUD de credentials e tokens no SQLite |
| `plugins/vault.ts` | Merge de ENV secrets com credentials do DB |
| `workflows/executor.ts` | Orquestra DAG de nós (plugin, code, if, loop, http, event, subworkflow) |
| `routes/plugins.routes.ts` | REST API: CRUD, execute, OAuth connect/callback, status |

**Tipos de x-input-type disponíveis:**
`text`, `password`, `number`, `url`, `email`, `file`, `files`, `textarea`, `select`, `multiselect`, `toggle`, `datetime`, `code`, `json`

**Tipos de auth suportados pelo core:**
`oauth2` (Google), `api_key` (Telegram, etc), `none`

---

## PARTE 1 — Google Workspace

### 1.1 Gmail — Refinamento (`google-gmail`)

**Status:** Concluído

- [x] **[GMAIL-1] Sanitização de Headers Reforçada**
  - Em `methods.ts -> sendMessage` e `createDraft`: sanitizar `to`, `from` e `subject` removendo caracteres de controle, validar formato de email.
  - **Critério:** API do Gmail não deve retornar `400 Bad Request` por headers malformados.

- [x] **[GMAIL-2] Auditar `x-label` em todos os campos do manifest**
  - Adicionar `x-label` a `to`, `from`, `subject`, `body` em `sendMessage` e `createDraft`.

- [x] **[GMAIL-3] Refactor MIME builder — extrair helper privado (DRY)**
  - Extrair `buildMimeMessage()` para reutilizar entre `sendMessage` e `createDraft`.
  - Suportar `Content-Type: text/plain` como fallback.

- [x] **[GMAIL-4] `x-input-type: select` para campo `format` em `getMessage`**
  - `enum: ["full", "metadata", "minimal", "raw"]` — gera dropdown automático.

> **Commit:** `feat(gmail): sanitize headers + MIME refactor + format dropdown`

---

### 1.2 Google Drive — Polimento (`google-drive`)

**Status:** Concluído

- [x] **[DRIVE-1] `listFiles`: Campo `orderBy` com `x-input-type: select`**
  - `enum: ["name", "modifiedTime", "createdTime", "size"]`.

- [x] **[DRIVE-2] `listFiles`: Campo `mimeTypeFilter` com `x-visible-if`**
  - Toggle `showMimeFilter` + campo condicional `mimeTypeFilter`.

- [x] **[DRIVE-3] `uploadFile`: Suporte a Buffer do pipeline do workflow**
  - Aceitar `{ content: Buffer, mimeType }` (vindo de step anterior) além de `{ contentBase64, mimeType }` (upload manual).

- [x] **[DRIVE-4] Auditar e padronizar `x-label` em todos os campos**

> **Commit:** `feat(drive): orderBy + mimeType filter + buffer pipeline support`

---

### 1.3 Google Sheets — Novo Plugin (`google-sheets`)

**Status:** Concluído

**Estrutura:**
```
server/src/plugins/nod8/google-sheets/
  index.ts       # OAuth2 Provider (scopes: spreadsheets + drive.readonly)
  manifest.json  # readRows, appendRow, listSpreadsheets
  methods.ts     # googleapis sheets v4
```

- [x] **[SHEETS-1] Criar `index.ts` com OAuth2 Provider**
  - Scopes: `spreadsheets` + `drive.readonly`. testConnection via `sheets.spreadsheets.get`.

- [x] **[SHEETS-2] Método `listSpreadsheets` (helper para `x-dynamic-options`)**
  - `drive.files.list` com mimeType filter. Retornar `[{ id, name }]`.

- [x] **[SHEETS-3] Método `readRows` — Ler linhas**
  - `spreadsheetId`: `x-input-type: "select"` com `x-dynamic-options: { method: "listSpreadsheets", labelPath: "name", valuePath: "id" }`.
  - `range`: `x-input-type: "text"`. `includeHeader`: toggle.

- [x] **[SHEETS-4] Método `appendRow` — Adicionar linha**
  - `spreadsheetId`: select com dynamic-options. `values`: `x-input-type: "json"`.

- [x] **[SHEETS-5] Rota genérica `GET /plugins/:pluginId/dynamic-options/:method` no backend**
  - Em `plugins.routes.ts`. Chamar `PluginExecutor.execute(pluginId, method, {})`.
  - **Genérico** — serve para qualquer plugin com `x-dynamic-options`.

- [x] **[SHEETS-6] Integrar `x-dynamic-options` no frontend (client-vue)**
  - Detectar `x-dynamic-options` ao renderizar campo. Buscar opções via API. Re-buscar quando `dependsOn` mudar.

> **Commit:** `feat(sheets): new plugin readRows + appendRow + generic dynamic-options route`

---

## PARTE 2 — Telegram Bot

**Status:** Concluído

**Estrutura:**
```
server/src/plugins/nod8/telegram/
  index.ts       # ApiKeyProvider — credentialSchema: bot_token
  manifest.json  # sendMessage, sendDocument, sendPhoto, sendPoll, setWebhook
  methods.ts     # fetch nativo para Telegram Bot API v9.6
```

- [x] **[TG-1] Criar `index.ts` com `ApiKeyProvider`**
  - `credentialSchema: { bot_token: { inputType: "password", ... } }`.
  - `testConnection`: GET `/getMe` — retornar true se `ok: true`.

- [x] **[TG-2] Helper `telegramApi()` em `methods.ts`**
  - Extrai `bot_token` de `context.credentials`. Trata erros da API.

- [x] **[TG-3] Método `sendMessage`**
  - `chatId` (text) + `text` (textarea) + `useFormatting` (toggle) + `parseMode` (select, x-visible-if).
  - `disableNotification` (toggle) + `protectContent` (toggle).
  - `useKeyboard` (toggle) + `replyMarkup` (json, x-visible-if).

- [x] **[TG-4] Método `sendDocument`**
  - `chatId` + `file` (`x-input-type: "file"`, integra com Buffer do executor) + `filename` + `caption`.
  - Envio multipart/form-data via FormData + fetch.

- [x] **[TG-5] Método `sendPhoto`**
  - Similar ao `sendDocument`. Aceitar URL ou Buffer (toggle entre os dois via `x-visible-if`).

- [x] **[TG-6] Método `sendPoll`**
  - `chatId` + `question` + `options` (json) + `isAnonymous` (toggle) + `allowsMultipleAnswers` (toggle).
  - `isQuiz` (toggle) + `correctOptionId` (number, x-visible-if isQuiz).

- [x] **[TG-7] Método `setWebhook`**
  - `webhookPath` (text). POST `/setWebhook` com `url: ${SERVER_BASE_URL}${webhookPath}`.

- [x] **[TG-8] Rota `POST /webhooks/:identifier` no servidor**
  - Criar `webhooks.routes.ts`. Parsear update, identificar tipo (`message`, `callback_query`, `poll_answer`).
  - MVP: logar + retornar `{ ok: true }`. Integração com WorkflowEngine como trigger é fase futura.
  - Registrar em `server.ts`.

> **Commit:** `feat(telegram): new api_key plugin sendMessage + sendDocument + sendPhoto + sendPoll + setWebhook + webhook receiver`

---

## PARTE 3 — Core HTTP & Webhook

**Status:** Concluído

### 3.1 Nó HTTP Request (refinamento em `workflows/executor.ts`)

- [x] **[HTTP-1] Suporte a método `PATCH`**
  - Adicionar `"PATCH"` ao union type `method` em `workflow-types.ts` e no executor.

- [x] **[HTTP-2] Permitir body em `DELETE`**
  - Remover `DELETE` da condição que bloqueia body. Alguns endpoints REST exigem body em DELETE.

- [x] **[HTTP-3] `bodyType: "raw"` — sem auto Content-Type**
  - Adicionar `"raw"` ao `bodyType`. Não sobrescrever Content-Type, passar body como string pura.

- [x] **[HTTP-4] `responseType: "binary"` — resposta binária como Buffer**
  - Ler `response.arrayBuffer()`, converter para Buffer.
  - Retornar `{ content: Buffer, mimeType, size }` — compatível com `x-input-type: "file"` nos steps seguintes.

### 3.2 Webhook Trigger (refinamento)

- [x] **[WH-1] Parsing robusto de múltiplos Content-Types**
  - Rota `/webhooks/:identifier` deve parsear: `application/json`, `application/x-www-form-urlencoded`, `multipart/form-data`.
  - Payload estruturado: `{ body, headers, query, method, contentType }`.

- [x] **[WH-2] Headers de segurança preservados**
  - Garantir que `X-Signature`, `X-Hub-Signature-256`, `Authorization` são acessíveis no workflow trigger.
  - Essencial para validação de assinatura em webhooks futuros (GitHub, Stripe, etc).

> **Commit:** `feat(core): http PATCH + DELETE body + raw bodyType + binary response + webhook content-type parsing`

---

## Ordem de Implementação

```
1. GMAIL-1 → GMAIL-2 → GMAIL-3 → GMAIL-4               → commit
2. DRIVE-1 → DRIVE-2 → DRIVE-3 → DRIVE-4               → commit
3. TG-1 → TG-2 → TG-3 → TG-4 → TG-5 → TG-6            → commit
4. TG-7 → TG-8                                           → commit
5. SHEETS-5 (backend) → SHEETS-6 (frontend)             → commit
6. SHEETS-1 → SHEETS-2 → SHEETS-3 → SHEETS-4           → commit
7. HTTP-1 → HTTP-2 → HTTP-3 → HTTP-4                    → commit
8. WH-1 → WH-2                                           → commit
```

---

## Critérios de Aceite Arquitetural

- Nenhum código deste Marco toca em `executor.ts`, `manager.ts` ou `PluginEditor.vue`
- Todo plugin segue: `index.ts` + `manifest.json` + `methods.ts`
- Todos os manifests têm `x-label` em todos os campos visíveis
- Auth de API Key usa `ApiKeyProvider` — nao `OAuth2Provider`
- Campos condicionais usam `x-visible-if` (sem logica condicional no frontend)
- Campos com opcoes dinamicas usam `x-dynamic-options` (sem hardcode de valores)
- Git commit a cada feature completa e testada
