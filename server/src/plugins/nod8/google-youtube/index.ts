import { google } from "googleapis";
import type {
  Nod8Plugin,
  OAuth2Provider,
  PluginManifest,
} from "../../../shared/models/plugin-types.ts";
import manifest from "./manifest.json" with { type: "json" };
import { createGoogleYoutubeMethods } from "./methods.ts";

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

  scopes: [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.force-ssl",
  ],

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
    const yt = google.youtube({ version: "v3", auth: client });
    await yt.channels.list({ part: ["snippet"], mine: true });
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

const GoogleYoutubePlugin: Nod8Plugin = {
  id: "google-youtube",
  auth,
  manifest: manifest as PluginManifest,
  methods: createGoogleYoutubeMethods(),
};

export default GoogleYoutubePlugin;
