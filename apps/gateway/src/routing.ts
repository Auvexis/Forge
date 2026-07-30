export interface GatewayRoute {
  target: "api" | "client";
  reason: string;
}

export interface GatewayRouteInput {
  accept?: string | string[];
  fetchMode?: string | string[];
}

const API_PREFIXES = [
  "/app",
  "/profiles",
  "/notifications",
  "/workflows",
  "/workflow-nodes",
  "/webhook",
  "/webhook-test",
  "/webhooks",
  "/forms-api",
  "/temporary-forms-api",
  "/forms-test",
  "/plugins",
  "/credentials",
  "/plugin-events",
  "/events",
  "/agent-chat",
  "/agent-chats",
  "/agent-sessions",
  "/agent-panel",
  "/agent-tools",
  "/agent-memory",
  "/agent-approvals",
  "/auvexis",
  "/command-palette",
  "/sites",
  "/pages",
] as const;

const PROFILE_API_SEGMENTS = new Set([
  "actions",
  "forms-api",
  "plugin-events",
  "webhook",
  "workflows",
]);

function acceptsHtml(input: GatewayRouteInput = {}): boolean {
  const accept = Array.isArray(input.accept) ? input.accept.join(",") : input.accept ?? "";
  return accept.includes("text/html");
}

function isBrowserNavigation(input: GatewayRouteInput = {}): boolean {
  const fetchMode = Array.isArray(input.fetchMode) ? input.fetchMode.join(",") : input.fetchMode ?? "";
  return fetchMode === "navigate" && acceptsHtml(input);
}

export function resolveGatewayRoute(pathname: string, input: GatewayRouteInput = {}): GatewayRoute {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;

  if (/^\/plugins\/[^/]+\/auth\/callback$/.test(path)) {
    return { target: "api", reason: "oauth-callback" };
  }

  if (isBrowserNavigation(input)) {
    return { target: "client", reason: "html-navigation" };
  }

  for (const prefix of API_PREFIXES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      return { target: "api", reason: prefix };
    }
  }

  const profileMatch = path.match(/^\/p\/[^/]+\/([^/]+)/);
  if (profileMatch && PROFILE_API_SEGMENTS.has(profileMatch[1])) {
    return { target: "api", reason: `/p/:profileId/${profileMatch[1]}` };
  }

  return { target: "client", reason: "spa" };
}
