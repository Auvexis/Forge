import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateAgentFinalResponse } from "./agent-final-response-generator.ts";

describe("agent final response generator", () => {
  it("generates a short final response from the executed plan summary", async () => {
    const calls: Array<{ messages: Array<{ role: string; content: string }> }> = [];
    const response = await generateAgentFinalResponse({
      model: {
        async generateFinalResponse(input) {
          calls.push(input);
          return "  Done. I downloaded the file and sent the email.  ";
        },
      },
      userMessage: "Download the resume and email it.",
      plan: {
        steps: [
          { id: "search", toolName: "drive_list", params: { query: "resume" }, reason: "Find the file." },
          { id: "send", toolName: "gmail_send", params: { attachment: "$steps.search[0].id" }, reason: "Send it." },
        ],
      },
      execution: {
        status: "success",
        output: { send: { ok: true } },
        outputs: { search: [{ id: "file_1", name: "resume.pdf" }], send: { ok: true } },
        toolCalls: [{ toolCallId: "tool_1", name: "gmail_send", status: "success" }],
        toolCallCount: 2,
        iterationCount: 1,
      },
    });

    assert.equal(response, "Done. I downloaded the file and sent the email.");
    assert.equal(calls.length, 1);
    assert.match(calls[0].messages[0].content, /short natural language/i);
    assert.match(calls[0].messages[1].content, /Download the resume/);
    assert.match(calls[0].messages[1].content, /drive_list/);
    assert.match(calls[0].messages[1].content, /resume.pdf/);
  });
});
