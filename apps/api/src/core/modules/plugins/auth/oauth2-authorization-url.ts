export function validateOAuth2AuthorizationUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("OAuth provider returned an invalid authorization URL");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("OAuth provider authorization URL must use HTTP(S)");
  }
  return url.toString();
}
