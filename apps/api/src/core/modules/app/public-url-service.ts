import { AppRepository } from "./app-repository.ts";

export interface PublicUrlConfig {
  publicUrl: string;
  source: "setting" | "env" | "default";
  pendingPublicUrl: string | null;
  locked: boolean;
  restartRequired: boolean;
}

export interface SavePublicUrlResult {
  publicUrl: string;
  pendingPublicUrl: string;
  restartRequired: true;
}

const DEFAULT_PORT = 23801;
const PUBLIC_URL_SETTING = "public_url";
const PENDING_PUBLIC_URL_SETTING = "public_url_pending";

function serverPort(): number {
  return process.env.PORT ? parseInt(process.env.PORT) : DEFAULT_PORT;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function envPublicUrl(): string | null {
  const value = process.env.FABRIC_PUBLIC_URL?.trim() || process.env.PUBLIC_URL?.trim();
  return value ? normalizePublicUrl(value) : null;
}

function isPublicUrlLocked(): boolean {
  return process.env.FABRIC_PUBLIC_URL_LOCKED === "true";
}

function normalizePublicUrl(value: string): string {
  const parsed = new URL(value.trim());
  return trimTrailingSlash(parsed.origin);
}

function isLocalHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".localhost") ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}

function validatePublicUrl(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Public URL is required.");
  }

  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new Error("Public URL must be a valid absolute URL.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Public URL must use http or https.");
  }

  if (parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error("Public URL must contain only protocol, host and optional port.");
  }

  if (parsed.protocol !== "https:" && !isLocalHostname(parsed.hostname)) {
    throw new Error("Public URL must use HTTPS outside localhost or private LAN addresses.");
  }

  return trimTrailingSlash(parsed.origin);
}

function settingValue(key: string): string | null {
  const value = AppRepository.getSetting(key);
  return typeof value === "string" && value.trim() ? normalizePublicUrl(value) : null;
}

function defaultPublicUrl(): string {
  return `http://localhost:${serverPort()}`;
}

export const PublicUrlService = {
  settingKey: PUBLIC_URL_SETTING,
  pendingSettingKey: PENDING_PUBLIC_URL_SETTING,

  applyPendingOnStartup(): void {
    if (isPublicUrlLocked()) {
      AppRepository.deleteSetting(PENDING_PUBLIC_URL_SETTING);
      return;
    }

    const pending = settingValue(PENDING_PUBLIC_URL_SETTING);
    if (!pending) return;

    AppRepository.setSetting(PUBLIC_URL_SETTING, pending);
    AppRepository.deleteSetting(PENDING_PUBLIC_URL_SETTING);
  },

  getConfig(): PublicUrlConfig {
    const locked = isPublicUrlLocked();
    const env = envPublicUrl();
    const setting = locked ? null : settingValue(PUBLIC_URL_SETTING);
    const pending = locked ? null : settingValue(PENDING_PUBLIC_URL_SETTING);

    return {
      publicUrl: setting ?? env ?? defaultPublicUrl(),
      source: setting ? "setting" : env ? "env" : "default",
      pendingPublicUrl: pending,
      locked,
      restartRequired: Boolean(pending),
    };
  },

  getPublicUrl(): string {
    return this.getConfig().publicUrl;
  },

  getSettingsValue(): string {
    const config = this.getConfig();
    return config.pendingPublicUrl ?? config.publicUrl;
  },

  isLocalUrl(value: string): boolean {
    try {
      return isLocalHostname(new URL(value).hostname);
    } catch {
      return true;
    }
  },

  allowedOrigins(extraOrigins: string[] = []): string[] {
    return Array.from(new Set([this.getPublicUrl(), ...extraOrigins].filter(Boolean).map(trimTrailingSlash)));
  },

  savePending(value: unknown): SavePublicUrlResult {
    if (isPublicUrlLocked()) {
      throw new Error("Public URL is locked by FABRIC_PUBLIC_URL_LOCKED.");
    }

    const nextPublicUrl = validatePublicUrl(value);
    AppRepository.setSetting(PENDING_PUBLIC_URL_SETTING, nextPublicUrl);

    return {
      publicUrl: this.getPublicUrl(),
      pendingPublicUrl: nextPublicUrl,
      restartRequired: true,
    };
  },

  validate: validatePublicUrl,
};
