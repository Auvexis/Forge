import type {
  SailorPlugin,
  OAuth2Provider,
  PluginManifest,
} from "@auvexis/sailor-sdk";
import { google } from "googleapis";
import manifest from "./manifest.json" with { type: "json" };
import { createGoogleGmailMethods } from "./methods.ts";

// ──────────── OAuth2 Provider ────────────

const auth: OAuth2Provider = {
  type: "oauth2",

  credentialSchema: {
    client_id: {
      type: "string",
      inputType: "text",
      label: "Client ID",
      description: "Google Cloud OAuth2 Client ID",
      required: true,
      placeholder: "xxxx.apps.googleusercontent.com",
    },
    client_secret: {
      type: "string",
      inputType: "password",
      label: "Client Secret",
      description: "Google Cloud OAuth2 Client Secret",
      required: true,
    },
  },

  scopes: ["https://mail.google.com/"],

  ui: {
    oauthCallbackInstructions: "In Google Cloud Console, add the URL above as an Authorized redirect URI in your OAuth client credentials.",
    buttonText: "Sign in with Google",
    buttonIcon: "https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg",
  },

  getAuthUrl(credentials, redirectUri) {
    const client = new google.auth.OAuth2(
      credentials.client_id,
      credentials.client_secret,
      redirectUri,
    );
    return client.generateAuthUrl({
      access_type: "offline",
      scope: this.scopes,
      prompt: "consent",
    });
  },

  async exchangeCode(code, credentials, redirectUri) {
    const client = new google.auth.OAuth2(
      credentials.client_id,
      credentials.client_secret,
      redirectUri,
    );
    const { tokens } = await client.getToken(code);
    return {
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token ?? undefined,
      expires_at: tokens.expiry_date ?? undefined,
      token_type: tokens.token_type ?? undefined,
      scope: tokens.scope ?? undefined,
    };
  },

  async testConnection(tokens) {
    const client = new google.auth.OAuth2();
    client.setCredentials({ access_token: tokens.access_token });
    const gmail = google.gmail({ version: "v1", auth: client });
    await gmail.users.getProfile({ userId: "me" });
    return true;
  },

  async refreshTokens(tokens, credentials) {
    const client = new google.auth.OAuth2(
      credentials.client_id,
      credentials.client_secret,
    );
    client.setCredentials({
      refresh_token: tokens.refresh_token,
    });
    const { credentials: newCreds } = await client.refreshAccessToken();
    return {
      access_token: newCreds.access_token!,
      refresh_token: newCreds.refresh_token ?? tokens.refresh_token,
      expires_at: newCreds.expiry_date ?? undefined,
      token_type: newCreds.token_type ?? tokens.token_type,
      scope: newCreds.scope ?? tokens.scope,
    };
  },
};

// ──────────── Plugin Definition ────────────

const GoogleGmailPlugin: SailorPlugin = {
  id: "google-gmail",
  manifest: manifest as PluginManifest,
  auth,
  methods: createGoogleGmailMethods(),
};

export default GoogleGmailPlugin;
