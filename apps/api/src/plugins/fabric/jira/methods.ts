import type { PluginContext } from "@auvexis/fabric-sdk";

function required(value: string | undefined, fieldName: string): string {
  const trimmed = value?.trim();
  if (!trimmed) throw new Error(`'${fieldName}' is required.`);
  return trimmed;
}

function parseJsonObject(value: string | Record<string, any> | undefined, fieldName: string): Record<string, any> {
  if (!value) return {};
  if (typeof value !== "string") return value;
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("must be an object");
    return parsed;
  } catch (error: any) {
    throw new Error(`Failed to parse '${fieldName}' as JSON object: ${error.message}`);
  }
}

function adfText(text: string) {
  return {
    type: "doc",
    version: 1,
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

function jiraCredentials(context: PluginContext) {
  const baseUrl = context.credentials?.base_url?.trim()?.replace(/\/+$/, "");
  const email = context.credentials?.email?.trim();
  const apiToken = context.credentials?.api_token?.trim();
  if (!baseUrl || !email || !apiToken) {
    throw new Error("Jira credentials are not configured. Go to Settings > Plugins > Jira.");
  }
  return { baseUrl, authorization: `Basic ${Buffer.from(`${email}:${apiToken}`).toString("base64")}` };
}

export async function jiraApi(
  context: PluginContext,
  method: string,
  path: string,
  body?: Record<string, any>,
): Promise<any> {
  const { baseUrl, authorization } = jiraCredentials(context);
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: authorization,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const message = data.errorMessages?.join("; ") ?? data.message ?? (text || response.statusText);
    throw new Error(`Jira API error on '${path}': ${message}`);
  }
  return data;
}

export function createJiraMethods() {
  return {
    listProjects: async (
      _params: Record<string, never> = {},
      context?: PluginContext,
    ) => jiraApi(context!, "GET", "/rest/api/3/project/search"),

    searchIssues: async (
      params: { jql: string; maxResults?: number; fields?: string[] | string },
      context?: PluginContext,
    ) => jiraApi(context!, "POST", "/rest/api/3/search/jql", {
      jql: required(params.jql, "jql"),
      maxResults: params.maxResults ?? 50,
      ...(params.fields ? { fields: Array.isArray(params.fields) ? params.fields : params.fields.split(",").map((field) => field.trim()).filter(Boolean) } : {}),
    }),

    getIssue: async (
      params: { issueIdOrKey: string },
      context?: PluginContext,
    ) => jiraApi(context!, "GET", `/rest/api/3/issue/${required(params.issueIdOrKey, "issueIdOrKey")}`),

    createIssue: async (
      params: { projectKey: string; issueType: string; summary: string; description?: string; fields?: string | Record<string, any> },
      context?: PluginContext,
    ) => jiraApi(context!, "POST", "/rest/api/3/issue", {
      fields: {
        ...parseJsonObject(params.fields, "fields"),
        project: { key: required(params.projectKey, "projectKey") },
        issuetype: { name: required(params.issueType, "issueType") },
        summary: required(params.summary, "summary"),
        ...(params.description?.trim() ? { description: adfText(params.description.trim()) } : {}),
      },
    }),

    updateIssue: async (
      params: { issueIdOrKey: string; fields: string | Record<string, any> },
      context?: PluginContext,
    ) => jiraApi(context!, "PUT", `/rest/api/3/issue/${required(params.issueIdOrKey, "issueIdOrKey")}`, {
      fields: parseJsonObject(params.fields, "fields"),
    }),

    transitionIssue: async (
      params: { issueIdOrKey: string; transitionId: string },
      context?: PluginContext,
    ) => jiraApi(context!, "POST", `/rest/api/3/issue/${required(params.issueIdOrKey, "issueIdOrKey")}/transitions`, {
      transition: { id: required(params.transitionId, "transitionId") },
    }),

    addComment: async (
      params: { issueIdOrKey: string; comment: string },
      context?: PluginContext,
    ) => jiraApi(context!, "POST", `/rest/api/3/issue/${required(params.issueIdOrKey, "issueIdOrKey")}/comment`, {
      body: adfText(required(params.comment, "comment")),
    }),

    assignIssue: async (
      params: { issueIdOrKey: string; accountId: string },
      context?: PluginContext,
    ) => jiraApi(context!, "PUT", `/rest/api/3/issue/${required(params.issueIdOrKey, "issueIdOrKey")}/assignee`, {
      accountId: required(params.accountId, "accountId"),
    }),
  };
}
