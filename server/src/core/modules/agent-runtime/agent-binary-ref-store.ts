export interface AgentBinaryRef {
  type: "Buffer" | "Readable";
  ref: string;
  size?: number;
  mimeType?: string;
}

export interface StoredAgentBinaryRef extends AgentBinaryRef {
  value: unknown;
  createdAt: number;
}

export class AgentBinaryRefStore {
  private readonly refs = new Map<string, StoredAgentBinaryRef>();

  put(input: {
    toolCallId: string;
    path: string;
    type: AgentBinaryRef["type"];
    value: unknown;
    size?: number;
    mimeType?: string;
  }): AgentBinaryRef {
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
      createdAt: Date.now(),
    });

    return lightweight;
  }

  get(ref: string): StoredAgentBinaryRef | null {
    return this.refs.get(ref) ?? null;
  }
}
