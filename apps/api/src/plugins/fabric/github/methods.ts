import type { PluginContext } from "@auvexis/fabric-sdk";

const GITHUB_API_BASE = "https://api.github.com";

type GitHubBody = Record<string, any> | undefined;

function required(value: string | undefined, fieldName: string): string {
  const trimmed = value?.trim();
  if (!trimmed) throw new Error(`'${fieldName}' is required.`);
  return trimmed;
}

function optionalLimit(value: number | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  if (!Number.isFinite(value) || value < 1) throw new Error("'limit' must be a positive number.");
  return Math.min(Math.floor(value), 100);
}

function parseCsv(value?: string | string[]): string[] | undefined {
  if (value === undefined) return undefined;
  const items = Array.isArray(value) ? value : value.split(",");
  const parsed = items.map((item) => item.trim()).filter(Boolean);
  return parsed.length > 0 ? parsed : undefined;
}

function withQuery(path: string, query: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

export async function githubApi(
  context: PluginContext,
  method: string,
  path: string,
  body?: GitHubBody,
): Promise<any> {
  const token = context.credentials?.token?.trim();
  if (!token) {
    throw new Error("GitHub token is not configured. Go to Settings > Plugins > GitHub and enter your token.");
  }

  const response = await fetch(`${GITHUB_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(`GitHub API error on '${path}': ${response.status} ${data.message ?? response.statusText}`);
  }

  return data;
}

export function createGitHubMethods() {
  return {
    getRepository: async (
      params: { owner: string; repo: string },
      context?: PluginContext,
    ) => {
      return githubApi(context!, "GET", `/repos/${required(params.owner, "owner")}/${required(params.repo, "repo")}`);
    },

    listIssues: async (
      params: { owner: string; repo: string; state?: string; labels?: string | string[]; limit?: number } ,
      context?: PluginContext,
    ) => {
      const labels = parseCsv(params.labels);
      return githubApi(context!, "GET", withQuery(
        `/repos/${required(params.owner, "owner")}/${required(params.repo, "repo")}/issues`,
        {
          state: params.state?.trim() || "open",
          labels: labels?.join(","),
          per_page: optionalLimit(params.limit, 30),
        },
      ));
    },

    createIssue: async (
      params: { owner: string; repo: string; title: string; body?: string; labels?: string | string[] },
      context?: PluginContext,
    ) => {
      return githubApi(context!, "POST", `/repos/${required(params.owner, "owner")}/${required(params.repo, "repo")}/issues`, {
        title: required(params.title, "title"),
        ...(params.body?.trim() ? { body: params.body.trim() } : {}),
        ...(parseCsv(params.labels) ? { labels: parseCsv(params.labels) } : {}),
      });
    },

    updateIssue: async (
      params: {
        owner: string;
        repo: string;
        issueNumber: number;
        title?: string;
        body?: string;
        state?: string;
        labels?: string | string[];
      },
      context?: PluginContext,
    ) => {
      return githubApi(context!, "PATCH", `/repos/${required(params.owner, "owner")}/${required(params.repo, "repo")}/issues/${params.issueNumber}`, {
        ...(params.title?.trim() ? { title: params.title.trim() } : {}),
        ...(params.body?.trim() ? { body: params.body.trim() } : {}),
        ...(params.state?.trim() ? { state: params.state.trim() } : {}),
        ...(parseCsv(params.labels) ? { labels: parseCsv(params.labels) } : {}),
      });
    },

    addIssueComment: async (
      params: { owner: string; repo: string; issueNumber: number; body: string },
      context?: PluginContext,
    ) => {
      return githubApi(context!, "POST", `/repos/${required(params.owner, "owner")}/${required(params.repo, "repo")}/issues/${params.issueNumber}/comments`, {
        body: required(params.body, "body"),
      });
    },

    listPullRequests: async (
      params: { owner: string; repo: string; state?: string; limit?: number },
      context?: PluginContext,
    ) => {
      return githubApi(context!, "GET", withQuery(
        `/repos/${required(params.owner, "owner")}/${required(params.repo, "repo")}/pulls`,
        {
          state: params.state?.trim() || "open",
          per_page: optionalLimit(params.limit, 30),
        },
      ));
    },

    createPullRequest: async (
      params: { owner: string; repo: string; title: string; head: string; base: string; body?: string; draft?: boolean },
      context?: PluginContext,
    ) => {
      return githubApi(context!, "POST", `/repos/${required(params.owner, "owner")}/${required(params.repo, "repo")}/pulls`, {
        title: required(params.title, "title"),
        head: required(params.head, "head"),
        base: required(params.base, "base"),
        ...(params.body?.trim() ? { body: params.body.trim() } : {}),
        ...(params.draft !== undefined ? { draft: params.draft } : {}),
      });
    },

    listWorkflowRuns: async (
      params: { owner: string; repo: string; workflowId?: string; branch?: string; status?: string; limit?: number },
      context?: PluginContext,
    ) => {
      const workflowPath = params.workflowId?.trim()
        ? `/actions/workflows/${params.workflowId.trim()}/runs`
        : "/actions/runs";
      return githubApi(context!, "GET", withQuery(
        `/repos/${required(params.owner, "owner")}/${required(params.repo, "repo")}${workflowPath}`,
        {
          branch: params.branch?.trim(),
          status: params.status?.trim(),
          per_page: optionalLimit(params.limit, 30),
        },
      ));
    },
  };
}
