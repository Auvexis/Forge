import type { PluginContext } from "@auvexis/fabric-sdk";

const NOTION_API_BASE = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

type JsonValue = Record<string, any> | any[] | undefined;

function required(value: string | undefined, fieldName: string): string {
  const trimmed = value?.trim();
  if (!trimmed) throw new Error(`'${fieldName}' is required.`);
  return trimmed;
}

function parseJson(value: JsonValue | string, fieldName: string): JsonValue {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch (error: any) {
    throw new Error(`Failed to parse '${fieldName}' as JSON: ${error.message}`);
  }
}

function optionalPageSize(value: number | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isFinite(value) || value < 1) throw new Error("'pageSize' must be a positive number.");
  return Math.min(Math.floor(value), 100);
}

export async function notionApi(
  context: PluginContext,
  method: string,
  path: string,
  body?: Record<string, any>,
): Promise<any> {
  const token = context.credentials?.integration_token?.trim();
  if (!token) {
    throw new Error("Notion integration token is not configured. Go to Settings > Plugins > Notion and enter your token.");
  }

  const response = await fetch(`${NOTION_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(`Notion API error on '${path}': ${data.message ?? response.statusText}`);
  }

  return data;
}

export function createNotionMethods() {
  return {
    search: async (
      params: { query?: string; filter?: string | Record<string, any>; sort?: string | Record<string, any>; pageSize?: number } = {},
      context?: PluginContext,
    ) => notionApi(context!, "POST", "/search", {
      ...(params.query?.trim() ? { query: params.query.trim() } : {}),
      ...(parseJson(params.filter, "filter") ? { filter: parseJson(params.filter, "filter") } : {}),
      ...(parseJson(params.sort, "sort") ? { sort: parseJson(params.sort, "sort") } : {}),
      ...(optionalPageSize(params.pageSize) ? { page_size: optionalPageSize(params.pageSize) } : {}),
    }),

    getPage: async (
      params: { pageId: string },
      context?: PluginContext,
    ) => notionApi(context!, "GET", `/pages/${required(params.pageId, "pageId")}`),

    createPage: async (
      params: { parent: string | Record<string, any>; properties: string | Record<string, any>; children?: string | any[] },
      context?: PluginContext,
    ) => notionApi(context!, "POST", "/pages", {
      parent: parseJson(params.parent, "parent"),
      properties: parseJson(params.properties, "properties"),
      ...(parseJson(params.children, "children") ? { children: parseJson(params.children, "children") } : {}),
    }),

    updatePageProperties: async (
      params: { pageId: string; properties: string | Record<string, any>; archived?: boolean },
      context?: PluginContext,
    ) => notionApi(context!, "PATCH", `/pages/${required(params.pageId, "pageId")}`, {
      properties: parseJson(params.properties, "properties"),
      ...(params.archived !== undefined ? { archived: params.archived } : {}),
    }),

    queryDatabase: async (
      params: { databaseId: string; filter?: string | Record<string, any>; sorts?: string | any[]; pageSize?: number },
      context?: PluginContext,
    ) => notionApi(context!, "POST", `/databases/${required(params.databaseId, "databaseId")}/query`, {
      ...(parseJson(params.filter, "filter") ? { filter: parseJson(params.filter, "filter") } : {}),
      ...(parseJson(params.sorts, "sorts") ? { sorts: parseJson(params.sorts, "sorts") } : {}),
      ...(optionalPageSize(params.pageSize) ? { page_size: optionalPageSize(params.pageSize) } : {}),
    }),

    createDatabaseItem: async (
      params: { databaseId: string; properties: string | Record<string, any>; children?: string | any[] },
      context?: PluginContext,
    ) => notionApi(context!, "POST", "/pages", {
      parent: { database_id: required(params.databaseId, "databaseId") },
      properties: parseJson(params.properties, "properties"),
      ...(parseJson(params.children, "children") ? { children: parseJson(params.children, "children") } : {}),
    }),

    appendBlockChildren: async (
      params: { blockId: string; children: string | any[] },
      context?: PluginContext,
    ) => notionApi(context!, "PATCH", `/blocks/${required(params.blockId, "blockId")}/children`, {
      children: parseJson(params.children, "children"),
    }),

    listBlockChildren: async (
      params: { blockId: string; pageSize?: number; startCursor?: string },
      context?: PluginContext,
    ) => {
      const search = new URLSearchParams();
      const pageSize = optionalPageSize(params.pageSize);
      if (pageSize) search.set("page_size", String(pageSize));
      if (params.startCursor?.trim()) search.set("start_cursor", params.startCursor.trim());
      const qs = search.toString();
      return notionApi(context!, "GET", `/blocks/${required(params.blockId, "blockId")}/children${qs ? `?${qs}` : ""}`);
    },
  };
}
