import type { PluginContext } from "@auvexis/sailor-sdk";
import type { PoolClient } from "pg";
import pg from "pg";

const { Pool } = pg;
const MAX_LIMIT = 1000;

type Queryable = {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    values?: unknown[],
  ): Promise<{ rowCount: number | null; rows: T[] }>;
};

type TableParams = {
  schema?: string;
};

type DescribeTableParams = TableParams & {
  table: string;
};

type OrderBy = {
  column?: string;
  direction?: string;
};

type SelectRowsParams = DescribeTableParams & {
  columns?: string[];
  where?: Record<string, unknown>;
  orderBy?: OrderBy;
  limit?: number;
  offset?: number;
};

type InsertRowParams = DescribeTableParams & {
  row: Record<string, unknown>;
};

type UpdateRowsParams = DescribeTableParams & {
  patch: Record<string, unknown>;
  where?: Record<string, unknown>;
};

type DeleteRowsParams = DescribeTableParams & {
  where?: Record<string, unknown>;
  confirm?: boolean;
};

type ExecuteQueryParams = {
  sql: string;
  values?: unknown[];
};

type TransactionParams = {
  statements: ExecuteQueryParams[];
};

type AgentMemorySearchParams = {
  profileId: string;
  namespace: string;
  limit?: number;
};

type AgentMemoryPutParams = AgentMemorySearchParams & {
  id: string;
  key: string;
  value: unknown;
  source: string;
};

type PoolLike = InstanceType<typeof Pool>;

export function quoteIdentifier(identifier: string): string {
  const normalized = identifier?.trim();
  if (!normalized || normalized.includes("\"") || normalized.includes("\0")) {
    throw new Error("Invalid SQL identifier.");
  }

  return `"${normalized}"`;
}

export function normalizeLimit(value?: number, fallback = 100): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.trunc(parsed), MAX_LIMIT);
}

function normalizeOffset(value?: number): number {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.trunc(parsed);
}

export function buildWhereClause(where: Record<string, unknown> = {}, startIndex = 1) {
  const entries = Object.entries(where);
  if (entries.length === 0) return { sql: "", values: [] as unknown[] };

  const parts = entries.map(([key], index) => `${quoteIdentifier(key)} = $${startIndex + index}`);
  return {
    sql: ` where ${parts.join(" and ")}`,
    values: entries.map(([, value]) => value),
  };
}

export function buildOrderClause(orderBy?: OrderBy) {
  if (!orderBy?.column) return "";

  const direction = String(orderBy.direction || "asc").toLowerCase();
  if (!["asc", "desc"].includes(direction)) {
    throw new Error("Invalid order direction.");
  }

  return ` order by ${quoteIdentifier(orderBy.column)} ${direction}`;
}

export function assertUnsafeSqlAllowed(context?: PluginContext) {
  if (context?.credentials?.allowUnsafeSql !== "I_UNDERSTAND_SQL_RISK") {
    throw new Error("Unsafe SQL is disabled. Set allowUnsafeSql credential to I_UNDERSTAND_SQL_RISK.");
  }
}

function sslFromMode(mode?: string) {
  if (mode === "require") return { rejectUnauthorized: true };
  if (mode === "no-verify") return { rejectUnauthorized: false };
  return false;
}

function createPool(context?: PluginContext): PoolLike {
  const connectionString = context?.credentials?.connectionString;
  if (!connectionString) {
    throw new Error("PostgreSQL connectionString credential is required.");
  }

  return new Pool({
    connectionString,
    ssl: sslFromMode(context.credentials.sslMode),
    max: 3,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 8000,
  });
}

async function withPool<T>(context: PluginContext | undefined, operation: (db: Queryable) => Promise<T>): Promise<T> {
  const pool = createPool(context);
  try {
    return await operation(pool);
  } finally {
    await pool.end();
  }
}

function qualifiedTable(schema: string | undefined, table: string): string {
  return `${quoteIdentifier(schema ?? "public")}.${quoteIdentifier(table)}`;
}

function selectedColumns(columns?: string[]): string {
  if (!columns || columns.length === 0) return "*";
  return columns.map(quoteIdentifier).join(", ");
}

function assertObjectHasFields(value: Record<string, unknown>, label: string) {
  if (!value || Object.keys(value).length === 0) {
    throw new Error(`${label} must include at least one field.`);
  }
}

async function ensureAgentMemoryTable(db: Queryable) {
  await db.query(`
    create table if not exists sailor_agent_memories (
      id text primary key,
      profile_id text not null,
      namespace text not null,
      memory_key text not null,
      value_json jsonb not null,
      source text not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique(profile_id, namespace, memory_key)
    )
  `);
  await db.query(`
    create index if not exists sailor_agent_memories_lookup_idx
      on sailor_agent_memories (profile_id, namespace, updated_at desc)
  `);
}

export async function searchAgentMemoryWithDb(db: Queryable, params: AgentMemorySearchParams) {
  await ensureAgentMemoryTable(db);
  const limit = normalizeLimit(params.limit, 50);
  const result = await db.query<{ key: string; value: unknown }>(
    `
      select memory_key as key, value_json as value
      from sailor_agent_memories
      where profile_id = $1 and namespace = $2
      order by updated_at desc
      limit $3
    `,
    [params.profileId, params.namespace, limit],
  );

  return result.rows;
}

export async function putAgentMemoryWithDb(db: Queryable, params: AgentMemoryPutParams) {
  await ensureAgentMemoryTable(db);
  await db.query(
    `
      insert into sailor_agent_memories
        (id, profile_id, namespace, memory_key, value_json, source)
      values ($1, $2, $3, $4, $5::jsonb, $6)
      on conflict(profile_id, namespace, memory_key) do update set
        value_json = excluded.value_json,
        source = excluded.source,
        updated_at = now()
    `,
    [
      params.id,
      params.profileId,
      params.namespace,
      params.key,
      JSON.stringify(params.value),
      params.source,
    ],
  );

  return { ok: true };
}

async function runTransaction(client: PoolClient, statements: ExecuteQueryParams[]) {
  const results: Array<{ rowCount: number | null; rows: Record<string, unknown>[] }> = [];

  await client.query("begin");
  try {
    for (const statement of statements) {
      const result = await client.query(statement.sql, statement.values ?? []);
      results.push({ rowCount: result.rowCount, rows: result.rows });
    }
    await client.query("commit");
    return results;
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

export function createPostgresqlMethods() {
  return {
    async testConnection(_params: Record<string, never>, context?: PluginContext) {
      return withPool(context, async (db) => {
        const result = await db.query<{
          database: string;
          user: string;
          schema: string;
          version: string;
          serverTime: Date;
        }>(
          `
            select
              current_database() as "database",
              current_user as "user",
              current_schema() as "schema",
              version() as "version",
              now() as "serverTime"
          `,
        );

        return { ok: true, ...result.rows[0] };
      });
    },

    async listSchemas(_params: Record<string, never>, context?: PluginContext) {
      return withPool(context, async (db) => {
        const result = await db.query<{ schema: string }>(
          `
            select schema_name as "schema"
            from information_schema.schemata
            where schema_name <> 'information_schema'
              and schema_name not like 'pg_%'
            order by schema_name
          `,
        );

        return result.rows;
      });
    },

    async listTables(params: TableParams, context?: PluginContext) {
      return withPool(context, async (db) => {
        const schema = params.schema ?? "public";
        const result = await db.query<{ schema: string; name: string; type: string }>(
          `
            select
              table_schema as "schema",
              table_name as "name",
              table_type as "type"
            from information_schema.tables
            where table_schema = $1
            order by table_name
          `,
          [schema],
        );

        return result.rows;
      });
    },

    async describeTable(params: DescribeTableParams, context?: PluginContext) {
      return withPool(context, async (db) => {
        const schema = params.schema ?? "public";
        const result = await db.query<{
          name: string;
          type: string;
          nullable: boolean;
          default: string | null;
          primaryKey: boolean;
        }>(
          `
            select
              c.column_name as "name",
              c.data_type as "type",
              c.is_nullable = 'YES' as "nullable",
              c.column_default as "default",
              exists (
                select 1
                from information_schema.table_constraints tc
                join information_schema.key_column_usage kcu
                  on tc.constraint_name = kcu.constraint_name
                  and tc.table_schema = kcu.table_schema
                  and tc.table_name = kcu.table_name
                where tc.constraint_type = 'PRIMARY KEY'
                  and tc.table_schema = c.table_schema
                  and tc.table_name = c.table_name
                  and kcu.column_name = c.column_name
              ) as "primaryKey"
            from information_schema.columns c
            where c.table_schema = $1
              and c.table_name = $2
            order by c.ordinal_position
          `,
          [schema, params.table],
        );

        return result.rows;
      });
    },

    async selectRows(params: SelectRowsParams, context?: PluginContext) {
      return withPool(context, async (db) => {
        const where = buildWhereClause(params.where);
        const limit = normalizeLimit(params.limit);
        const offset = normalizeOffset(params.offset);
        const sql =
          `select ${selectedColumns(params.columns)} from ${qualifiedTable(params.schema, params.table)}` +
          where.sql +
          buildOrderClause(params.orderBy) +
          ` limit $${where.values.length + 1} offset $${where.values.length + 2}`;
        const result = await db.query(sql, [...where.values, limit, offset]);

        return result.rows;
      });
    },

    async insertRow(params: InsertRowParams, context?: PluginContext) {
      return withPool(context, async (db) => {
        assertObjectHasFields(params.row, "row");

        const entries = Object.entries(params.row);
        const columns = entries.map(([key]) => quoteIdentifier(key)).join(", ");
        const placeholders = entries.map((_, index) => `$${index + 1}`).join(", ");
        const values = entries.map(([, value]) => value);
        const result = await db.query(
          `insert into ${qualifiedTable(params.schema, params.table)} (${columns}) values (${placeholders}) returning *`,
          values,
        );

        return result.rows[0] ?? null;
      });
    },

    async updateRows(params: UpdateRowsParams, context?: PluginContext) {
      return withPool(context, async (db) => {
        assertObjectHasFields(params.patch, "patch");

        const patchEntries = Object.entries(params.patch);
        const setSql = patchEntries.map(([key], index) => `${quoteIdentifier(key)} = $${index + 1}`).join(", ");
        const patchValues = patchEntries.map(([, value]) => value);
        const where = buildWhereClause(params.where, patchValues.length + 1);
        const result = await db.query(
          `update ${qualifiedTable(params.schema, params.table)} set ${setSql}${where.sql} returning *`,
          [...patchValues, ...where.values],
        );

        return result.rows;
      });
    },

    async deleteRows(params: DeleteRowsParams, context?: PluginContext) {
      if (params.confirm !== true) {
        throw new Error("deleteRows requires confirm: true.");
      }

      return withPool(context, async (db) => {
        const where = buildWhereClause(params.where);
        const result = await db.query(
          `delete from ${qualifiedTable(params.schema, params.table)}${where.sql} returning *`,
          where.values,
        );

        return result.rows;
      });
    },

    async executeQuery(params: ExecuteQueryParams, context?: PluginContext) {
      assertUnsafeSqlAllowed(context);

      return withPool(context, async (db) => {
        const result = await db.query(params.sql, params.values ?? []);
        return { rowCount: result.rowCount, rows: result.rows };
      });
    },

    async transaction(params: TransactionParams, context?: PluginContext) {
      assertUnsafeSqlAllowed(context);

      const pool = createPool(context);
      const client = await pool.connect();
      try {
        return await runTransaction(client, params.statements);
      } finally {
        client.release();
        await pool.end();
      }
    },

    async searchAgentMemory(params: AgentMemorySearchParams, context?: PluginContext) {
      return withPool(context, (db) => searchAgentMemoryWithDb(db, params));
    },

    async putAgentMemory(params: AgentMemoryPutParams, context?: PluginContext) {
      return withPool(context, (db) => putAgentMemoryWithDb(db, params));
    },
  };
}
