import type {
  AgentProviderContinuationMetadata,
  AgentProviderId,
} from "../engine-protocol/agent-provider-metadata.ts";

export interface AgentProviderContinuationAdapter {
  readonly provider: AgentProviderId;
  capture(response: unknown): AgentProviderContinuationMetadata | undefined;
  restore(metadata: AgentProviderContinuationMetadata): Record<string, unknown>;
  modelVisibleContext(metadata: AgentProviderContinuationMetadata): Record<string, unknown>;
}

export abstract class OpaqueProviderContinuationAdapter
  implements AgentProviderContinuationAdapter {
  abstract readonly provider: AgentProviderId;
  protected abstract capturePayload(response: Record<string, unknown>): Record<string, unknown>;

  capture(response: unknown): AgentProviderContinuationMetadata | undefined {
    if (!isRecord(response)) return undefined;
    const payload = this.capturePayload(response);
    if (Object.keys(payload).length === 0) return undefined;
    return { provider: this.provider, formatVersion: 1, payload };
  }

  restore(metadata: AgentProviderContinuationMetadata): Record<string, unknown> {
    this.assertCompatible(metadata);
    return structuredClone(metadata.payload);
  }

  modelVisibleContext(metadata: AgentProviderContinuationMetadata): Record<string, unknown> {
    this.assertCompatible(metadata);
    return {};
  }

  protected pick(
    source: Record<string, unknown>,
    keys: string[],
  ): Record<string, unknown> {
    return Object.fromEntries(keys.flatMap((key) =>
      source[key] === undefined ? [] : [[key, structuredClone(source[key])]]
    ));
  }

  private assertCompatible(metadata: AgentProviderContinuationMetadata): void {
    if (metadata.provider !== this.provider || metadata.formatVersion !== 1) {
      throw new Error(`Incompatible ${this.provider} continuation metadata`);
    }
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
