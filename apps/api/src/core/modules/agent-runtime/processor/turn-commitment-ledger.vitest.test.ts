import { describe, expect, it } from "vitest";
import { TurnCommitmentLedger } from "./turn-commitment-ledger.ts";

describe("TurnCommitmentLedger", () => {
  it("requires durable evidence before a commitment is complete", () => {
    const ledger = new TurnCommitmentLedger([
      { id: "download", description: "Download X.mp4" },
      { id: "email", description: "Send X.mp4 to Y" },
    ]);

    expect(ledger.isComplete).toBe(false);
    ledger.recordEvidence(["download"], "part_download");
    expect(ledger.pending.map((item) => item.id)).toEqual(["email"]);
    ledger.recordEvidence(["email"], "part_email");

    expect(ledger.isComplete).toBe(true);
    expect(ledger.snapshot).toEqual([
      expect.objectContaining({
        id: "download",
        status: "completed",
        evidencePartIds: ["part_download"],
      }),
      expect.objectContaining({
        id: "email",
        status: "completed",
        evidencePartIds: ["part_email"],
      }),
    ]);
  });

  it("rejects unknown commitments and duplicate identities", () => {
    expect(() => new TurnCommitmentLedger([
      { id: "same", description: "One" },
      { id: "same", description: "Two" },
    ])).toThrow(/Duplicate/);
    const ledger = new TurnCommitmentLedger([{ id: "known", description: "Known" }]);
    expect(() => ledger.recordEvidence(["unknown"], "part_1")).toThrow(/Unknown/);
  });
});
