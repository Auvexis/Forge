import type { AgentCommitmentPart } from "../session/agent-session-contracts.ts";

export interface TurnCommitmentInput {
  id: string;
  description: string;
  status?: "pending" | "completed" | "failed";
  evidencePartIds?: string[];
}

export class TurnCommitmentLedger {
  private readonly items: AgentCommitmentPart["items"];

  constructor(commitments: TurnCommitmentInput[]) {
    const ids = new Set<string>();
    this.items = commitments.map((commitment, index) => {
      const id = normalizeId(commitment.id, index);
      if (ids.has(id)) throw new Error(`Duplicate turn commitment: ${id}`);
      ids.add(id);
      const description = commitment.description.trim();
      if (!description) throw new Error(`Turn commitment ${id} has no description`);
      return {
        id,
        description,
        status: commitment.status ?? "pending",
        evidencePartIds: [...(commitment.evidencePartIds ?? [])],
      };
    });
  }

  get snapshot(): AgentCommitmentPart["items"] {
    return structuredClone(this.items);
  }

  get pending(): AgentCommitmentPart["items"] {
    return this.snapshot.filter((item) => item.status === "pending");
  }

  get isComplete(): boolean {
    return this.items.every((item) => item.status === "completed");
  }

  recordEvidence(commitmentIds: string[], evidencePartId: string): void {
    if (!evidencePartId.trim()) throw new Error("Commitment evidence part is required");
    for (const id of new Set(commitmentIds)) {
      const item = this.require(id);
      if (item.status === "failed") throw new Error(`Failed commitment cannot complete: ${id}`);
      if (!item.evidencePartIds.includes(evidencePartId)) {
        item.evidencePartIds.push(evidencePartId);
      }
      item.status = "completed";
    }
  }

  fail(commitmentIds: string[]): void {
    for (const id of new Set(commitmentIds)) {
      const item = this.require(id);
      if (item.status !== "completed") item.status = "failed";
    }
  }

  private require(id: string) {
    const item = this.items.find((candidate) => candidate.id === id);
    if (!item) throw new Error(`Unknown turn commitment: ${id}`);
    return item;
  }
}

function normalizeId(value: string, index: number): string {
  const normalized = String(value || `commitment_${index + 1}`)
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 80);
  return normalized || `commitment_${index + 1}`;
}
