import type { PluginContext } from "@auvexis/fabric-sdk";

const TRELLO_API_BASE = "https://api.trello.com/1";

function required(value: string | undefined, fieldName: string): string {
  const trimmed = value?.trim();
  if (!trimmed) throw new Error(`'${fieldName}' is required.`);
  return trimmed;
}

function addDefined(search: URLSearchParams, values: Record<string, string | number | undefined>) {
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
}

export async function trelloApi(
  context: PluginContext,
  method: string,
  path: string,
  query: Record<string, string | number | undefined> = {},
  body?: Record<string, any>,
): Promise<any> {
  const apiKey = context.credentials?.api_key?.trim();
  const token = context.credentials?.token?.trim();
  if (!apiKey || !token) {
    throw new Error("Trello API key and token are not configured. Go to Settings > Plugins > Trello.");
  }

  const url = new URL(`${TRELLO_API_BASE}${path}`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("token", token);
  addDefined(url.searchParams, query);

  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const text = await response.text();
  const data = text && text.trim().startsWith("{") || text.trim().startsWith("[") ? JSON.parse(text) : text;

  if (!response.ok) {
    throw new Error(`Trello API error on '${path}': ${response.status} ${typeof data === "string" ? data : data.message ?? response.statusText}`);
  }

  return data;
}

export function createTrelloMethods() {
  return {
    listBoards: async (
      params: { filter?: string } = {},
      context?: PluginContext,
    ) => trelloApi(context!, "GET", "/members/me/boards", { filter: params.filter?.trim() || "open" }),

    listLists: async (
      params: { boardId: string; filter?: string },
      context?: PluginContext,
    ) => trelloApi(context!, "GET", `/boards/${required(params.boardId, "boardId")}/lists`, { filter: params.filter?.trim() || "open" }),

    listCards: async (
      params: { boardId?: string; listId?: string; filter?: string },
      context?: PluginContext,
    ) => {
      if (params.listId?.trim()) {
        return trelloApi(context!, "GET", `/lists/${params.listId.trim()}/cards`, { filter: params.filter?.trim() || "open" });
      }
      return trelloApi(context!, "GET", `/boards/${required(params.boardId, "boardId")}/cards`, { filter: params.filter?.trim() || "open" });
    },

    createCard: async (
      params: { listId: string; name: string; desc?: string; due?: string; idLabels?: string; pos?: string },
      context?: PluginContext,
    ) => trelloApi(context!, "POST", "/cards", {
      idList: required(params.listId, "listId"),
      name: required(params.name, "name"),
      desc: params.desc?.trim(),
      due: params.due?.trim(),
      idLabels: params.idLabels?.trim(),
      pos: params.pos?.trim(),
    }),

    updateCard: async (
      params: { cardId: string; name?: string; desc?: string; due?: string; idLabels?: string },
      context?: PluginContext,
    ) => trelloApi(context!, "PUT", `/cards/${required(params.cardId, "cardId")}`, {
      name: params.name?.trim(),
      desc: params.desc?.trim(),
      due: params.due?.trim(),
      idLabels: params.idLabels?.trim(),
    }),

    moveCard: async (
      params: { cardId: string; listId: string; pos?: string },
      context?: PluginContext,
    ) => trelloApi(context!, "PUT", `/cards/${required(params.cardId, "cardId")}`, {
      idList: required(params.listId, "listId"),
      pos: params.pos?.trim(),
    }),

    addCommentToCard: async (
      params: { cardId: string; comment: string },
      context?: PluginContext,
    ) => trelloApi(context!, "POST", `/cards/${required(params.cardId, "cardId")}/actions/comments`, {
      text: required(params.comment, "comment"),
    }),

    createChecklistItem: async (
      params: { cardId: string; checklistName?: string; checklistId?: string; itemName: string },
      context?: PluginContext,
    ) => {
      let checklistId = params.checklistId?.trim();
      if (!checklistId) {
        const checklist = await trelloApi(context!, "POST", `/cards/${required(params.cardId, "cardId")}/checklists`, {
          name: params.checklistName?.trim() || "Checklist",
        });
        checklistId = checklist.id;
      }
      return trelloApi(context!, "POST", `/checklists/${checklistId}/checkItems`, {
        name: required(params.itemName, "itemName"),
      });
    },
  };
}
