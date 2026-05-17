# Default Database Canary Plugins Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** criar dois plugins canarios padrao no Sailor, PostgreSQL e Supabase, dentro de `server/src/plugins/sailor/`, para validar o fluxo completo de integracoes externas com banco local, Docker, self-hosted e servicos remotos.

**Architecture:** plugins internos padrao, carregados pelo loader atual junto dos outros plugins em `server/src/plugins/sailor/*`. Cada plugin tem `index.ts`, `methods.ts` e `manifest.json`, usa apenas `@auvexis/sailor-sdk` e dependencias npm de banco, e nao importa core, engines, rotas ou outros plugins.

**Tech Stack:** TypeScript ESM, `@auvexis/sailor-sdk`, `pg`, `@supabase/supabase-js`, `node:test`, manifest runtime do Sailor.

---

## Regras

- TDD antes de implementar.
- Cada task concluida deve ser marcada neste arquivo e commitada.
- Criar plugins em `server/src/plugins/sailor/postgresql` e `server/src/plugins/sailor/supabase`.
- Plugins nao podem saber nada fora da pasta deles.
- Plugins nao podem importar `server/src/core`, engines, rotas ou outros plugins.
- Plugins devem ser genericos; conexao vem por credentials.
- PostgreSQL deve funcionar com local, Docker e externo por `connectionString`.
- Supabase deve funcionar com Supabase local CLI/self-hosted/remoto por `url` e `key`.

## Estrutura de arquivos

- Create: `server/src/plugins/sailor/postgresql/index.ts`
- Create: `server/src/plugins/sailor/postgresql/methods.ts`
- Create: `server/src/plugins/sailor/postgresql/manifest.json`
- Create: `server/src/plugins/sailor/postgresql/methods.test.ts`
- Create: `server/src/plugins/sailor/supabase/index.ts`
- Create: `server/src/plugins/sailor/supabase/methods.ts`
- Create: `server/src/plugins/sailor/supabase/manifest.json`
- Create: `server/src/plugins/sailor/supabase/methods.test.ts`
- Modify: `server/package.json`
- Modify: `server/package-lock.json`
- Modify: `docker-compose.yaml`

## PostgreSQL Methods

- `testConnection`: testa conexao e retorna database, user, schema, version e serverTime.
- `listSchemas`: lista schemas nao-sistema.
- `listTables`: lista tabelas/views por schema.
- `describeTable`: retorna colunas, tipos, nullable, default e primary key.
- `selectRows`: SELECT seguro por schema/table/columns/where/order/limit/offset.
- `insertRow`: insere uma linha JSON com valores parametrizados.
- `updateRows`: atualiza linhas por filtro simples.
- `deleteRows`: remove linhas com `confirm: true`.
- `executeQuery`: SQL livre protegido por credential `allowUnsafeSql`.
- `transaction`: lista de statements em transacao protegida por `allowUnsafeSql`.

## Supabase Methods

- `testConnection`: valida URL/key.
- `listTables`: usa RPC `sailor_list_tables`.
- `selectRows`: seleciona linhas com filtros simples.
- `insertRow`: insere registro.
- `updateRows`: atualiza registros.
- `deleteRows`: deleta registros com `confirm: true`.
- `upsertRow`: upsert com `onConflict`.
- `callRpc`: chama RPC com payload JSON.
- `uploadObject`: upload para Storage.
- `downloadObject`: download de Storage.
- `deleteObject`: remove objeto.
- `createSignedUrl`: cria signed URL.

## Task 1 - Dependencias do server

**Files:**
- Modify: `server/package.json`
- Modify: `server/package-lock.json`

- [x] **Step 1: Instalar dependencias**

Run:
```bash
npm install pg @supabase/supabase-js
```
Working dir: `server`
Expected: `package.json` e `package-lock.json` atualizados.

- [x] **Step 2: Instalar types do PostgreSQL se necessario**

Run:
```bash
npm install -D @types/pg
```
Working dir: `server`
Expected: `@types/pg` em `devDependencies`.

- [x] **Step 3: Rodar typecheck baseline**

Run:
```bash
npx tsc --noEmit --pretty false
```
Working dir: `server`
Expected: exit 0 ou somente erros preexistentes anotados antes de tocar feature.

- [x] **Step 4: Commit**

```bash
git add server/package.json server/package-lock.json feats-map/default-database-canary-plugins.md
git commit -m "chore(server): add database plugin dependencies"
```

## Task 2 - Criar esqueleto PostgreSQL

**Files:**
- Create: `server/src/plugins/sailor/postgresql/index.ts`
- Create: `server/src/plugins/sailor/postgresql/methods.ts`
- Create: `server/src/plugins/sailor/postgresql/manifest.json`
- Create: `server/src/plugins/sailor/postgresql/methods.test.ts`

- [x] **Step 1: Escrever teste falhando**

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import plugin from "./index.ts";

describe("postgresql plugin", () => {
  it("exports default internal Sailor plugin", () => {
    assert.equal(plugin.id, "sailor-postgresql");
    assert.equal(plugin.auth.type, "apiKey");
    assert.equal(plugin.manifest.metadata.id, "sailor-postgresql");
    assert.equal(typeof plugin.methods.testConnection, "function");
  });
});
```

- [x] **Step 2: Rodar teste e confirmar falha**

Run:
```bash
node --loader ts-node/esm --test src/plugins/sailor/postgresql/methods.test.ts
```
Working dir: `server`
Expected: FAIL por arquivos ausentes.

- [x] **Step 3: Criar `index.ts`**

```ts
import type { SailorPlugin, PluginManifest } from "@auvexis/sailor-sdk";
import manifest from "./manifest.json" with { type: "json" };
import { createPostgresqlMethods } from "./methods.ts";

const PostgresqlPlugin: SailorPlugin = {
  id: "sailor-postgresql",
  manifest: manifest as PluginManifest,
  auth: {
    type: "apiKey",
    credentialSchema: {
      connectionString: {
        type: "string",
        inputType: "password",
        label: "Connection String",
        required: true,
        description: "postgres://user:password@host:5432/database?sslmode=require",
      },
      sslMode: {
        type: "string",
        inputType: "text",
        label: "SSL Mode",
        required: false,
        description: "disable, require, no-verify",
      },
      allowUnsafeSql: {
        type: "string",
        inputType: "password",
        label: "Allow Unsafe SQL",
        required: false,
        description: "Use I_UNDERSTAND_SQL_RISK to enable raw SQL methods.",
      },
    },
  },
  methods: createPostgresqlMethods(),
};

export default PostgresqlPlugin;
```

- [x] **Step 4: Criar `methods.ts` minimo**

```ts
import type { PluginContext } from "@auvexis/sailor-sdk";

export function createPostgresqlMethods() {
  return {
    async testConnection(_params: Record<string, never>, _context?: PluginContext) {
      return { ok: true };
    },
  };
}
```

- [x] **Step 5: Criar `manifest.json` minimo**

```json
{
  "metadata": {
    "id": "sailor-postgresql",
    "name": "PostgreSQL",
    "description": "Connect to PostgreSQL databases running locally, in Docker, or on hosted providers.",
    "icon": "database",
    "category": "Database",
    "author": "Sailor",
    "version": "1.0.0",
    "repository": "https://github.com/Auvexis/sailor"
  },
  "methods": {
    "testConnection": {
      "metadata": {
        "label": "Test Connection",
        "description": "Connects to PostgreSQL and returns basic server information."
      },
      "parameters": {
        "type": "object",
        "properties": {}
      },
      "responseSchema": {
        "type": "object",
        "properties": {
          "ok": { "type": "boolean" }
        }
      }
    }
  }
}
```

- [x] **Step 6: Rodar teste**

Run:
```bash
node --loader ts-node/esm --test src/plugins/sailor/postgresql/methods.test.ts
```
Working dir: `server`
Expected: PASS.

- [x] **Step 7: Commit**

```bash
git add server/src/plugins/sailor/postgresql feats-map/default-database-canary-plugins.md
git commit -m "feat(plugins): scaffold postgresql plugin"
```

## Task 3 - PostgreSQL conexao e introspeccao

**Files:**
- Modify: `server/src/plugins/sailor/postgresql/methods.ts`
- Modify: `server/src/plugins/sailor/postgresql/manifest.json`
- Modify: `server/src/plugins/sailor/postgresql/methods.test.ts`

- [x] **Step 1: Escrever testes falhando para helpers**

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createPostgresqlMethods, normalizeLimit, quoteIdentifier } from "./methods.ts";

describe("postgresql helpers", () => {
  it("quotes identifiers safely", () => {
    assert.equal(quoteIdentifier("users"), "\"users\"");
    assert.equal(quoteIdentifier("order_items"), "\"order_items\"");
    assert.throws(() => quoteIdentifier("bad\"name"), /Invalid SQL identifier/);
  });

  it("normalizes limits", () => {
    assert.equal(normalizeLimit(undefined), 100);
    assert.equal(normalizeLimit(5), 5);
    assert.equal(normalizeLimit(10000), 1000);
  });

  it("exposes introspection methods", () => {
    const methods = createPostgresqlMethods();
    assert.equal(typeof methods.listSchemas, "function");
    assert.equal(typeof methods.listTables, "function");
    assert.equal(typeof methods.describeTable, "function");
  });
});
```

- [x] **Step 2: Implementar helpers de conexao**

```ts
import pg from "pg";
import type { PluginContext } from "@auvexis/sailor-sdk";

const { Pool } = pg;
const MAX_LIMIT = 1000;

export function quoteIdentifier(identifier: string): string {
  if (!identifier?.trim() || identifier.includes("\"") || identifier.includes("\0")) {
    throw new Error("Invalid SQL identifier.");
  }
  return `"${identifier.trim()}"`;
}

export function normalizeLimit(value?: number, fallback = 100): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.trunc(parsed), MAX_LIMIT);
}

function sslFromMode(mode?: string) {
  if (mode === "require") return { rejectUnauthorized: true };
  if (mode === "no-verify") return { rejectUnauthorized: false };
  return false;
}

function createPool(context?: PluginContext) {
  const connectionString = context?.credentials?.connectionString;
  if (!connectionString) throw new Error("PostgreSQL connectionString credential is required.");
  return new Pool({
    connectionString,
    ssl: sslFromMode(context.credentials.sslMode),
    max: 3,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 8000,
  });
}
```

- [x] **Step 3: Implementar metodos**

Implementar `testConnection`, `listSchemas`, `listTables`, `describeTable` usando `information_schema` e parametros `$1`, `$2`.

- [x] **Step 4: Atualizar manifest**

Adicionar `listSchemas`, `listTables`, `describeTable` com `schema` default `public`, `table` required e `responseSchema.type = "array"`.

- [x] **Step 5: Rodar testes**

Run:
```bash
node --loader ts-node/esm --test src/plugins/sailor/postgresql/methods.test.ts
```
Working dir: `server`
Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add server/src/plugins/sailor/postgresql feats-map/default-database-canary-plugins.md
git commit -m "feat(postgresql): add connection introspection methods"
```

## Task 4 - PostgreSQL CRUD e SQL protegido

**Files:**
- Modify: `server/src/plugins/sailor/postgresql/methods.ts`
- Modify: `server/src/plugins/sailor/postgresql/manifest.json`
- Modify: `server/src/plugins/sailor/postgresql/methods.test.ts`

- [x] **Step 1: Escrever testes falhando para builders**

```ts
import assert from "node:assert/strict";
import { buildOrderClause, buildWhereClause, assertUnsafeSqlAllowed } from "./methods.ts";

assert.deepEqual(buildWhereClause({ id: 1, status: "open" }), {
  sql: " where \"id\" = $1 and \"status\" = $2",
  values: [1, "open"]
});
assert.equal(buildOrderClause({ column: "created_at", direction: "desc" }), " order by \"created_at\" desc");
assert.throws(() => assertUnsafeSqlAllowed({ credentials: {} } as any), /Unsafe SQL is disabled/);
```

- [x] **Step 2: Implementar builders**

```ts
export function buildWhereClause(where: Record<string, unknown> = {}, startIndex = 1) {
  const entries = Object.entries(where);
  if (entries.length === 0) return { sql: "", values: [] as unknown[] };
  const parts = entries.map(([key], index) => `${quoteIdentifier(key)} = $${startIndex + index}`);
  return { sql: ` where ${parts.join(" and ")}`, values: entries.map(([, value]) => value) };
}

export function buildOrderClause(orderBy?: { column?: string; direction?: string }) {
  if (!orderBy?.column) return "";
  const direction = String(orderBy.direction || "asc").toLowerCase();
  if (!["asc", "desc"].includes(direction)) throw new Error("Invalid order direction.");
  return ` order by ${quoteIdentifier(orderBy.column)} ${direction}`;
}

export function assertUnsafeSqlAllowed(context?: PluginContext) {
  if (context?.credentials?.allowUnsafeSql !== "I_UNDERSTAND_SQL_RISK") {
    throw new Error("Unsafe SQL is disabled. Set allowUnsafeSql credential to I_UNDERSTAND_SQL_RISK.");
  }
}
```

- [x] **Step 3: Implementar metodos**

Implementar `selectRows`, `insertRow`, `updateRows`, `deleteRows`, `executeQuery`, `transaction`. Usar identifiers escapados, valores parametrizados, `returning *`, `deleteRows.confirm === true`, e gate `assertUnsafeSqlAllowed` para SQL livre.

- [x] **Step 4: Atualizar manifest**

Declarar parametros de CRUD:
- `schema`: string default `public`
- `table`: string required
- `where`: object
- `row`: object
- `patch`: object
- `columns`: array
- `limit`: number default 100
- `offset`: number default 0
- `orderBy`: object
- `confirm`: boolean
- `sql`: string textarea
- `values`: array
- `statements`: array

- [x] **Step 5: Rodar testes**

Run:
```bash
node --loader ts-node/esm --test src/plugins/sailor/postgresql/methods.test.ts
```
Working dir: `server`
Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add server/src/plugins/sailor/postgresql feats-map/default-database-canary-plugins.md
git commit -m "feat(postgresql): add safe crud and guarded sql"
```

## Task 5 - Criar esqueleto Supabase

**Files:**
- Create: `server/src/plugins/sailor/supabase/index.ts`
- Create: `server/src/plugins/sailor/supabase/methods.ts`
- Create: `server/src/plugins/sailor/supabase/manifest.json`
- Create: `server/src/plugins/sailor/supabase/methods.test.ts`

- [x] **Step 1: Escrever teste falhando**

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import plugin from "./index.ts";

describe("supabase plugin", () => {
  it("exports default internal Sailor plugin", () => {
    assert.equal(plugin.id, "sailor-supabase");
    assert.equal(plugin.auth.type, "apiKey");
    assert.equal(plugin.manifest.metadata.id, "sailor-supabase");
    assert.equal(typeof plugin.methods.testConnection, "function");
  });
});
```

- [x] **Step 2: Criar `index.ts`**

```ts
import type { SailorPlugin, PluginManifest } from "@auvexis/sailor-sdk";
import manifest from "./manifest.json" with { type: "json" };
import { createSupabaseMethods } from "./methods.ts";

const SupabasePlugin: SailorPlugin = {
  id: "sailor-supabase",
  manifest: manifest as PluginManifest,
  auth: {
    type: "apiKey",
    credentialSchema: {
      url: {
        type: "string",
        inputType: "text",
        label: "Supabase URL",
        required: true,
        description: "https://project.supabase.co or http://127.0.0.1:54321",
      },
      key: {
        type: "string",
        inputType: "password",
        label: "Supabase Key",
        required: true,
        description: "Anon key, service role key, or compatible self-hosted key.",
      },
      schema: {
        type: "string",
        inputType: "text",
        label: "Default Schema",
        required: false,
        description: "Usually public.",
      },
    },
  },
  methods: createSupabaseMethods(),
};

export default SupabasePlugin;
```

- [x] **Step 3: Criar `methods.ts` minimo e `manifest.json` minimo**

`methods.ts` exporta `createSupabaseMethods()` com `testConnection`. `manifest.json` declara metadata `sailor-supabase` e metodo `testConnection`.

- [x] **Step 4: Rodar teste**

Run:
```bash
node --loader ts-node/esm --test src/plugins/sailor/supabase/methods.test.ts
```
Working dir: `server`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add server/src/plugins/sailor/supabase feats-map/default-database-canary-plugins.md
git commit -m "feat(plugins): scaffold supabase plugin"
```

## Task 6 - Supabase Database e RPC

**Files:**
- Modify: `server/src/plugins/sailor/supabase/methods.ts`
- Modify: `server/src/plugins/sailor/supabase/manifest.json`
- Modify: `server/src/plugins/sailor/supabase/methods.test.ts`

- [x] **Step 1: Escrever testes falhando para filtros**

```ts
import assert from "node:assert/strict";
import { applyFiltersToQuery } from "./methods.ts";

const calls: unknown[] = [];
const query: any = {
  eq: (column: string, value: unknown) => { calls.push(["eq", column, value]); return query; },
  gt: (column: string, value: unknown) => { calls.push(["gt", column, value]); return query; },
  ilike: (column: string, value: unknown) => { calls.push(["ilike", column, value]); return query; },
};

applyFiltersToQuery(query, [
  { column: "status", operator: "eq", value: "open" },
  { column: "amount", operator: "gt", value: 10 },
  { column: "email", operator: "ilike", value: "%@example.com" },
]);

assert.deepEqual(calls, [
  ["eq", "status", "open"],
  ["gt", "amount", 10],
  ["ilike", "email", "%@example.com"],
]);
```

- [x] **Step 2: Implementar client**

Criar `createClientFromContext(context)` usando `createClient(url, key, { db: { schema } })` e erro claro quando faltar URL/key.

- [x] **Step 3: Implementar filtros**

Permitir operadores `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `ilike`, `is`, `in`; qualquer outro operador lança erro.

- [x] **Step 4: Implementar metodos DB**

Implementar `testConnection`, `listTables`, `selectRows`, `insertRow`, `updateRows`, `deleteRows`, `upsertRow`, `callRpc`. `deleteRows` exige `confirm === true`.

- [x] **Step 5: SQL da RPC para README/erro**

Usar esta mensagem quando `listTables` falhar por RPC ausente:

```sql
create or replace function sailor_list_tables(target_schema text default 'public')
returns table(schema text, name text, type text)
language sql
security definer
as $$
  select table_schema, table_name, table_type
  from information_schema.tables
  where table_schema = target_schema
  order by table_name;
$$;
```

- [x] **Step 6: Atualizar manifest**

Adicionar schemas de parametros para DB/RPC com `table`, `filters`, `row`, `patch`, `payload`, `limit`, `offset`, `orderBy`, `confirm`.

- [x] **Step 7: Rodar testes**

Run:
```bash
node --loader ts-node/esm --test src/plugins/sailor/supabase/methods.test.ts
```
Working dir: `server`
Expected: PASS.

- [x] **Step 8: Commit**

```bash
git add server/src/plugins/sailor/supabase feats-map/default-database-canary-plugins.md
git commit -m "feat(supabase): add database and rpc methods"
```

## Task 7 - Supabase Storage

**Files:**
- Modify: `server/src/plugins/sailor/supabase/methods.ts`
- Modify: `server/src/plugins/sailor/supabase/manifest.json`
- Modify: `server/src/plugins/sailor/supabase/methods.test.ts`

- [x] **Step 1: Escrever teste falhando para payload**

```ts
import assert from "node:assert/strict";
import { contentToBuffer } from "./methods.ts";

assert.equal(contentToBuffer({ content: "hello", encoding: "text" }).toString("utf8"), "hello");
assert.equal(contentToBuffer({ content: Buffer.from("hello").toString("base64"), encoding: "base64" }).toString("utf8"), "hello");
assert.throws(() => contentToBuffer({ content: "x", encoding: "zip" }), /Unsupported storage encoding/);
```

- [x] **Step 2: Implementar helper**

```ts
export function contentToBuffer(params: { content: string; encoding?: string }): Buffer {
  if (params.encoding === "base64") return Buffer.from(params.content, "base64");
  if (!params.encoding || params.encoding === "text") return Buffer.from(params.content, "utf8");
  throw new Error("Unsupported storage encoding.");
}
```

- [x] **Step 3: Implementar metodos Storage**

Implementar `uploadObject`, `downloadObject`, `deleteObject`, `createSignedUrl`. `downloadObject` retorna `{ content, encoding, contentType, sizeBytes }`.

- [x] **Step 4: Atualizar manifest**

Adicionar `bucket`, `path`, `content`, `encoding`, `contentType`, `upsert`, `expiresIn`.

- [x] **Step 5: Rodar testes**

Run:
```bash
node --loader ts-node/esm --test src/plugins/sailor/supabase/methods.test.ts
```
Working dir: `server`
Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add server/src/plugins/sailor/supabase feats-map/default-database-canary-plugins.md
git commit -m "feat(supabase): add storage methods"
```

## Task 8 - Garantir carregamento padrao no Sailor

**Files:**
- Modify: `server/src/core/modules/plugins/loader.test.ts`

- [x] **Step 1: Escrever teste falhando**

Adicionar teste no loader que aponta `internalPluginsDir` para `server/src/plugins/sailor` e confirma que `sailor-postgresql` e `sailor-supabase` aparecem entre plugins registrados.

- [x] **Step 2: Rodar teste**

Run:
```bash
node --loader ts-node/esm --test src/core/modules/plugins/loader.test.ts
```
Working dir: `server`
Expected: PASS.

- [x] **Step 3: Rodar typecheck**

Run:
```bash
npx tsc --noEmit --pretty false
```
Working dir: `server`
Expected: PASS.

- [x] **Step 4: Commit**

```bash
git add server/src/core/modules/plugins/loader.test.ts feats-map/default-database-canary-plugins.md
git commit -m "test(plugins): ensure database plugins load by default"
```

## Task 9 - Ambiente local PostgreSQL opcional

**Files:**
- Modify: `docker-compose.yaml`

- [ ] **Step 1: Adicionar servico com profile canary**

```yaml
  sailor-postgres-canary:
    image: postgres:16-alpine
    container_name: sailor-postgres-canary
    ports:
      - "25432:5432"
    environment:
      - POSTGRES_DB=sailor_canary
      - POSTGRES_USER=sailor
      - POSTGRES_PASSWORD=sailor
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sailor -d sailor_canary"]
      interval: 10s
      timeout: 5s
      retries: 5
    profiles:
      - canary
```

- [ ] **Step 2: Rodar profile**

Run:
```bash
docker compose --profile canary up -d sailor-postgres-canary
```
Expected: container saudavel.

- [ ] **Step 3: Testar connection string no plugin**

Credential:
```text
postgres://sailor:sailor@localhost:25432/sailor_canary
```
Expected: `testConnection` retorna `ok: true` e `database: sailor_canary`.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yaml feats-map/default-database-canary-plugins.md
git commit -m "chore(postgresql): add local canary database profile"
```

## Task 10 - Verificacao final

**Files:**
- Modify: `feats-map/default-database-canary-plugins.md`

- [ ] **Step 1: Rodar testes dos plugins**

Run:
```bash
node --loader ts-node/esm --test src/plugins/sailor/postgresql/methods.test.ts
node --loader ts-node/esm --test src/plugins/sailor/supabase/methods.test.ts
```
Working dir: `server`
Expected: PASS.

- [ ] **Step 2: Rodar testes de loader**

Run:
```bash
node --loader ts-node/esm --test src/core/modules/plugins/loader.test.ts
```
Working dir: `server`
Expected: PASS.

- [ ] **Step 3: Rodar build/typecheck**

Run:
```bash
npx tsc --noEmit --pretty false
```
Working dir: `server`
Expected: PASS.

- [ ] **Step 4: Confirmar acceptance criteria**

Confirmar:
- PostgreSQL funciona com local, Docker e externo.
- Supabase funciona com local CLI/self-hosted/remoto.
- Os dois aparecem por padrao no registry interno.
- Os manifests nao usam UI legada.
- Os plugins nao importam core/engine/outros plugins.

- [ ] **Step 5: Commit final**

```bash
git add feats-map/default-database-canary-plugins.md
git commit -m "docs(plugins): complete database canary plan"
```

## Acceptance Criteria

- `server/src/plugins/sailor/postgresql` existe e carrega por padrao.
- `server/src/plugins/sailor/supabase` existe e carrega por padrao.
- PostgreSQL cobre conexao, introspeccao, CRUD seguro e SQL avancado protegido.
- Supabase cobre database, RPC e Storage.
- Ambos aceitam ambientes locais, Docker/self-hosted e externos.
- Nenhum plugin importa `server/src/core`, engines ou outro plugin.
- Manifests sao suficientes para o frontend montar formularios.
- Testes unitarios dos plugins passam.
- Teste do loader confirma plugins padrao.
- Typecheck do server passa.

## Riscos

- `executeQuery` e `transaction` podem apagar dados. Ficam bloqueados por `allowUnsafeSql = I_UNDERSTAND_SQL_RISK`.
- Supabase `listTables` precisa de RPC porque o client JS nao lista metadata diretamente.
- `service_role` no Supabase e poderoso. Preferir anon key quando RLS permitir.
- O plugin PostgreSQL deve escapar identifiers e parametrizar valores para evitar SQL injection em metodos CRUD.
