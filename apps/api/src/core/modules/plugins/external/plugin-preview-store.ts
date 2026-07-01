import fs from "node:fs";
import { randomUUID } from "node:crypto";
import type { PluginManifestPreview } from "../plugin-manifest-preview.ts";
import type { ExternalPluginPreview, LocatedPluginRelease, PluginInstallSourceMetadata } from "./types.ts";

export interface PluginPreviewStoreOptions {
  ttlMs?: number;
  now?: () => Date;
}

export interface CreatePluginPreviewInput {
  localPath: string;
  preview: PluginManifestPreview;
  release: LocatedPluginRelease | null;
  source: PluginInstallSourceMetadata;
}

type StoredPreview = ExternalPluginPreview & { localPath: string };

export class PluginPreviewStore {
  private readonly previews = new Map<string, StoredPreview>();
  private readonly ttlMs: number;
  private readonly now: () => Date;

  constructor(options: PluginPreviewStoreOptions = {}) {
    this.ttlMs = options.ttlMs ?? 15 * 60 * 1000;
    this.now = options.now ?? (() => new Date());
  }

  create(input: CreatePluginPreviewInput): ExternalPluginPreview {
    const createdAt = this.now();
    const previewId = randomUUID();
    const stored: StoredPreview = {
      previewId,
      status: input.preview.valid ? "ready" : "invalid",
      manifest: input.preview.manifest,
      methodNames: input.preview.methodNames,
      triggerNames: input.preview.triggerNames,
      authType: input.preview.authType,
      warnings: input.preview.warnings,
      errors: input.preview.errors,
      release: input.release,
      source: input.source,
      createdAt: createdAt.toISOString(),
      expiresAt: new Date(createdAt.getTime() + this.ttlMs).toISOString(),
      localPath: input.localPath,
    };

    this.previews.set(previewId, stored);
    return this.publicPreview(stored);
  }

  get(previewId: string, now = this.now()): ExternalPluginPreview | null {
    const preview = this.previews.get(previewId);
    if (!preview) return null;
    if (Date.parse(preview.expiresAt) <= now.getTime()) {
      this.remove(previewId);
      return null;
    }

    return this.publicPreview(preview);
  }

  getLocalPath(previewId: string, now = this.now()): string | null {
    const preview = this.get(previewId, now);
    if (!preview) return null;
    return this.previews.get(previewId)?.localPath ?? null;
  }

  remove(previewId: string): boolean {
    const preview = this.previews.get(previewId);
    if (!preview) return false;
    fs.rmSync(preview.localPath, { recursive: true, force: true });
    return this.previews.delete(previewId);
  }

  expireOld(now = this.now()): void {
    for (const preview of this.previews.values()) {
      if (Date.parse(preview.expiresAt) <= now.getTime()) {
        this.remove(preview.previewId);
      }
    }
  }

  private publicPreview(preview: StoredPreview): ExternalPluginPreview {
    const { localPath: _localPath, ...publicPreview } = preview;
    return publicPreview;
  }
}

export const externalPluginPreviewStore = new PluginPreviewStore();
