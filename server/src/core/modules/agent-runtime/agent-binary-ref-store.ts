export interface AgentBinaryRef {
  type: "Buffer" | "Readable" | "Base64";
  ref: string;
  size?: number;
  mimeType?: string;
}

export interface StoredAgentBinaryRef extends AgentBinaryRef {
  value: unknown;
  createdAt: number;
}

export class AgentBinaryRefStore {
  private readonly ttlMs: number;
  private readonly maxRefs: number;
  private readonly now: () => number;
  private readonly refs = new Map<string, StoredAgentBinaryRef>();

  constructor(options: { ttlMs?: number; maxRefs?: number; now?: () => number } = {}) {
    this.ttlMs = options.ttlMs ?? 10 * 60 * 1000;
    this.maxRefs = options.maxRefs ?? 100;
    this.now = options.now ?? Date.now;
  }

  put(input: {
    toolCallId: string;
    path: string;
    type: AgentBinaryRef["type"];
    value: unknown;
    size?: number;
    mimeType?: string;
  }): AgentBinaryRef {
    this.pruneExpired();
    if (this.refs.size >= this.maxRefs) {
      throw new Error("Agent binary ref limit exceeded");
    }

    const ref = `agent-ref://${input.toolCallId}/${input.path}`;
    const lightweight: AgentBinaryRef = {
      type: input.type,
      ref,
      ...(input.size !== undefined ? { size: input.size } : {}),
      ...(input.mimeType ? { mimeType: input.mimeType } : {}),
    };

    this.refs.set(ref, {
      ...lightweight,
      value: input.value,
      createdAt: this.now(),
    });

    return lightweight;
  }

  get(ref: string): StoredAgentBinaryRef | null {
    const stored = this.refs.get(ref);
    if (!stored) return null;
    if (this.isExpired(stored)) {
      this.refs.delete(ref);
      return null;
    }
    return stored;
  }

  private pruneExpired(): void {
    for (const [ref, stored] of this.refs) {
      if (this.isExpired(stored)) this.refs.delete(ref);
    }
  }

  private isExpired(stored: StoredAgentBinaryRef): boolean {
    return this.now() - stored.createdAt > this.ttlMs;
  }
}
