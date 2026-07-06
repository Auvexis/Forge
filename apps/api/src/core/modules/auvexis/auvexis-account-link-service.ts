import type {
  AuthorizationTransaction,
  AuvexisAccountsErrorCode,
  AuvexisProfile,
  AuvexisTokenSet,
  createAuvexisAccountsClient,
} from "@auvexis/accounts";
import type {
  AuvexisAccountConnection,
  AuvexisAccountConnectionStatus,
  StoredAuvexisAccount,
  StoredAuvexisTokenSet,
} from "./auvexis-account-storage.ts";

type AuvexisAccountsClient = Pick<
  ReturnType<typeof createAuvexisAccountsClient>,
  "createAuthorization"
> &
  Partial<
    Pick<
      ReturnType<typeof createAuvexisAccountsClient>,
      "exchangeCode" | "getProfile"
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

export interface AuvexisAccountStatusResult {
  status: AuvexisAccountConnectionStatus;
  account: StoredAuvexisAccount | null;
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

    async getStatus(): Promise<AuvexisAccountStatusResult> {
      const current = options.storage?.read?.() ?? disconnectedConnection();
      if (
        current.status !== "connected" ||
        !current.tokens ||
        !options.client.getProfile
      ) {
        return safeStatus(current);
      }

      try {
        const profile = await options.client.getProfile(current.tokens.accessToken);
        const account = mapProfileToStoredAccount(profile);
        options.storage?.markValidated?.({ account });
        return {
          status: "connected",
          account,
          lastValidatedAt: new Date().toISOString(),
        };
      } catch (error) {
        if (isAuvexisAccountsError(error, "reauth_required")) {
          options.storage?.markNeedsReconnect?.();
          return {
            status: "needs_reconnect",
            account: current.account,
            lastValidatedAt: current.lastValidatedAt,
          };
        }
        if (isAuvexisAccountsError(error, "unavailable")) {
          return safeStatus(current);
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

function mapProfileToStoredAccount(profile: AuvexisProfile): StoredAuvexisAccount {
  return {
    id: profile.id,
    username: profile.username,
    ...(profile.email ? { email: profile.email } : {}),
    badges: profile.badges,
  };
}

function mapTokensToStoredTokens(tokens: AuvexisTokenSet): StoredAuvexisTokenSet {
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
    lastValidatedAt: connection.lastValidatedAt,
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
