import fs from "node:fs";
import path from "node:path";
import type { FastifyInstance, FastifyReply } from "fastify";
import {
  createAuvexisAccountsClient,
  type AuthorizationTransaction,
} from "@auvexis/accounts";

import { resolveProfilePaths } from "../../profiles/profile-paths.ts";
import { fabricHomePaths } from "../../runtime/fabric-home.ts";
import { loadAuvexisAccountConfig } from "./auvexis-account-config.ts";
import {
  createAuvexisAccountLinkService,
  type AuvexisAccountLinkAuthorization,
  type AuvexisAccountStatusResult,
  type CompleteAuvexisCallbackInput,
  type CreateAuvexisAccountLinkInput,
  type EmitAuvexisProductEventInput,
} from "./auvexis-account-link-service.ts";
import { loadOrCreateAuvexisLocalSecret } from "./auvexis-local-secret.ts";
import { createAuvexisAccountStorage } from "./auvexis-account-storage.ts";
import { PublicUrlService } from "../app/public-url-service.ts";

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
  emitProductEvent?(input: EmitAuvexisProductEventInput): Promise<unknown>;
  logoutLocal?(): Promise<{ status: "disconnected" }>;
  revokeRemote?(): Promise<{ status: "disconnected" }>;
}

export interface AuvexisAccountRoutesOptions {
  getActiveProfileId?: () => string | null;
  createService?: (profileId: string) => AuvexisAccountRouteService;
  fabricHome?: string;
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
      callbackUrl: absoluteRequestUrl(request.url, request.headers),
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

  fastify.post("/auvexis/events", async (request, reply) => {
    const profileId = requireActiveProfileId(getActiveProfileId, reply);
    if (!profileId) return;

    const body = parseProductEventBody(request.body);
    if (!body) {
      return send(reply, 400, "AUVEXIS_EVENT_INVALID_BODY", null);
    }

    const service = createService(profileId);
    if (!service.emitProductEvent) {
      return send(reply, 500, "AUVEXIS_SERVICE_UNAVAILABLE", null);
    }

    try {
      return send(
        reply,
        200,
        "Auvexis product event emitted",
        await service.emitProductEvent({
          profileId,
          ...body,
        }),
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "AUVEXIS_ACCOUNT_NOT_CONNECTED"
      ) {
        return send(reply, 409, "AUVEXIS_ACCOUNT_NOT_CONNECTED", null);
      }
      throw error;
    }
  });
}

function createDefaultService(
  profileId: string,
  options: AuvexisAccountRoutesOptions,
): AuvexisAccountRouteService {
  const fabricHome = options.fabricHome ?? fabricHomePaths.home;
  const config = loadAuvexisAccountConfig(
    process.env,
    loadOrCreateAuvexisLocalSecret({ fabricHome }),
    `${PublicUrlService.getPublicUrl()}/auvexis/account/connect/callback`,
  );
  const paths = resolveProfilePaths({
    fabricHome,
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

export function createFileAuvexisOAuthTransactionStore(dataDir: string) {
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
  productSubject?: {
    type: string;
    id: string;
  };
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
    ...(transaction.productSubject
      ? { productSubject: transaction.productSubject }
      : {}),
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

function parseProductEventBody(
  body: unknown,
): Omit<EmitAuvexisProductEventInput, "profileId"> | null {
  if (typeof body !== "object" || body === null) return null;
  const record = body as Record<string, unknown>;
  if (typeof record.type !== "string" || record.type.trim().length === 0) {
    return null;
  }
  if ("eventId" in record && typeof record.eventId !== "string") return null;
  if ("occurredAt" in record && typeof record.occurredAt !== "string")
    return null;
  if ("evidence" in record && !isStringRecord(record.evidence)) return null;

  return {
    type: record.type.trim(),
    ...(typeof record.eventId === "string" && record.eventId.trim()
      ? { eventId: record.eventId.trim() }
      : {}),
    ...(typeof record.occurredAt === "string" && record.occurredAt.trim()
      ? { occurredAt: record.occurredAt.trim() }
      : {}),
    ...(isStringRecord(record.evidence) ? { evidence: record.evidence } : {}),
  };
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((entry) => typeof entry === "string")
  );
}

function absoluteRequestUrl(
  requestUrl: string,
  headers: Record<string, string | string[] | undefined>,
): string {
  const forwardedHost = firstHeader(headers["x-forwarded-host"]);
  const forwardedProto = firstHeader(headers["x-forwarded-proto"]);
  const host = forwardedHost || firstHeader(headers.host) || "127.0.0.1:23801";
  const proto = forwardedProto || "http";
  return new URL(requestUrl, `${proto}://${host}`).toString();
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
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
    <title>Auvexis connected · Fabric</title>
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
      <p>You can close this tab and return to Fabric. If Fabric does not update automatically, click Refresh.</p>
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
