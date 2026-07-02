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
  completeCallback?(
    input: CompleteAuvexisCallbackInput,
  ): Promise<{ status: "connected"; account: { id: string; username: string } }>;
  getStatus?(): Promise<AuvexisAccountStatusResult>;
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
    return send(reply, 200, "Auvexis account connected", result);
  });

  fastify.get("/auvexis/account", async (_request, reply) => {
    const profileId = requireActiveProfileId(getActiveProfileId, reply);
    if (!profileId) return;

    const service = createService(profileId);
    if (!service.getStatus) {
      return send(reply, 500, "AUVEXIS_SERVICE_UNAVAILABLE", null);
    }
    return send(reply, 200, "Auvexis account status", await service.getStatus());
  });

  fastify.post("/auvexis/account/logout", async (_request, reply) => {
    const profileId = requireActiveProfileId(getActiveProfileId, reply);
    if (!profileId) return;

    const service = createService(profileId);
    if (!service.logoutLocal) {
      return send(reply, 500, "AUVEXIS_SERVICE_UNAVAILABLE", null);
    }
    return send(reply, 200, "Auvexis account logged out locally", await service.logoutLocal());
  });

  fastify.post("/auvexis/account/revoke", async (_request, reply) => {
    const profileId = requireActiveProfileId(getActiveProfileId, reply);
    if (!profileId) return;

    const service = createService(profileId);
    if (!service.revokeRemote) {
      return send(reply, 500, "AUVEXIS_SERVICE_UNAVAILABLE", null);
    }
    return send(reply, 200, "Auvexis account revoked", await service.revokeRemote());
  });
}

function createDefaultService(
  profileId: string,
  options: AuvexisAccountRoutesOptions,
): AuvexisAccountRouteService {
  const config = loadAuvexisAccountConfig();
  const paths = resolveProfilePaths({
    sailorHome: options.sailorHome ?? sailorHomePaths.home,
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

function readTransactions(filePath: string): Record<string, TransactionFileEntry> {
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
  fs.writeFileSync(filePath, `${JSON.stringify(transactions, null, 2)}\n`, "utf8");
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
  if (typeof query !== "object" || query === null || !(key in query)) return null;
  const value = (query as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
}

function absoluteRequestUrl(requestUrl: string, host: string | undefined): string {
  return new URL(requestUrl, `http://${host ?? "127.0.0.1:23801"}`).toString();
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
