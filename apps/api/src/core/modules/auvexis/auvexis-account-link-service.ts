import crypto from "node:crypto";
import type {
  AuthorizationTransaction,
  AuvexisAccountsErrorCode,
  AuvexisProfile,
  AuvexisProductCampaignStatus,
  AuvexisProductEventInput,
  AuvexisProductEventResult,
  AuvexisTokenSet,
  createAuvexisAccountsClient,
} from "@auvexis/accounts";
import type {
  AuvexisAccountConnection,
  AuvexisAccountConnectionStatus,
  StoredAuvexisAccount,
  StoredAuvexisCapabilities,
  StoredAuvexisTokenSet,
} from "./auvexis-account-storage.ts";

type AuvexisAccountsClient = Pick<
  ReturnType<typeof createAuvexisAccountsClient>,
  "createAuthorization"
> &
  Partial<
    Pick<
      ReturnType<typeof createAuvexisAccountsClient>,
      | "exchangeCode"
      | "getProfile"
      | "refresh"
      | "emitProductEvent"
      | "getProductCampaignStatuses"
      | "validateProductAuthorization"
    >
  > & {
    revoke?: (token: string) => Promise<unknown> | unknown;
  };

export interface CreateAuvexisAccountLinkInput {
  profileId: string;
}

export interface AuvexisAccountLinkAuthorization {
  authorizationUrl: string;
  state: string;
  nonce: string;
  codeVerifier: string;
  createdAt: number;
}

export interface AuvexisAccountLinkServiceOptions {
  client: AuvexisAccountsClient;
  transactions?: AuvexisOAuthTransactionStore;
  storage?: AuvexisAccountConnectionStorage;
}

export interface AuvexisOAuthTransactionStore {
  save(
    profileId: string,
    transaction: AuthorizationTransaction,
  ): Promise<void> | void;
  consume(
    profileId: string,
    state: string,
  ): Promise<AuthorizationTransaction | null> | AuthorizationTransaction | null;
}

export interface AuvexisAccountConnectionStorage {
  read?(): AuvexisAccountConnection;
  saveConnected(input: {
    account: StoredAuvexisAccount;
    tokens: StoredAuvexisTokenSet;
  }): void;
  markNeedsReconnect?(): void;
  markValidated?(input: { account: StoredAuvexisAccount }): void;
  clearLocal?(): void;
}

export interface CompleteAuvexisCallbackInput {
  profileId: string;
  callbackUrl: string;
  state: string;
}

export interface EmitAuvexisProductEventInput {
  profileId: string;
  eventId?: string;
  type: string;
  occurredAt?: string;
  evidence?: Record<string, string>;
}

export interface AuvexisAccountStatusResult {
  status: AuvexisAccountConnectionStatus;
  account: StoredAuvexisAccount | null;
  capabilities: StoredAuvexisCapabilities;
  lastValidatedAt: string | null;
}

export function createAuvexisAccountLinkService(
  options: AuvexisAccountLinkServiceOptions,
) {
  return {
    async createAuthorization(
      input: CreateAuvexisAccountLinkInput,
    ): Promise<AuvexisAccountLinkAuthorization> {
      const transaction = await options.client.createAuthorization({
        prompt: "login",
        productSubject: {
          type: "local_profile",
          id: input.profileId,
        },
      });
      await options.transactions?.save(input.profileId, transaction);
      return serializeAuthorizationTransaction(transaction);
    },

    async completeCallback(input: CompleteAuvexisCallbackInput): Promise<{
      status: "connected";
      account: { id: string; username: string };
    }> {
      const transaction = await options.transactions?.consume(
        input.profileId,
        input.state,
      );
      if (!transaction) {
        throw new Error("AUVEXIS_OAUTH_STATE_EXPIRED");
      }
      if (!options.client.exchangeCode || !options.client.getProfile) {
        throw new Error("AUVEXIS_OAUTH_CLIENT_INCOMPLETE");
      }

      const tokens = await options.client.exchangeCode({
        callbackUrl: input.callbackUrl,
        transaction,
      });
      const profile = await options.client.getProfile(tokens.accessToken);
      const account = mapProfileToStoredAccount(profile);
      options.storage?.saveConnected({
        account,
        tokens: mapTokensToStoredTokens(tokens),
      });

      return {
        status: "connected",
        account: {
          id: account.id,
          username: account.username,
        },
      };
    },

    async getStatus(input?: {
      profileId?: string;
    }): Promise<AuvexisAccountStatusResult> {
      const current = options.storage?.read?.() ?? disconnectedConnection();
      if (
        current.status !== "connected" ||
        !current.tokens ||
        !options.client.getProfile
      ) {
        return safeStatus(current);
      }

      try {
        if (input?.profileId && options.client.validateProductAuthorization) {
          const authorization =
            await options.client.validateProductAuthorization(
              current.tokens.accessToken,
              {
                type: "local_profile",
                id: input.profileId,
              },
            );
          if (!authorization.active) {
            options.storage?.markNeedsReconnect?.();
            return {
              status: "needs_reconnect",
              account: current.account,
              capabilities: deriveFabricCapabilities(current.account),
              lastValidatedAt: current.lastValidatedAt,
            };
          }
        }
        const profile = await options.client.getProfile(
          current.tokens.accessToken,
        );
        const account = mapProfileToStoredAccount(profile);
        options.storage?.markValidated?.({ account });
        return {
          status: "connected",
          account,
          capabilities: deriveFabricCapabilities(account),
          lastValidatedAt: new Date().toISOString(),
        };
      } catch (error) {
        if (isAuvexisAccountsError(error, "reauth_required")) {
          options.storage?.markNeedsReconnect?.();
          return {
            status: "needs_reconnect",
            account: current.account,
            capabilities: deriveFabricCapabilities(current.account),
            lastValidatedAt: current.lastValidatedAt,
          };
        }
        if (isAuvexisAccountsError(error, "unavailable")) {
          return safeStatus(current);
        }
        throw error;
      }
    },

    async emitProductEvent(
      input: EmitAuvexisProductEventInput,
    ): Promise<AuvexisProductEventResult> {
      const current = options.storage?.read?.() ?? disconnectedConnection();
      if (
        current.status !== "connected" ||
        !current.account ||
        !current.tokens
      ) {
        throw new Error("AUVEXIS_ACCOUNT_NOT_CONNECTED");
      }
      if (!options.client.emitProductEvent) {
        throw new Error("AUVEXIS_OAUTH_CLIENT_INCOMPLETE");
      }

      const event = buildProductEvent(input, current.account.id);
      try {
        const skipped = await precheckProductEvent({
          client: options.client,
          accessToken: current.tokens.accessToken,
          event,
        });
        if (skipped) return skipped;
        return await options.client.emitProductEvent(
          current.tokens.accessToken,
          event,
        );
      } catch (error) {
        if (
          isAuvexisAccountsError(error, "reauth_required") &&
          current.tokens.refreshToken &&
          options.client.refresh
        ) {
          const refreshed = await options.client.refresh(
            current.tokens.refreshToken,
          );
          const tokens = mapTokensToStoredTokens(refreshed);
          options.storage?.saveConnected({
            account: current.account,
            tokens,
          });
          const skipped = await precheckProductEvent({
            client: options.client,
            accessToken: tokens.accessToken,
            event,
          });
          if (skipped) return skipped;
          return await options.client.emitProductEvent(tokens.accessToken, event);
        }
        if (isAuvexisAccountsError(error, "reauth_required")) {
          options.storage?.markNeedsReconnect?.();
        }
        throw error;
      }
    },

    async logoutLocal(): Promise<{ status: "disconnected" }> {
      options.storage?.clearLocal?.();
      return { status: "disconnected" };
    },

    async revokeRemote(): Promise<{ status: "disconnected" }> {
      const current = options.storage?.read?.() ?? disconnectedConnection();
      const token = current.tokens?.refreshToken ?? current.tokens?.accessToken;
      if (token && options.client.revoke) {
        await options.client.revoke(token);
      }
      options.storage?.clearLocal?.();
      return { status: "disconnected" };
    },
  };
}

async function precheckProductEvent(input: {
  client: AuvexisAccountsClient;
  accessToken: string;
  event: AuvexisProductEventInput;
}): Promise<AuvexisProductEventResult | null> {
  if (!input.client.getProductCampaignStatuses) return null;
  const statuses = await input.client.getProductCampaignStatuses(
    input.accessToken,
    input.event.type,
  );
  const skipped = statuses.find(
    (campaign) => campaign.claimed || campaign.capacityReached,
  );
  if (!skipped) return null;
  return productEventResultFromCampaignStatus(input.event.eventId, skipped);
}

function productEventResultFromCampaignStatus(
  eventId: string,
  campaign: AuvexisProductCampaignStatus,
): AuvexisProductEventResult {
  return {
    eventId,
    productId: campaign.productId,
    status: "accepted",
    outcomes: [
      {
        campaignId: campaign.id,
        outcome: campaign.claimed ? "already_claimed" : "ineligible",
        reason: campaign.claimed ? null : "capacity_reached",
      },
    ],
  };
}

function buildProductEvent(
  input: EmitAuvexisProductEventInput,
  accountId: string,
): AuvexisProductEventInput {
  return {
    eventId:
      input.eventId ??
      `fabric.event:${input.type}:${crypto.randomUUID()}:${accountId}`,
    type: input.type,
    userId: accountId,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    ...(input.evidence ? { evidence: input.evidence } : {}),
  };
}

function serializeAuthorizationTransaction(
  transaction: AuthorizationTransaction,
): AuvexisAccountLinkAuthorization {
  return {
    authorizationUrl: transaction.authorizationUrl.toString(),
    state: transaction.state,
    nonce: transaction.nonce,
    codeVerifier: transaction.codeVerifier,
    createdAt: transaction.createdAt,
  };
}

function mapProfileToStoredAccount(
  profile: AuvexisProfile,
): StoredAuvexisAccount {
  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    ...(profile.email ? { email: profile.email } : {}),
    badges: profile.badges,
  };
}

function mapTokensToStoredTokens(
  tokens: AuvexisTokenSet,
): StoredAuvexisTokenSet {
  return {
    accessToken: tokens.accessToken,
    ...(tokens.refreshToken ? { refreshToken: tokens.refreshToken } : {}),
    ...(tokens.idToken ? { idToken: tokens.idToken } : {}),
    tokenType: tokens.tokenType,
    scope: tokens.scope,
    ...(tokens.expiresAt ? { expiresAt: tokens.expiresAt } : {}),
  };
}

function safeStatus(
  connection: AuvexisAccountConnection,
): AuvexisAccountStatusResult {
  return {
    status: connection.status,
    account: connection.account,
    capabilities: deriveFabricCapabilities(connection.account),
    lastValidatedAt: connection.lastValidatedAt,
  };
}

function deriveFabricCapabilities(
  account: StoredAuvexisAccount | null,
): StoredAuvexisCapabilities {
  const fabricPermissions = account?.badges.reduce<Record<string, boolean>>(
    (merged, badge) => ({
      ...merged,
      ...(badge.permissions?.fabric ?? {}),
    }),
    {},
  );
  return {
    canUseDonatorTheme: fabricPermissions?.grantDonatorTheme === true,
    canCreateMoreThan6Workflows:
      fabricPermissions?.createMoreThan6Workflows === true,
  };
}

function disconnectedConnection(): AuvexisAccountConnection {
  return {
    version: 1,
    status: "disconnected",
    account: null,
    tokens: null,
    connectedAt: null,
    updatedAt: new Date(0).toISOString(),
    lastValidatedAt: null,
  };
}

function isAuvexisAccountsError(
  error: unknown,
  code: AuvexisAccountsErrorCode,
): error is Error & { code: AuvexisAccountsErrorCode } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  );
}
