import type { HttpNode } from "../../../shared/models/workflow-types.ts";
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), node.timeout ?? 30000);

  try {
    const response = await fetch(resolvedUrl, {
      method: node.method,
      headers: resolvedHeaders,
      body: bodyPayload,
      redirect: node.followRedirects !== false ? "follow" : "manual",
      signal: controller.signal,
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

    return {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
      data: responseData,
    };
  } finally {
    clearTimeout(timeoutId);
  }
});
