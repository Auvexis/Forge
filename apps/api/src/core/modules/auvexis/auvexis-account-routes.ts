import fs from "node:fs";
import path from "node:path";
import type { FastifyInstance, FastifyReply } from "fastify";
import {
  createAuvexisAccountsClient,
  type AuthorizationTransaction,
} from "@auvexis/accounts";

import { resolveProfilePaths } from "../../profiles/profile-paths.ts";
import { sailorHomePaths } from "../../runtime/sailor-home.ts";
import { loadAuvexisAccountConfig } from "./auvexis-account-config.ts";
import {
  createAuvexisAccountLinkService,
  type AuvexisAccountLinkAuthorization,
  type AuvexisAccountStatusResult,
  type CompleteAuvexisCallbackInput,
  type CreateAuvexisAccountLinkInput,
} from "./auvexis-account-link-service.ts";
import { loadOrCreateAuvexisLocalSecret } from "./auvexis-local-secret.ts";
import { createAuvexisAccountStorage } from "./auvexis-account-storage.ts";

interface ApiResponse<T> {
  status_code: number;
  message: string;
  error: string | null;
  data: T;
}

export interface AuvexisAccountRouteService {
  createAuthorization?(
    input: CreateAuvexisAccountLinkInput,
  ): Promise<AuvexisAccountLinkAuthorization>;
  completeCallback?(input: CompleteAuvexisCallbackInput): Promise<{
    status: "connected";
    account: { id: string; username: string };
  }>;
  getStatus?(input?: {
    profileId?: string;
  }): Promise<AuvexisAccountStatusResult>;
  logoutLocal?(): Promise<{ status: "disconnected" }>;
  revokeRemote?(): Promise<{ status: "disconnected" }>;
}

export interface AuvexisAccountRoutesOptions {
  getActiveProfileId?: () => string | null;
  createService?: (profileId: string) => AuvexisAccountRouteService;
  sailorHome?: string;
}

const TRANSACTIONS_FILE = "auvexis-oauth-transactions.json";
const TRANSACTION_TTL_MS = 10 * 60 * 1000;

export default async function auvexisAccountRoutes(
  fastify: FastifyInstance,
  options: AuvexisAccountRoutesOptions = {},
) {
  const getActiveProfileId = options.getActiveProfileId ?? (() => "default");
  const createService =
    options.createService ??
    ((profileId: string) => createDefaultService(profileId, options));

  fastify.post("/auvexis/account/connect/start", async (_request, reply) => {
    const profileId = requireActiveProfileId(getActiveProfileId, reply);
    if (!profileId) return;

    const service = createService(profileId);
    if (!service.createAuthorization) {
      return send(reply, 500, "AUVEXIS_SERVICE_UNAVAILABLE", null);
    }
    const authorization = await service.createAuthorization({ profileId });
    return send(reply, 200, "Auvexis OAuth started", {
      authorizationUrl: authorization.authorizationUrl,
    });
  });

  fastify.get("/auvexis/account/connect/callback", async (request, reply) => {
    const profileId = requireActiveProfileId(getActiveProfileId, reply);
    if (!profileId) return;

    const state = readQueryString(request.query, "state");
    if (!state) {
      return send(reply, 400, "AUVEXIS_OAUTH_STATE_REQUIRED", null);
    }
    const service = createService(profileId);
    if (!service.completeCallback) {
      return send(reply, 500, "AUVEXIS_SERVICE_UNAVAILABLE", null);
    }

    const result = await service.completeCallback({
      profileId,
      callbackUrl: absoluteRequestUrl(request.url, request.headers.host),
      state,
    });
    if (prefersHtml(request.headers.accept)) {
      return reply
        .type("text/html; charset=utf-8")
        .send(renderCallbackResultPage(result.account.username));
    }
    return send(reply, 200, "Auvexis account connected", result);
  });

  fastify.get("/auvexis/account", async (_request, reply) => {
    const profileId = requireActiveProfileId(getActiveProfileId, reply);
    if (!profileId) return;

    const service = createService(profileId);
    if (!service.getStatus) {
      return send(reply, 500, "AUVEXIS_SERVICE_UNAVAILABLE", null);
    }
    return send(
      reply,
      200,
      "Auvexis account status",
      await service.getStatus({ profileId }),
    );
  });

  fastify.post("/auvexis/account/logout", async (_request, reply) => {
    const profileId = requireActiveProfileId(getActiveProfileId, reply);
    if (!profileId) return;

    const service = createService(profileId);
    if (!service.logoutLocal) {
      return send(reply, 500, "AUVEXIS_SERVICE_UNAVAILABLE", null);
    }
    return send(
      reply,
      200,
      "Auvexis account logged out locally",
      await service.logoutLocal(),
    );
  });

  fastify.post("/auvexis/account/revoke", async (_request, reply) => {
    const profileId = requireActiveProfileId(getActiveProfileId, reply);
    if (!profileId) return;

    const service = createService(profileId);
    if (!service.revokeRemote) {
      return send(reply, 500, "AUVEXIS_SERVICE_UNAVAILABLE", null);
    }
    return send(
      reply,
      200,
      "Auvexis account revoked",
      await service.revokeRemote(),
    );
  });
}

function createDefaultService(
  profileId: string,
  options: AuvexisAccountRoutesOptions,
): AuvexisAccountRouteService {
  const sailorHome = options.sailorHome ?? sailorHomePaths.home;
  const config = loadAuvexisAccountConfig(
    process.env,
    loadOrCreateAuvexisLocalSecret({ sailorHome }),
  );
  const paths = resolveProfilePaths({
    sailorHome,
    profileId,
  });

  return createAuvexisAccountLinkService({
    client: createAuvexisAccountsClient({
      clientId: config.clientId,
      redirectUri: config.redirectUri,
      baseUrl: config.baseUrl,
    }),
    transactions: createFileAuvexisOAuthTransactionStore(paths.dataDir),
    storage: createAuvexisAccountStorage({
      dataDir: paths.dataDir,
      tokenEncryptionSecret: config.tokenEncryptionSecret,
    }),
  });
}

function createFileAuvexisOAuthTransactionStore(dataDir: string) {
  const filePath = path.join(dataDir, TRANSACTIONS_FILE);

  return {
    save(profileId: string, transaction: AuthorizationTransaction): void {
      const transactions = readTransactions(filePath);
      transactions[transaction.state] = {
        profileId,
        transaction: serializeTransaction(transaction),
      };
      writeTransactions(filePath, pruneTransactions(transactions));
    },

    consume(profileId: string, state: string): AuthorizationTransaction | null {
      const transactions = pruneTransactions(readTransactions(filePath));
      const entry = transactions[state];
      delete transactions[state];
      writeTransactions(filePath, transactions);
      if (!entry || entry.profileId !== profileId) return null;
      return deserializeTransaction(entry.transaction);
    },
  };
}

interface SerializedTransaction {
  authorizationUrl: string;
  state: string;
  nonce: string;
  codeVerifier: string;
  createdAt: number;
}

interface TransactionFileEntry {
  profileId: string;
  transaction: SerializedTransaction;
}

function serializeTransaction(
  transaction: AuthorizationTransaction,
): SerializedTransaction {
  return {
    authorizationUrl: transaction.authorizationUrl.toString(),
    state: transaction.state,
    nonce: transaction.nonce,
    codeVerifier: transaction.codeVerifier,
    createdAt: transaction.createdAt,
  };
}

function deserializeTransaction(
  transaction: SerializedTransaction,
): AuthorizationTransaction {
  return {
    ...transaction,
    authorizationUrl: new URL(transaction.authorizationUrl),
  };
}

function readTransactions(
  filePath: string,
): Record<string, TransactionFileEntry> {
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<
    string,
    TransactionFileEntry
  >;
}

function writeTransactions(
  filePath: string,
  transactions: Record<string, TransactionFileEntry>,
): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    `${JSON.stringify(transactions, null, 2)}\n`,
    "utf8",
  );
}

function pruneTransactions(
  transactions: Record<string, TransactionFileEntry>,
): Record<string, TransactionFileEntry> {
  const now = Date.now();
  return Object.fromEntries(
    Object.entries(transactions).filter(
      ([, entry]) => now - entry.transaction.createdAt <= TRANSACTION_TTL_MS,
    ),
  );
}

function requireActiveProfileId(
  getActiveProfileId: () => string | null,
  reply: FastifyReply,
): string | null {
  const profileId = getActiveProfileId();
  if (profileId) return profileId;
  send(reply, 409, "AUVEXIS_PROFILE_REQUIRED", null);
  return null;
}

function readQueryString(query: unknown, key: string): string | null {
  if (typeof query !== "object" || query === null || !(key in query))
    return null;
  const value = (query as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
}

function absoluteRequestUrl(
  requestUrl: string,
  host: string | undefined,
): string {
  return new URL(requestUrl, `http://${host ?? "127.0.0.1:23801"}`).toString();
}

function prefersHtml(acceptHeader: string | undefined): boolean {
  return acceptHeader?.includes("text/html") ?? false;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderCallbackResultPage(username: string): string {
  const safeUsername = escapeHtml(username);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Auvexis connected · Sailor</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        background: #090b10;
        color: #f7f8fb;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      main {
        width: min(100%, 420px);
        padding: 28px;
        border: 1px solid #2b3240;
        border-radius: 18px;
        background: #141821;
        text-align: center;
      }
      h1 { margin: 0 0 12px; font-size: 24px; }
      p { margin: 0; color: #b8bfcc; line-height: 1.6; }
      strong { color: #f7f8fb; }
    </style>
  </head>
  <body>
    <main>
      <h1>Auvexis account connected</h1>
      <p>Connected as <strong>@${safeUsername}</strong>.</p>
      <p>You can close this tab and return to Sailor. If Sailor does not update automatically, click Refresh.</p>
    </main>
    <script>
      setTimeout(() => window.close(), 700);
    </script>
  </body>
</html>`;
}

function send<T>(
  reply: FastifyReply,
  statusCode: number,
  message: string,
  data: T,
) {
  const response: ApiResponse<T> = {
    status_code: statusCode,
    message,
    error: statusCode >= 400 ? message : null,
    data,
  };
  return reply.code(statusCode).send(response);
}
