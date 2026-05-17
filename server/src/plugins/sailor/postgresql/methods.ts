import type { PluginContext } from "@auvexis/sailor-sdk";
import pg from "pg";

const { Pool } = pg;
const MAX_LIMIT = 1000;

type Queryable = {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    values?: unknown[],
  ): Promise<{ rows: T[] }>;
};

type TableParams = {
  schema?: string;
};

type DescribeTableParams = TableParams & {
  table: string;
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
  };
}
