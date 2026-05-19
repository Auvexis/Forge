# Default Plugin Catalog Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** expandir o catalogo default do Sailor com plugins uteis para Discord, Slack, GitHub, Notion, Trello, Jira, Google Calendar, OpenRouter, OpenAI, e ampliar Google Sheets para operacoes reais de planilha.

**Architecture:** cada plugin vive isolado em `server/src/plugins/sailor/<plugin>/` com `index.ts`, `methods.ts`, `manifest.json` e testes locais. Plugins usam apenas `@auvexis/sailor-sdk`, APIs externas via `fetch` ou `googleapis`, e nunca importam `server/src/core`, engines, rotas ou outros plugins.

**Tech Stack:** TypeScript ESM, Node `fetch`, `@auvexis/sailor-sdk`, `googleapis`, `node:test`, manifests JSON Schema do Sailor.

---

## Regras

- TDD antes de implementar cada plugin.
- Cada task concluida deve ser marcada neste arquivo e commitada.
- Cada plugin novo deve ter no minimo 5 metodos uteis; alvo padrao: 8 metodos por plugin.
- Nao adicionar SDK pesado quando `fetch` resolver com clareza.
- Nao criar abstracao compartilhada entre plugins nesta fase; isolamento vale mais.
- Nao importar core, engines, rotas ou outros plugins dentro de qualquer plugin.
- Todo metodo precisa existir no `manifest.json` e no `methods.ts` com o mesmo nome.
- Todo parametro destrutivo precisa de confirmacao explicita quando a API permite deletar, arquivar ou sobrescrever dados.
- Testes unitarios devem validar export do plugin, auth, lista de metodos, helpers de request, validacao de parametros e mensagens de erro.
- Testes nao devem chamar APIs reais; usar `globalThis.fetch` mockado ou helpers puros.

## Estrutura de arquivos

- Create: `server/src/plugins/sailor/discord/index.ts`
- Create: `server/src/plugins/sailor/discord/methods.ts`
- Create: `server/src/plugins/sailor/discord/manifest.json`
- Create: `server/src/plugins/sailor/discord/methods.test.ts`
- Create: `server/src/plugins/sailor/slack/index.ts`
- Create: `server/src/plugins/sailor/slack/methods.ts`
- Create: `server/src/plugins/sailor/slack/manifest.json`
- Create: `server/src/plugins/sailor/slack/methods.test.ts`
- Create: `server/src/plugins/sailor/github/index.ts`
- Create: `server/src/plugins/sailor/github/methods.ts`
- Create: `server/src/plugins/sailor/github/manifest.json`
- Create: `server/src/plugins/sailor/github/methods.test.ts`
- Create: `server/src/plugins/sailor/notion/index.ts`
- Create: `server/src/plugins/sailor/notion/methods.ts`
- Create: `server/src/plugins/sailor/notion/manifest.json`
- Create: `server/src/plugins/sailor/notion/methods.test.ts`
- Create: `server/src/plugins/sailor/trello/index.ts`
- Create: `server/src/plugins/sailor/trello/methods.ts`
- Create: `server/src/plugins/sailor/trello/manifest.json`
- Create: `server/src/plugins/sailor/trello/methods.test.ts`
- Create: `server/src/plugins/sailor/jira/index.ts`
- Create: `server/src/plugins/sailor/jira/methods.ts`
- Create: `server/src/plugins/sailor/jira/manifest.json`
- Create: `server/src/plugins/sailor/jira/methods.test.ts`
- Create: `server/src/plugins/sailor/google-calendar/index.ts`
- Create: `server/src/plugins/sailor/google-calendar/methods.ts`
- Create: `server/src/plugins/sailor/google-calendar/manifest.json`
- Create: `server/src/plugins/sailor/google-calendar/methods.test.ts`
- Create: `server/src/plugins/sailor/openrouter/index.ts`
- Create: `server/src/plugins/sailor/openrouter/methods.ts`
- Create: `server/src/plugins/sailor/openrouter/manifest.json`
- Create: `server/src/plugins/sailor/openrouter/methods.test.ts`
- Create: `server/src/plugins/sailor/openai/index.ts`
- Create: `server/src/plugins/sailor/openai/methods.ts`
- Create: `server/src/plugins/sailor/openai/manifest.json`
- Create: `server/src/plugins/sailor/openai/methods.test.ts`
- Modify: `server/src/plugins/sailor/google-sheets/index.ts`
- Modify: `server/src/plugins/sailor/google-sheets/methods.ts`
- Modify: `server/src/plugins/sailor/google-sheets/manifest.json`
- Create: `server/src/plugins/sailor/google-sheets/methods.test.ts`
- Modify: `server/src/core/modules/plugins/loader.test.ts`

## Contratos por plugin

### Discord

Auth: `api_key`, credential `bot_token`.

Metodos:
- `sendMessage`: envia mensagem em canal.
- `editMessage`: edita mensagem existente.
- `deleteMessage`: deleta mensagem com `confirm: true`.
- `getMessage`: busca mensagem por canal e mensagem.
- `listChannelMessages`: lista mensagens recentes com `limit`.
- `createThread`: cria thread a partir de mensagem ou canal.
- `addReaction`: adiciona reacao em mensagem.
- `getGuildMember`: busca membro por guild/user id.

### Slack

Auth: `api_key`, credential `bot_token`.

Metodos:
- `postMessage`: envia mensagem em canal.
- `updateMessage`: edita mensagem por channel/ts.
- `deleteMessage`: deleta mensagem com `confirm: true`.
- `listChannels`: lista canais publicos/privados acessiveis.
- `getChannelHistory`: busca historico recente.
- `addReaction`: adiciona emoji reaction.
- `openConversation`: abre DM/MPIM para usuarios.
- `uploadFile`: envia arquivo por URL externa ou base64 quando suportado pelo workspace.

### GitHub

Auth: `api_key`, credential `token`.

Metodos:
- `getRepository`: busca metadata de `owner/repo`.
- `listIssues`: lista issues com state/labels.
- `createIssue`: cria issue.
- `updateIssue`: atualiza titulo/body/state/labels.
- `addIssueComment`: comenta em issue ou PR.
- `listPullRequests`: lista PRs.
- `createPullRequest`: abre PR.
- `listWorkflowRuns`: lista runs de GitHub Actions.

### Notion

Auth: `api_key`, credential `integration_token`.

Metodos:
- `search`: busca paginas/databases.
- `getPage`: recupera pagina.
- `createPage`: cria pagina em database ou parent page.
- `updatePageProperties`: atualiza propriedades.
- `queryDatabase`: consulta database com filter/sorts.
- `createDatabaseItem`: cria item em database.
- `appendBlockChildren`: adiciona blocks.
- `listBlockChildren`: lista children de block/page.

### Trello

Auth: `api_key`, credentials `api_key`, `token`.

Metodos:
- `listBoards`: lista boards.
- `listLists`: lista listas de um board.
- `listCards`: lista cards por board/list.
- `createCard`: cria card.
- `updateCard`: atualiza name/desc/due/labels.
- `moveCard`: move card para list/position.
- `addCommentToCard`: adiciona comentario.
- `createChecklistItem`: cria checklist se necessario e adiciona item.

### Jira

Auth: `api_key`, credentials `base_url`, `email`, `api_token`.

Metodos:
- `listProjects`: lista projetos acessiveis.
- `searchIssues`: busca issues via JQL.
- `getIssue`: busca issue por key/id.
- `createIssue`: cria issue.
- `updateIssue`: atualiza fields.
- `transitionIssue`: muda status.
- `addComment`: adiciona comentario.
- `assignIssue`: atribui issue.

### Google Calendar

Auth: `oauth2`, credentials `client_id`, `client_secret`.

Scopes:
- `https://www.googleapis.com/auth/calendar`

Metodos:
- `listCalendars`: lista calendarios.
- `listEvents`: lista eventos por calendario e intervalo.
- `getEvent`: busca evento.
- `createEvent`: cria evento.
- `updateEvent`: atualiza evento.
- `deleteEvent`: deleta evento com `confirm: true`.
- `freeBusy`: consulta disponibilidade.
- `quickAddEvent`: cria evento a partir de texto natural.

### OpenRouter

Auth: `api_key`, credential `api_key`.

Metodos:
- `listModels`: lista modelos disponiveis.
- `chatCompletion`: chama `/chat/completions`.
- `jsonChatCompletion`: chama chat com resposta JSON.
- `routePrompt`: usa preferencias de provider/model/fallback.
- `compareModels`: executa o mesmo prompt em 2 a 4 modelos.
- `summarizeText`: resumo util para workflows.
- `extractJson`: extrai JSON com schema textual.
- `moderatePromptLocalRules`: checa regras simples locais antes de enviar prompt.

### OpenAI

Auth: `api_key`, credential `api_key`.

Metodos:
- `listModels`: chama `GET /v1/models`.
- `createResponse`: chama `POST /v1/responses`.
- `chatCompletion`: compatibilidade com `POST /v1/chat/completions`.
- `structuredResponse`: Responses API com schema JSON.
- `summarizeText`: wrapper ergonomico sobre Responses.
- `extractJson`: wrapper ergonomico para extracao estruturada.
- `classifyText`: classifica texto em labels.
- `generateImage`: chama endpoint de imagens quando habilitado pela conta/modelo.

### Google Sheets expansion

Auth atual: `oauth2`.

Metodos finais:
- `listSpreadsheets`: existente.
- `listSheets`: novo, lista abas e metadata.
- `readRows`: existente, manter.
- `appendRow`: existente, manter.
- `appendRows`: novo, append em lote.
- `updateRange`: novo, atualiza range A1.
- `clearRange`: novo, limpa range com `confirm: true`.
- `createSheet`: novo, cria aba.
- `deleteSheet`: novo, remove aba com `confirm: true`.
- `findRows`: novo, busca linhas por coluna/valor usando header.
- `upsertRowByKey`: novo, atualiza por chave ou insere.

## Task 1 - Baseline e guardrails

**Files:**
- Modify: `feats-map/default-plugin-catalog-expansion.md`

- [x] **Step 1: Rodar typecheck baseline**

Run:
```bash
npx tsc --noEmit --pretty false
```
Working dir: `server`
Expected: PASS. Se falhar, anotar erro preexistente neste arquivo antes de implementar.

- [x] **Step 2: Rodar testes de loader baseline**

Run:
```bash
node --loader ts-node/esm --test src/core/modules/plugins/loader.test.ts
```
Working dir: `server`
Expected: PASS.

- [x] **Step 3: Definir padrao de teste para plugins**

Usar este padrao em cada `methods.test.ts`:
```ts
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import plugin from "./index.ts";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("<plugin> plugin", () => {
  it("exports default Sailor plugin contract", () => {
    assert.equal(plugin.id, "<plugin-id>");
    assert.equal(plugin.manifest.metadata.id, "<plugin-id>");
    assert.equal(typeof plugin.methods.<firstMethod>, "function");
  });
});
```

- [x] **Step 4: Commit**

```bash
git add feats-map/default-plugin-catalog-expansion.md
git commit -m "docs(plugins): plan default catalog expansion"
```

## Task 2 - Discord plugin

**Files:**
- Create: `server/src/plugins/sailor/discord/index.ts`
- Create: `server/src/plugins/sailor/discord/methods.ts`
- Create: `server/src/plugins/sailor/discord/manifest.json`
- Create: `server/src/plugins/sailor/discord/methods.test.ts`

- [x] **Step 1: Escrever teste falhando**

Validar `plugin.id === "discord"`, `auth.type === "api_key"`, credential `bot_token`, e os 8 metodos do contrato.

- [x] **Step 2: Implementar `index.ts`**

Exportar `SailorPlugin` com `auth.credentialSchema.bot_token` tipo password e `methods: createDiscordMethods()`.

- [x] **Step 3: Implementar helper de API**

Criar `discordApi(context, method, path, body?)` com base `https://discord.com/api/v10`, header `Authorization: Bot <token>`, parse JSON quando houver body, e erro `Discord API error on '<path>': ...`.

- [x] **Step 4: Implementar metodos**

Implementar os 8 metodos do contrato usando endpoints REST do Discord. `deleteMessage` exige `confirm === true`.

- [x] **Step 5: Criar manifest**

Declarar metadata, parametros, required e responseSchema para todos os metodos. Usar `textarea` para conteudo, `number` para limit, `toggle` para confirm.

- [x] **Step 6: Rodar teste**

Run:
```bash
node --loader ts-node/esm --test src/plugins/sailor/discord/methods.test.ts
```
Working dir: `server`
Expected: PASS.

- [x] **Step 7: Commit**

```bash
git add server/src/plugins/sailor/discord feats-map/default-plugin-catalog-expansion.md
git commit -m "feat(plugins): add discord plugin"
```

## Task 3 - Slack plugin

**Files:**
- Create: `server/src/plugins/sailor/slack/index.ts`
- Create: `server/src/plugins/sailor/slack/methods.ts`
- Create: `server/src/plugins/sailor/slack/manifest.json`
- Create: `server/src/plugins/sailor/slack/methods.test.ts`

- [ ] **Step 1: Escrever teste falhando**

Validar `plugin.id === "slack"`, `auth.type === "api_key"`, credential `bot_token`, e os 8 metodos do contrato.

- [ ] **Step 2: Implementar helper de API**

Criar `slackApi(context, endpoint, body?)` com base `https://slack.com/api`, bearer token, parse `{ ok, error }`, e erro claro quando `ok !== true`.

- [ ] **Step 3: Implementar metodos**

Mapear metodos para `chat.postMessage`, `chat.update`, `chat.delete`, `conversations.list`, `conversations.history`, `reactions.add`, `conversations.open`, `files.getUploadURLExternal` + `files.completeUploadExternal` quando implementar upload.

- [ ] **Step 4: Criar manifest**

Declarar `channel`, `ts`, `text`, `users`, `limit`, `emoji`, `filename`, `contentBase64`, `confirm`.

- [ ] **Step 5: Rodar teste**

Run:
```bash
node --loader ts-node/esm --test src/plugins/sailor/slack/methods.test.ts
```
Working dir: `server`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/plugins/sailor/slack feats-map/default-plugin-catalog-expansion.md
git commit -m "feat(plugins): add slack plugin"
```

## Task 4 - GitHub plugin

**Files:**
- Create: `server/src/plugins/sailor/github/index.ts`
- Create: `server/src/plugins/sailor/github/methods.ts`
- Create: `server/src/plugins/sailor/github/manifest.json`
- Create: `server/src/plugins/sailor/github/methods.test.ts`

- [ ] **Step 1: Escrever teste falhando**

Validar export, auth `api_key`, credential `token`, e 8 metodos.

- [ ] **Step 2: Implementar helper de API**

Criar `githubApi(context, method, path, body?)` com base `https://api.github.com`, bearer token, `Accept: application/vnd.github+json`, e erro com status/message.

- [ ] **Step 3: Implementar metodos**

Implementar repository, issues, comments, PRs e workflow runs. Normalizar `owner`, `repo`, `issueNumber`, `pullNumber`, `state`, `labels`.

- [ ] **Step 4: Criar manifest**

Declarar campos `owner`, `repo`, `title`, `body`, `state`, `labels`, `head`, `base`, `workflowId`, `limit`.

- [ ] **Step 5: Rodar teste**

Run:
```bash
node --loader ts-node/esm --test src/plugins/sailor/github/methods.test.ts
```
Working dir: `server`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/plugins/sailor/github feats-map/default-plugin-catalog-expansion.md
git commit -m "feat(plugins): add github plugin"
```

## Task 5 - Notion plugin

**Files:**
- Create: `server/src/plugins/sailor/notion/index.ts`
- Create: `server/src/plugins/sailor/notion/methods.ts`
- Create: `server/src/plugins/sailor/notion/manifest.json`
- Create: `server/src/plugins/sailor/notion/methods.test.ts`

- [ ] **Step 1: Escrever teste falhando**

Validar export, auth `api_key`, credential `integration_token`, e 8 metodos.

- [ ] **Step 2: Implementar helper de API**

Criar `notionApi(context, method, path, body?)` com base `https://api.notion.com/v1`, bearer token, `Notion-Version`, JSON parse e erro por `message`.

- [ ] **Step 3: Implementar metodos**

Implementar search, page, database query, page create/update e blocks. Aceitar JSON string ou object em `properties`, `filter`, `sorts`, `children`.

- [ ] **Step 4: Criar manifest**

Declarar `query`, `pageId`, `databaseId`, `parent`, `properties`, `filter`, `sorts`, `children`, `pageSize`.

- [ ] **Step 5: Rodar teste**

Run:
```bash
node --loader ts-node/esm --test src/plugins/sailor/notion/methods.test.ts
```
Working dir: `server`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/plugins/sailor/notion feats-map/default-plugin-catalog-expansion.md
git commit -m "feat(plugins): add notion plugin"
```

## Task 6 - Trello plugin

**Files:**
- Create: `server/src/plugins/sailor/trello/index.ts`
- Create: `server/src/plugins/sailor/trello/methods.ts`
- Create: `server/src/plugins/sailor/trello/manifest.json`
- Create: `server/src/plugins/sailor/trello/methods.test.ts`

- [ ] **Step 1: Escrever teste falhando**

Validar export, auth `api_key`, credentials `api_key` e `token`, e 8 metodos.

- [ ] **Step 2: Implementar helper de API**

Criar `trelloApi(context, method, path, query?, body?)` com base `https://api.trello.com/1`, query auth `key` e `token`, e erro com status/body.

- [ ] **Step 3: Implementar metodos**

Implementar boards, lists, cards, update/move, comentarios e checklist item. `updateCard` so envia campos definidos.

- [ ] **Step 4: Criar manifest**

Declarar `boardId`, `listId`, `cardId`, `name`, `desc`, `due`, `idLabels`, `pos`, `comment`, `checklistName`, `itemName`.

- [ ] **Step 5: Rodar teste**

Run:
```bash
node --loader ts-node/esm --test src/plugins/sailor/trello/methods.test.ts
```
Working dir: `server`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/plugins/sailor/trello feats-map/default-plugin-catalog-expansion.md
git commit -m "feat(plugins): add trello plugin"
```

## Task 7 - Jira plugin

**Files:**
- Create: `server/src/plugins/sailor/jira/index.ts`
- Create: `server/src/plugins/sailor/jira/methods.ts`
- Create: `server/src/plugins/sailor/jira/manifest.json`
- Create: `server/src/plugins/sailor/jira/methods.test.ts`

- [ ] **Step 1: Escrever teste falhando**

Validar export, auth `api_key`, credentials `base_url`, `email`, `api_token`, e 8 metodos.

- [ ] **Step 2: Implementar helper de API**

Criar `jiraApi(context, method, path, body?)` com base URL normalizada sem barra final, Basic auth `email:api_token`, e erro com status/body.

- [ ] **Step 3: Implementar metodos**

Implementar projects, JQL search, issue get/create/update, transition, comment e assign. Aceitar `fields` como JSON object/string.

- [ ] **Step 4: Criar manifest**

Declarar `jql`, `issueIdOrKey`, `projectKey`, `issueType`, `summary`, `description`, `fields`, `transitionId`, `accountId`, `comment`.

- [ ] **Step 5: Rodar teste**

Run:
```bash
node --loader ts-node/esm --test src/plugins/sailor/jira/methods.test.ts
```
Working dir: `server`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/plugins/sailor/jira feats-map/default-plugin-catalog-expansion.md
git commit -m "feat(plugins): add jira plugin"
```

## Task 8 - Google Calendar plugin

**Files:**
- Create: `server/src/plugins/sailor/google-calendar/index.ts`
- Create: `server/src/plugins/sailor/google-calendar/methods.ts`
- Create: `server/src/plugins/sailor/google-calendar/manifest.json`
- Create: `server/src/plugins/sailor/google-calendar/methods.test.ts`

- [ ] **Step 1: Escrever teste falhando**

Validar export, auth `oauth2`, scopes de Calendar, e 8 metodos.

- [ ] **Step 2: Implementar OAuth2**

Reusar padrao de `google-sheets/index.ts`: `getAuthUrl`, `exchangeCode`, `testConnection`, `refreshTokens`, scopes de Calendar, UI com botao Google.

- [ ] **Step 3: Implementar metodos**

Criar `getCalendarClient(context)` com `google.calendar({ version: "v3", auth })`. Implementar os 8 metodos com validacao de `calendarId`, `eventId`, `timeMin`, `timeMax`.

- [ ] **Step 4: Criar manifest**

Usar `x-dynamic-options` de `listCalendars` para selecionar `calendarId`. Declarar eventos com `summary`, `description`, `location`, `start`, `end`, `timeZone`, `attendees`, `confirm`.

- [ ] **Step 5: Rodar teste**

Run:
```bash
node --loader ts-node/esm --test src/plugins/sailor/google-calendar/methods.test.ts
```
Working dir: `server`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/plugins/sailor/google-calendar feats-map/default-plugin-catalog-expansion.md
git commit -m "feat(plugins): add google calendar plugin"
```

## Task 9 - OpenRouter plugin

**Files:**
- Create: `server/src/plugins/sailor/openrouter/index.ts`
- Create: `server/src/plugins/sailor/openrouter/methods.ts`
- Create: `server/src/plugins/sailor/openrouter/manifest.json`
- Create: `server/src/plugins/sailor/openrouter/methods.test.ts`

- [ ] **Step 1: Escrever teste falhando**

Validar export, auth `api_key`, credential `api_key`, e 8 metodos.

- [ ] **Step 2: Implementar helper de API**

Criar `openRouterApi(context, method, path, body?)` com base `https://openrouter.ai/api/v1`, bearer token, `Content-Type`, `HTTP-Referer` e `X-Title` opcionais por credential.

- [ ] **Step 3: Implementar metodos**

Implementar models, chat, JSON mode quando suportado por response format, wrappers de summarize/extract/classify e `compareModels` com `Promise.all`.

- [ ] **Step 4: Criar manifest**

Declarar `model`, `messages`, `prompt`, `system`, `temperature`, `maxTokens`, `responseSchema`, `models`, `providerPreferences`.

- [ ] **Step 5: Rodar teste**

Run:
```bash
node --loader ts-node/esm --test src/plugins/sailor/openrouter/methods.test.ts
```
Working dir: `server`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/plugins/sailor/openrouter feats-map/default-plugin-catalog-expansion.md
git commit -m "feat(plugins): add openrouter plugin"
```

## Task 10 - OpenAI plugin

**Files:**
- Create: `server/src/plugins/sailor/openai/index.ts`
- Create: `server/src/plugins/sailor/openai/methods.ts`
- Create: `server/src/plugins/sailor/openai/manifest.json`
- Create: `server/src/plugins/sailor/openai/methods.test.ts`

- [ ] **Step 1: Escrever teste falhando**

Validar export, auth `api_key`, credential `api_key`, e 8 metodos.

- [ ] **Step 2: Implementar helper de API**

Criar `openAiApi(context, method, path, body?)` com base `https://api.openai.com`, bearer token, parse JSON, e erro com `error.message`.

- [ ] **Step 3: Implementar metodos base**

Implementar `listModels`, `createResponse`, `chatCompletion`, `structuredResponse`. Preferir Responses API para features novas; manter Chat Completions por compatibilidade.

- [ ] **Step 4: Implementar wrappers ergonomicos**

Implementar `summarizeText`, `extractJson`, `classifyText`, `generateImage`. Wrappers devem montar payloads simples e previsiveis, sem esconder `model`, `temperature` e `maxOutputTokens`.

- [ ] **Step 5: Criar manifest**

Declarar `model`, `input`, `messages`, `instructions`, `schema`, `text`, `labels`, `prompt`, `size`, `quality`, `temperature`, `maxOutputTokens`.

- [ ] **Step 6: Rodar teste**

Run:
```bash
node --loader ts-node/esm --test src/plugins/sailor/openai/methods.test.ts
```
Working dir: `server`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add server/src/plugins/sailor/openai feats-map/default-plugin-catalog-expansion.md
git commit -m "feat(plugins): add openai plugin"
```

## Task 11 - Expandir Google Sheets

**Files:**
- Modify: `server/src/plugins/sailor/google-sheets/index.ts`
- Modify: `server/src/plugins/sailor/google-sheets/methods.ts`
- Modify: `server/src/plugins/sailor/google-sheets/manifest.json`
- Create: `server/src/plugins/sailor/google-sheets/methods.test.ts`

- [ ] **Step 1: Escrever teste falhando**

Validar que o plugin expõe 11 metodos finais: `listSpreadsheets`, `listSheets`, `readRows`, `appendRow`, `appendRows`, `updateRange`, `clearRange`, `createSheet`, `deleteSheet`, `findRows`, `upsertRowByKey`.

- [ ] **Step 2: Extrair helpers testaveis**

Exportar helpers puros:
```ts
export function parseJsonArray(value: string | any[], fieldName: string): any[];
export function rowsToObjects(rows: any[][]): Record<string, any>[];
export function findHeaderIndex(headers: any[], keyColumn: string): number;
```

- [ ] **Step 3: Implementar metodos de metadata**

`listSheets` usa `sheets.spreadsheets.get` com `fields: "sheets(properties(sheetId,title,index,gridProperties))"`.

- [ ] **Step 4: Implementar metodos de escrita**

`appendRows`, `updateRange`, `clearRange`, `createSheet`, `deleteSheet`. `clearRange` e `deleteSheet` exigem `confirm === true`.

- [ ] **Step 5: Implementar busca/upsert**

`findRows` le range com header, compara `keyColumn` com `keyValue`, retorna objetos com `_rowNumber`. `upsertRowByKey` usa `findRows`; se achar, atualiza a linha; se nao achar, append.

- [ ] **Step 6: Atualizar scopes**

Manter `spreadsheets` e `drive.readonly`. Confirmar se `createSheet/deleteSheet` funcionam com `spreadsheets`.

- [ ] **Step 7: Atualizar manifest**

Adicionar `sheetName`, `sheetId`, `range`, `values`, `rows`, `keyColumn`, `keyValue`, `row`, `confirm`, com `x-dynamic-options` para spreadsheets.

- [ ] **Step 8: Rodar teste**

Run:
```bash
node --loader ts-node/esm --test src/plugins/sailor/google-sheets/methods.test.ts
```
Working dir: `server`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add server/src/plugins/sailor/google-sheets feats-map/default-plugin-catalog-expansion.md
git commit -m "feat(google-sheets): expand spreadsheet methods"
```

## Task 12 - Loader e catalogo default

**Files:**
- Modify: `server/src/core/modules/plugins/loader.test.ts`
- Modify: `feats-map/default-plugin-catalog-expansion.md`

- [ ] **Step 1: Escrever teste de carregamento default**

Adicionar teste que carrega `server/src/plugins/sailor` e confirma os ids:
```ts
[
  "discord",
  "slack",
  "github",
  "notion",
  "trello",
  "jira",
  "google-calendar",
  "openrouter",
  "openai",
  "google-sheets"
]
```

- [ ] **Step 2: Rodar teste de loader**

Run:
```bash
node --loader ts-node/esm --test src/core/modules/plugins/loader.test.ts
```
Working dir: `server`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add server/src/core/modules/plugins/loader.test.ts feats-map/default-plugin-catalog-expansion.md
git commit -m "test(plugins): cover expanded default catalog"
```

## Task 13 - Verificacao final

**Files:**
- Modify: `feats-map/default-plugin-catalog-expansion.md`

- [ ] **Step 1: Rodar todos os testes dos plugins novos**

Run:
```bash
node --loader ts-node/esm --test src/plugins/sailor/discord/methods.test.ts
node --loader ts-node/esm --test src/plugins/sailor/slack/methods.test.ts
node --loader ts-node/esm --test src/plugins/sailor/github/methods.test.ts
node --loader ts-node/esm --test src/plugins/sailor/notion/methods.test.ts
node --loader ts-node/esm --test src/plugins/sailor/trello/methods.test.ts
node --loader ts-node/esm --test src/plugins/sailor/jira/methods.test.ts
node --loader ts-node/esm --test src/plugins/sailor/google-calendar/methods.test.ts
node --loader ts-node/esm --test src/plugins/sailor/openrouter/methods.test.ts
node --loader ts-node/esm --test src/plugins/sailor/openai/methods.test.ts
node --loader ts-node/esm --test src/plugins/sailor/google-sheets/methods.test.ts
```
Working dir: `server`
Expected: PASS.

- [ ] **Step 2: Rodar typecheck**

Run:
```bash
npx tsc --noEmit --pretty false
```
Working dir: `server`
Expected: PASS.

- [ ] **Step 3: Verificar isolamento de plugins**

Run:
```bash
rg "from [\"'].*server/src/core|from [\"'].*core/|from [\"'].*engines|from [\"'].*plugins/sailor" server/src/plugins/sailor
```
Expected: nenhum import proibido nos plugins novos.

- [ ] **Step 4: Verificar metodos nos manifests**

Run:
```bash
npx ts-node --esm -e "import fs from 'fs'; import path from 'path'; const dirs=['discord','slack','github','notion','trello','jira','google-calendar','openrouter','openai','google-sheets']; for (const dir of dirs) { const manifest=JSON.parse(fs.readFileSync(path.join('src/plugins/sailor', dir, 'manifest.json'),'utf8')); const count=Object.keys(manifest.methods ?? {}).length; if (count < 5) throw new Error(`${dir} has only ${count} methods`); console.log(`${dir}: ${count}`); }"
```
Working dir: `server`
Expected: cada plugin com 5+ metodos; alvo real 8+.

- [ ] **Step 5: Acceptance criteria**

Confirmar:
- Todos os plugins novos aparecem no catalogo default.
- Cada plugin tem `index.ts`, `methods.ts`, `manifest.json`, `methods.test.ts`.
- Cada plugin novo tem 8 metodos uteis.
- Google Sheets tem pelo menos 11 metodos finais.
- Nenhum plugin importa core/engine/outro plugin.
- Metodos destrutivos exigem `confirm: true`.
- Testes focados passam.
- Typecheck passa.

- [ ] **Step 6: Commit final**

```bash
git add feats-map/default-plugin-catalog-expansion.md
git commit -m "docs(plugins): complete default catalog expansion plan"
```

## Riscos

- Muitos plugins de uma vez aumentam blast radius. Se o prazo apertar, implementar por lotes: comunicacao, project management, AI, Google.
- Slack upload externo e APIs de arquivos mudam mais que chat simples. Se bloquear, entregar `postMessage`/history/reactions primeiro e manter upload como ultimo metodo.
- Jira Cloud usa formatos ADF para comentarios/descricoes em alguns endpoints. Planejar helper `toAdfText` local no plugin.
- OpenAI deve preferir Responses API para features novas; Chat Completions fica como compatibilidade.
- OpenRouter segue formato compativel com OpenAI Chat Completions, mas providers/modelos variam em suporte a JSON mode.
- Google Calendar e Google Sheets exigem OAuth correto por profile; validar fluxo de refresh token antes de teste manual.
