import type { HttpNode } from "../../../shared/models/workflow-types.ts";
import { runExternalIO } from "../../modules/workflows/external-io-runner.ts";
import { WorkflowParser } from "../../modules/workflows/parser.ts";
import { createNodeHandler } from "../handler.ts";

export const httpNodeHandler = createNodeHandler<HttpNode>("http", async ({ node, context }) => {
  const resolvedUrl = WorkflowParser.evalParams({ url: node.url }, context).url as string;

  const resolvedHeaders: Record<string, string> = {};
  if (node.headers) {
    const cooked = WorkflowParser.evalParams(node.headers, context);
    for (const [key, value] of Object.entries(cooked)) {
      resolvedHeaders[key] = String(value);
    }
  }

  let bodyPayload: string | undefined;
  if (node.body && node.method !== "GET") {
    const cooked = WorkflowParser.evalParams({ body: node.body }, context);
    const body = String(cooked.body ?? "");

    if (node.bodyType === "json" || !node.bodyType) {
      resolvedHeaders["Content-Type"] = resolvedHeaders["Content-Type"] ?? "application/json";
      try {
        bodyPayload = JSON.stringify(JSON.parse(body));
      } catch {
        bodyPayload = body;
      }
    } else if (node.bodyType === "form") {
      resolvedHeaders["Content-Type"] =
        resolvedHeaders["Content-Type"] ?? "application/x-www-form-urlencoded";
      bodyPayload = body;
    } else {
      bodyPayload = body;
    }
  }

  return runExternalIO({
    label: `HTTP ${node.method} ${resolvedUrl}`,
    timeoutMs: node.timeout ?? 30000,
    operation: async ({ signal }) => {
    const response = await fetch(resolvedUrl, {
      method: node.method,
      headers: resolvedHeaders,
      body: bodyPayload,
      redirect: node.followRedirects !== false ? "follow" : "manual",
      signal,
    });

    const contentType = response.headers.get("content-type") ?? "";
    let responseData: any;

    if (node.responseType === "binary") {
      const buffer = Buffer.from(await response.arrayBuffer());
      responseData = {
        content: buffer,
        mimeType: contentType || "application/octet-stream",
        size: buffer.length,
      };
    } else if (node.responseType === "text") {
      responseData = await response.text();
    } else if (contentType.includes("application/json")) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    if (!response.ok) {
      const bodyPreview =
        typeof responseData === "string"
          ? responseData.slice(0, 500)
          : JSON.stringify(responseData).slice(0, 500);
      throw new Error(
        `HTTP request failed with status ${response.status} ${response.statusText}${
          bodyPreview ? `: ${bodyPreview}` : ""
        }`,
      );
    }

    return {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
      data: responseData,
    };
    },
  });
}, {
  description: "Executes an outbound HTTP request and parses the response.",
  execution: "external-io",
  sideEffects: ["network"],
  outputs: [{ id: "default", label: "Response" }],
  errors: ["Request timeout", "Network error", "Response parsing error"],
  usesExternalIO: true,
});
