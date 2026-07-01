import type { OAuth2Provider, PluginManifest, SailorPlugin } from "@auvexis/sailor-sdk";
import { google } from "googleapis";
import manifest from "./manifest.json" with { type: "json" };
import { createGoogleCalendarMethods } from "./methods.ts";

const scopes = ["https://www.googleapis.com/auth/calendar"];

const auth: OAuth2Provider = {
  type: "oauth2",

  credentialSchema: {
    client_id: { type: "string", inputType: "text", label: "Client ID", required: true },
    client_secret: { type: "string", inputType: "password", label: "Client Secret", required: true },
  },

  scopes,

  ui: {
    oauthCallbackInstructions: "In Google Cloud Console, add the URL above as an Authorized redirect URI.",
    buttonText: "Sign in with Google",
    buttonIcon: "https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg",
  },

  getAuthUrl(credentials, redirectUri) {
    const oauth2Client = new google.auth.OAuth2(credentials.client_id, credentials.client_secret, redirectUri);
    return oauth2Client.generateAuthUrl({ access_type: "offline", scope: this.scopes, prompt: "consent" });
  },

  async exchangeCode(code, credentials, redirectUri) {
    const oauth2Client = new google.auth.OAuth2(credentials.client_id, credentials.client_secret, redirectUri);
    const { tokens } = await oauth2Client.getToken(code);
    return {
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token!,
      expires_at: tokens.expiry_date!,
      token_type: tokens.token_type!,
      scope: tokens.scope!,
      raw: tokens as Record<string, unknown>,
    };
  },

  async testConnection(tokens, credentials) {
    const oauth2Client = new google.auth.OAuth2(credentials.client_id, credentials.client_secret);
    oauth2Client.setCredentials({ access_token: tokens.access_token, refresh_token: tokens.refresh_token });
    try {
      await google.calendar({ version: "v3", auth: oauth2Client }).calendarList.list({ maxResults: 1 });
      return true;
    } catch {
      return false;
    }
  },

  async refreshTokens(tokens, credentials) {
    if (!tokens.refresh_token) throw new Error("Cannot refresh: no refresh_token available.");
    const oauth2Client = new google.auth.OAuth2(credentials.client_id, credentials.client_secret);
    oauth2Client.setCredentials({ refresh_token: tokens.refresh_token });
    const res = await oauth2Client.refreshAccessToken();
    const newTokens = res.credentials;
    return {
      access_token: newTokens.access_token!,
      refresh_token: newTokens.refresh_token || tokens.refresh_token,
      expires_at: newTokens.expiry_date!,
      token_type: newTokens.token_type!,
      scope: newTokens.scope!,
      raw: newTokens as Record<string, unknown>,
    };
  },
};

const GoogleCalendarPlugin: SailorPlugin = {
  id: "google-calendar",
  manifest: manifest as PluginManifest,
  auth,
  methods: createGoogleCalendarMethods(),
};

export default GoogleCalendarPlugin;
