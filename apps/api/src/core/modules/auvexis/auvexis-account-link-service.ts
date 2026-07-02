import type {
  AuthorizationTransaction,
  AuvexisProfile,
  AuvexisTokenSet,
  createAuvexisAccountsClient,
} from "@auvexis/accounts";
import type {
  StoredAuvexisAccount,
  StoredAuvexisTokenSet,
} from "./auvexis-account-storage.ts";

type AuvexisAccountsClient = Pick<
  ReturnType<typeof createAuvexisAccountsClient>,
  "createAuthorization"
> &
  Partial<
    Pick<ReturnType<typeof createAuvexisAccountsClient>, "exchangeCode" | "getProfile">
  >;

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
  saveConnected(input: {
    account: StoredAuvexisAccount;
    tokens: StoredAuvexisTokenSet;
  }): void;
}

export interface CompleteAuvexisCallbackInput {
  profileId: string;
  callbackUrl: string;
  state: string;
}

export function createAuvexisAccountLinkService(
  options: AuvexisAccountLinkServiceOptions,
) {
  return {
    async createAuthorization(
      input: CreateAuvexisAccountLinkInput,
    ): Promise<AuvexisAccountLinkAuthorization> {
      const transaction = await options.client.createAuthorization({
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
