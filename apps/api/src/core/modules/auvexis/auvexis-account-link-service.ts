import type {
  AuthorizationTransaction,
  createAuvexisAccountsClient,
} from "@auvexis/accounts";

type AuvexisAccountsClient = Pick<
  ReturnType<typeof createAuvexisAccountsClient>,
  "createAuthorization"
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
      return serializeAuthorizationTransaction(transaction);
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
