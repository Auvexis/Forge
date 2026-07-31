import type { AgentContinuationMetadata } from "../engine-protocol/agent-continuation-metadata.ts";
import type {
  AgentContinuationRecord,
  AgentContinuationRepository,
} from "../engine-protocol/agent-continuation-repository.ts";
import type { AgentProviderId } from "../engine-protocol/agent-provider-metadata.ts";
import { AgentProviderContinuationRegistry } from "./agent-provider-continuation-registry.ts";

export class AgentProviderContinuationService {
  constructor(
    private readonly continuations: AgentContinuationRepository,
    private readonly adapters = new AgentProviderContinuationRegistry(),
  ) {}

  capture(input: {
    metadata: AgentContinuationMetadata;
    provider: AgentProviderId;
    providerResponse: unknown;
    expectedRevision?: number;
  }): AgentContinuationRecord {
    const provider = this.adapters.get(input.provider).capture(input.providerResponse);
    const metadata = { ...input.metadata, ...(provider ? { provider } : {}) };
    const current = this.continuations.get(metadata.runId);
    if (!current) return this.continuations.create(metadata);
    return this.continuations.update({
      metadata,
      expectedRevision: input.expectedRevision ?? current.revision,
    });
  }

  restore(runId: string): {
    metadata: AgentContinuationMetadata;
    providerRequest: Record<string, unknown>;
  } | null {
    const record = this.continuations.get(runId);
    if (!record) return null;
    const providerRequest = record.metadata.provider
      ? this.adapters.get(record.metadata.provider.provider).restore(record.metadata.provider)
      : {};
    return { metadata: record.metadata, providerRequest };
  }
}
