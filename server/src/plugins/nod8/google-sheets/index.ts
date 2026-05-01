import type {
  Nod8Plugin,
  OAuth2Provider,
  PluginManifest,
} from "../../../shared/models/plugin-types.ts";
import manifest from "./manifest.json" with { type: "json" };
import { createGoogleSheetsMethods } from "./methods.ts";
import { google } from "googleapis";

// ──────────── OAuth2 Provider ────────────

const auth: OAuth2Provider = {
  type: "oauth2",

  credentialSchema: {
    client_id: {
      type: "string",
      inputType: "text",
      label: "Client ID",
      required: true,
      description: "From Google Cloud Console > APIs & Services > Credentials",
    },
    client_secret: {
      type: "string",
      inputType: "password",
      label: "Client Secret",
      required: true,
    },
  },

  scopes: [
    "https://www.googleapis.com/auth/spreadsheets", // Required for read/write on sheets
    "https://www.googleapis.com/auth/drive.readonly", // Required for listing spreadsheets
  ],

  getAuthUrl(credentials, redirectUri) {
    const oauth2Client = new google.auth.OAuth2(
      credentials.client_id,
      credentials.client_secret,
      redirectUri,
    );

    return oauth2Client.generateAuthUrl({
      access_type: "offline", // Essential to get a refresh_token
      scope: this.scopes,
      prompt: "consent", // Force consent to ensure refresh_token is provided
    });
  },

  async exchangeCode(code, credentials, redirectUri) {
    const oauth2Client = new google.auth.OAuth2(
      credentials.client_id,
      credentials.client_secret,
      redirectUri,
    );

    const { tokens } = await oauth2Client.getToken(code);

    return {
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token!,
      expires_at: tokens.expiry_date!,
      token_type: tokens.token_type!,
      scope: tokens.scope!,
      raw: tokens,
    };
  },

  async testConnection(tokens, credentials) {
    const oauth2Client = new google.auth.OAuth2(
      credentials.client_id,
      credentials.client_secret,
    );

    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });

    const sheets = google.sheets({ version: "v4", auth: oauth2Client });
    
    try {
      // Test the token by fetching user profile info (simplest call)
      const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
      await oauth2.userinfo.get();
      return true;
    } catch (error) {
      return false;
    }
  },

  async refreshTokens(tokens, credentials) {
    if (!tokens.refresh_token) {
      throw new Error("Cannot refresh: no refresh_token available.");
    }

    const oauth2Client = new google.auth.OAuth2(
      credentials.client_id,
      credentials.client_secret,
    );

    oauth2Client.setCredentials({
      refresh_token: tokens.refresh_token,
    });

    const res = await oauth2Client.refreshAccessToken();
    const newTokens = res.credentials;

    return {
      access_token: newTokens.access_token!,
      // Keep the old refresh token if a new one wasn't returned
      refresh_token: newTokens.refresh_token || tokens.refresh_token,
      expires_at: newTokens.expiry_date!,
      token_type: newTokens.token_type!,
      scope: newTokens.scope!,
      raw: newTokens,
    };
  },
};

// ──────────── Plugin Definition ────────────

const GoogleSheetsPlugin: Nod8Plugin = {
  id: "google-sheets",
  manifest: manifest as PluginManifest,
  auth,
  methods: createGoogleSheetsMethods(),
};

export default GoogleSheetsPlugin;
