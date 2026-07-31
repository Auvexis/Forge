import type { PluginContext } from "@auvexis/fabric-sdk";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1000;
const LIST_TABLES_RPC_SQL = `create or replace function fabric_list_tables(target_schema text default 'public')
returns table(schema text, name text, type text)
language sql
security definer
as $$
  select table_schema, table_name, table_type
  from information_schema.tables
  where table_schema = target_schema
  order by table_name;
$$;`;

type SupabaseQuery = Record<string, any>;

type SupabaseFilter = {
  column: string;
  operator: string;
  value: unknown;
};

type OrderBy = {
  column?: string;
  direction?: string;
};

type ListTablesParams = {
  schema?: string;
};

type TableParams = {
  table: string;
};

type SelectRowsParams = TableParams & {
  columns?: string[];
  filters?: SupabaseFilter[];
  orderBy?: OrderBy;
  limit?: number;
  offset?: number;
};

type InsertRowParams = TableParams & {
  row: Record<string, unknown>;
};

type UpdateRowsParams = TableParams & {
  patch: Record<string, unknown>;
  filters?: SupabaseFilter[];
};

type DeleteRowsParams = TableParams & {
  filters?: SupabaseFilter[];
  confirm?: boolean;
};

type UpsertRowParams = InsertRowParams & {
  onConflict?: string;
};

type CallRpcParams = {
  name: string;
  payload?: Record<string, unknown>;
};

type StorageObjectParams = {
  bucket: string;
  path: string;
};

type UploadObjectParams = StorageObjectParams & {
  file: { name: string; mimeType: string; content: Buffer };
  upsert?: boolean;
};

type CreateSignedUrlParams = StorageObjectParams & {
  expiresIn?: number;
};

export function createClientFromContext(context?: PluginContext) {
  const url = context?.credentials?.url;
  const key = context?.credentials?.key;
  const schema = context?.credentials?.schema || "public";

  if (!url || !key) {
    throw new Error("Supabase url and key credentials are required.");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: { schema },
  });
}

function normalizeLimit(value?: number): number {
  const parsed = Number(value ?? DEFAULT_LIMIT);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_LIMIT;
  return Math.min(Math.trunc(parsed), MAX_LIMIT);
}

function normalizeOffset(value?: number): number {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.trunc(parsed);
}

function assertRow(value: Record<string, unknown>, label: string) {
  if (!value || Object.keys(value).length === 0) {
    throw new Error(`${label} must include at least one field.`);
  }
}

function throwIfError(error: unknown) {
  if (error) {
    const message = error instanceof Error ? error.message : String((error as { message?: string }).message ?? error);
    throw new Error(message);
  }
}

export function applyFiltersToQuery<T extends SupabaseQuery>(query: T, filters: SupabaseFilter[] = []) {
  let next = query;

  for (const filter of filters) {
    switch (filter.operator) {
      case "eq":
      case "neq":
      case "gt":
      case "gte":
      case "lt":
      case "lte":
      case "ilike":
      case "is":
        next = next[filter.operator](filter.column, filter.value);
        break;
      case "in":
        if (!Array.isArray(filter.value)) {
          throw new Error("Supabase in filter value must be an array.");
        }
        next = next.in(filter.column, filter.value);
        break;
      default:
        throw new Error(`Unsupported Supabase filter operator: ${filter.operator}`);
    }
  }

  return next;
}

function applyOrderToQuery<T extends SupabaseQuery>(query: T, orderBy?: OrderBy) {
  if (!orderBy?.column) return query;
  const direction = String(orderBy.direction || "asc").toLowerCase();
  if (!["asc", "desc"].includes(direction)) {
    throw new Error("Invalid order direction.");
  }

  return query.order(orderBy.column, { ascending: direction === "asc" });
}

function selectedColumns(columns?: string[]): string {
  if (!columns || columns.length === 0) return "*";
  return columns.join(",");
}

export function contentToBuffer(params: { content: string; encoding?: string }): Buffer {
  if (params.encoding === "base64") return Buffer.from(params.content, "base64");
  if (!params.encoding || params.encoding === "text") return Buffer.from(params.content, "utf8");
  throw new Error("Unsupported storage encoding.");
}

export function createSupabaseMethods() {
  return {
    async testConnection(_params: Record<string, never>, context?: PluginContext) {
      const url = context?.credentials?.url;
      const key = context?.credentials?.key;
      if (!url || !key) {
        throw new Error("Supabase url and key credentials are required.");
      }

      const endpoint = new URL("/rest/v1/", url).toString();
      const response = await fetch(endpoint, {
        headers: {
          apikey: key,
          authorization: `Bearer ${key}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Supabase connection failed with status ${response.status}.`);
      }

      return { ok: true, url };
    },

    async listTables(params: ListTablesParams, context?: PluginContext) {
      const client = createClientFromContext(context);
      const schema = params.schema ?? context?.credentials?.schema ?? "public";
      const { data, error } = await client.rpc("fabric_list_tables", { target_schema: schema });

      if (error) {
        throw new Error(`Supabase listTables requires this RPC:\n${LIST_TABLES_RPC_SQL}\nOriginal error: ${error.message}`);
      }

      return data ?? [];
    },

    async selectRows(params: SelectRowsParams, context?: PluginContext) {
      const client = createClientFromContext(context);
      const limit = normalizeLimit(params.limit);
      const offset = normalizeOffset(params.offset);
      const query = client.from(params.table).select(selectedColumns(params.columns));
      const filtered = applyFiltersToQuery(query, params.filters);
      const ordered = applyOrderToQuery(filtered, params.orderBy);
      const { data, error } = await ordered.range(offset, offset + limit - 1);

      throwIfError(error);
      return data ?? [];
    },

    async insertRow(params: InsertRowParams, context?: PluginContext) {
      assertRow(params.row, "row");

      const client = createClientFromContext(context);
      const { data, error } = await client.from(params.table).insert(params.row).select().single();

      throwIfError(error);
      return data;
    },

    async updateRows(params: UpdateRowsParams, context?: PluginContext) {
      assertRow(params.patch, "patch");

      const client = createClientFromContext(context);
      const query = client.from(params.table).update(params.patch).select();
      const { data, error } = await applyFiltersToQuery(query, params.filters);

      throwIfError(error);
      return data ?? [];
    },

    async deleteRows(params: DeleteRowsParams, context?: PluginContext) {
      if (params.confirm !== true) {
        throw new Error("deleteRows requires confirm: true.");
      }

      const client = createClientFromContext(context);
      const query = client.from(params.table).delete().select();
      const { data, error } = await applyFiltersToQuery(query, params.filters);

      throwIfError(error);
      return data ?? [];
    },

    async upsertRow(params: UpsertRowParams, context?: PluginContext) {
      assertRow(params.row, "row");

      const client = createClientFromContext(context);
      const { data, error } = await client
        .from(params.table)
        .upsert(params.row, params.onConflict ? { onConflict: params.onConflict } : undefined)
        .select()
        .single();

      throwIfError(error);
      return data;
    },

    async callRpc(params: CallRpcParams, context?: PluginContext) {
      const client = createClientFromContext(context);
      const { data, error } = await client.rpc(params.name, params.payload ?? {});

      throwIfError(error);
      return data;
    },

    async uploadObject(params: UploadObjectParams, context?: PluginContext) {
      const client = createClientFromContext(context);
      const content = params.file.content;
      const { data, error } = await client.storage.from(params.bucket).upload(params.path, content, {
        contentType: params.file.mimeType,
        upsert: params.upsert === true,
      });

      throwIfError(error);
      return data;
    },

    async downloadObject(params: StorageObjectParams, context?: PluginContext) {
      const client = createClientFromContext(context);
      const { data, error } = await client.storage.from(params.bucket).download(params.path);

      throwIfError(error);
      if (!data) throw new Error("Supabase storage object was not returned.");

      const buffer = Buffer.from(await data.arrayBuffer());
      return {
        name: params.path.split("/").pop() || "download.bin",
        mimeType: data.type || "application/octet-stream",
        size: buffer.byteLength,
        content: buffer,
      };
    },

    async deleteObject(params: StorageObjectParams, context?: PluginContext) {
      const client = createClientFromContext(context);
      const { data, error } = await client.storage.from(params.bucket).remove([params.path]);

      throwIfError(error);
      return data ?? [];
    },

    async createSignedUrl(params: CreateSignedUrlParams, context?: PluginContext) {
      const client = createClientFromContext(context);
      const { data, error } = await client.storage
        .from(params.bucket)
        .createSignedUrl(params.path, params.expiresIn ?? 3600);

      throwIfError(error);
      return data;
    },
  };
}
