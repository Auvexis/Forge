import crypto from "crypto";
import type { FastifyInstance, FastifyReply } from "fastify";
import type { ApiResponse } from "../../shared/models/api-response.model.ts";
import type {
  FormTheme,
  WorkflowItem,
  WorkflowNode,
} from "../../shared/models/workflow-types.ts";
import { WorkflowRepository } from "../modules/workflows/repository.ts";
import {
  WorkflowEngine,
  sanitizeContextForLogging,
} from "../modules/workflows/executor.ts";
import { workflowEventBus } from "../modules/workflows/event-bus.ts";
import {
  InternalEventBus,
  type InternalEvent,
} from "../modules/events/internal-event-bus.ts";
import { CancellationRegistry } from "../modules/workflows/cancellation-registry.ts";
import { PendingWebhookResponseRegistry } from "../modules/workflows/pending-webhook-registry.ts";
import { Scheduler } from "../modules/scheduler/scheduler.ts";
import { PluginManager } from "../modules/plugins/manager.ts";
import { TriggerListenerRegistry } from "../modules/workflows/trigger-listener-registry.ts";
import { WorkflowLifecycleManager } from "../modules/workflows/lifecycle.ts";
import { buildWorkflowSchema } from "../modules/workflows/workflow-schema.ts";
import { validateWorkflowDefinition } from "../modules/workflows/workflow-validation.ts";

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:23802";

// ──────────── Safe SSE serializer ────────────
// Handles circular references and non-JSON-safe values so a bad plugin
// output never silently drops an SSE event.
function safeSerialize(value: unknown): string {
  const seen = new WeakSet();
  return JSON.stringify(value, (_key, val) => {
    if (typeof val === "object" && val !== null) {
      if (seen.has(val)) return "[Circular]";
      seen.add(val);
    }
    // Strip functions, Symbols, Buffers already handled by sanitizeContextForLogging
    if (typeof val === "function") return undefined;
    if (typeof val === "symbol") return val.toString();
    if (typeof val === "bigint") return val.toString();
    return val;
  });
}


// ──────────── Form Trigger helpers ────────────

const VALID_FORM_FIELD_TYPES = new Set([
  "text",
  "email",
  "number",
  "textarea",
  "date",
  "password",
  "file",
]);
const FORM_FIELD_NAME_REGEX = /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/i;
const FORM_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FORM_FIELD_MAX_BYTES = 8 * 1024;
const FORM_RATE_LIMIT_WINDOW_MS = 60_000;
const FORM_RATE_LIMIT_MAX = 30;
const FORM_THEME_TEXT_MAX = 256;
const FORM_THEME_IMAGE_URL_MAX = 2048;
const FORM_THEME_GRADIENT_MAX = 512;

const FORM_THEME_PRESETS = new Set(["default-floating", "minimal-flat", "google-forms"]);
const FORM_THEME_LAYOUTS = new Set(["floating", "flat", "full-width", "centered"]);
const FORM_THEME_BACKGROUND_TYPES = new Set(["solid", "gradient", "image"]);
const FORM_THEME_SHADOWS = new Set(["none", "sm", "md", "lg"]);
const FORM_THEME_BUTTON_WIDTHS = new Set(["auto", "full"]);
const FORM_THEME_BUTTON_SHAPES = new Set(["square", "medium", "pill"]);

interface FormRateBucket { count: number; resetAt: number }
const formRateLimit = new Map<string, FormRateBucket>();

function isFormRateLimited(key: string): boolean {
  const now = Date.now();
  const bucket = formRateLimit.get(key);
  if (!bucket || bucket.resetAt < now) {
    formRateLimit.set(key, { count: 1, resetAt: now + FORM_RATE_LIMIT_WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > FORM_RATE_LIMIT_MAX;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value: unknown): string {
  return escapeHtml(value);
}

interface NormalizedFormField {
  name: string;
  label: string;
  type: "text" | "email" | "number" | "textarea" | "date" | "password" | "file";
  required: boolean;
  placeholder: string;
}

function formPublicId(workflow: WorkflowItem): string {
  return workflow.trigger.formSlug?.trim() || workflow.metadata.id;
}

function resolveFormWorkflow(formId: string, opts: { requireActive: boolean }): WorkflowItem | null {
  const workflows = WorkflowRepository.getWorkflows();
  return workflows.find((workflow) => {
    if (workflow.trigger.type !== "form") return false;
    if (opts.requireActive && !workflow.metadata.isActive) return false;
    return workflow.metadata.id === formId || workflow.trigger.formSlug === formId;
  }) ?? null;
}

function normalizeFormFields(raw: unknown): NormalizedFormField[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((f): f is Record<string, unknown> => !!f && typeof f === "object")
    .map((f) => ({
      name: String(f.name ?? "").trim(),
      label: String(f.label ?? f.name ?? "").trim(),
      type: VALID_FORM_FIELD_TYPES.has(String(f.type))
        ? (f.type as NormalizedFormField["type"])
        : "text",
      required: Boolean(f.required),
      placeholder: String(f.placeholder ?? ""),
    }))
    .filter((f) => f.name.length > 0);
}

function boundedString(value: unknown, max = FORM_THEME_TEXT_MAX): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

function boundedNumber(value: unknown, min: number, max: number): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function enumValue(value: unknown, allowed: Set<string>): string | undefined {
  return typeof value === "string" && allowed.has(value) ? value : undefined;
}

function compactObject<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>;
}

function normalizeFormTheme(raw: unknown): FormTheme {
  const source = raw && typeof raw === "object" ? raw as FormTheme : {};

  return compactObject<FormTheme>({
    preset: enumValue(source.preset, FORM_THEME_PRESETS) as FormTheme["preset"],
    layout: enumValue(source.layout, FORM_THEME_LAYOUTS) as FormTheme["layout"],
    background: compactObject<NonNullable<FormTheme["background"]>>({
      type: enumValue(
        source.background?.type,
        FORM_THEME_BACKGROUND_TYPES,
      ) as NonNullable<FormTheme["background"]>["type"],
      color: boundedString(source.background?.color),
      gradient: boundedString(source.background?.gradient, FORM_THEME_GRADIENT_MAX),
      imageUrl: boundedString(source.background?.imageUrl, FORM_THEME_IMAGE_URL_MAX),
    }),
    container: compactObject<NonNullable<FormTheme["container"]>>({
      backgroundColor: boundedString(source.container?.backgroundColor),
      borderColor: boundedString(source.container?.borderColor),
      borderWidth: boundedNumber(source.container?.borderWidth, 0, 12),
      radius: boundedNumber(source.container?.radius, 0, 48),
      shadow: enumValue(
        source.container?.shadow,
        FORM_THEME_SHADOWS,
      ) as NonNullable<FormTheme["container"]>["shadow"],
      maxWidth: boundedNumber(source.container?.maxWidth, 320, 1200),
      padding: boundedNumber(source.container?.padding, 0, 80),
    }),
    button: compactObject<NonNullable<FormTheme["button"]>>({
      width: enumValue(
        source.button?.width,
        FORM_THEME_BUTTON_WIDTHS,
      ) as NonNullable<FormTheme["button"]>["width"],
      shape: enumValue(
        source.button?.shape,
        FORM_THEME_BUTTON_SHAPES,
      ) as NonNullable<FormTheme["button"]>["shape"],
      backgroundColor: boundedString(source.button?.backgroundColor),
      textColor: boundedString(source.button?.textColor),
      borderColor: boundedString(source.button?.borderColor),
      hoverBackgroundColor: boundedString(source.button?.hoverBackgroundColor),
    }),
    typography: compactObject<NonNullable<FormTheme["typography"]>>({
      fontFamily: boundedString(source.typography?.fontFamily),
      baseSize: boundedNumber(source.typography?.baseSize, 12, 22),
      weight: boundedNumber(source.typography?.weight, 300, 800),
    }),
    fields: compactObject<NonNullable<FormTheme["fields"]>>({
      backgroundColor: boundedString(source.fields?.backgroundColor),
      textColor: boundedString(source.fields?.textColor),
      borderColor: boundedString(source.fields?.borderColor),
      focusColor: boundedString(source.fields?.focusColor),
      radius: boundedNumber(source.fields?.radius, 0, 32),
      spacing: boundedNumber(source.fields?.spacing, 8, 32),
    }),
  });
}

function renderFormPage(
  workflow: WorkflowItem,
  fields: NormalizedFormField[],
  opts: { error?: string; mode?: "test" | "prod" } = {},
): string {
  const trigger = workflow.trigger;
  const title = trigger.formTitle?.trim() || workflow.metadata.name;
  const description = trigger.formDescription?.trim() || "";

  const fieldsHtml = fields
    .map((f) => {
      const labelHtml =
        `<label for="f-${escapeAttr(f.name)}">${escapeHtml(f.label)}` +
        (f.required ? ' <span class="req">*</span>' : "") +
        `</label>`;
      const common =
        `id="f-${escapeAttr(f.name)}" name="${escapeAttr(f.name)}"` +
        (f.required ? " required" : "") +
        (f.placeholder ? ` placeholder="${escapeAttr(f.placeholder)}"` : "");
      const control = f.type === "textarea"
        ? `<textarea ${common} rows="4"></textarea>`
        : `<input type="${escapeAttr(f.type)}" ${common} />`;
      return `<div class="field">${labelHtml}${control}</div>`;
    })
    .join("\n");

  const errorBlock = opts.error
    ? `<div class="error">${escapeHtml(opts.error)}</div>`
    : "";

  const mode = opts.mode ?? "prod";
  const basePath = mode === "test" ? "/forms-test" : "/forms";
  const submitUrl = `${basePath}/${escapeAttr(formPublicId(workflow))}/submit`;

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
  *,*::before,*::after { box-sizing: border-box; }
  body { margin: 0; padding: 32px 16px; font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; background:#0b0d12; color:#e7e9ee; min-height: 100vh; }
  .card { max-width: 540px; margin: 0 auto; background:#141821; border:1px solid #1f2430; border-radius: 12px; padding: 28px 28px 22px; }
  h1 { font-size: 20px; margin: 0 0 6px; color:#f5f6f9; }
  p.desc { color:#9ba3b3; margin: 0 0 22px; font-size: 14px; line-height: 1.55; }
  .field { display:flex; flex-direction:column; gap:6px; margin-bottom:14px; }
  label { font-size: 12px; font-weight: 600; color:#c5cad6; }
  .req { color:#ff6b6b; }
  input, textarea { background:#0b0d12; border:1px solid #2a3142; border-radius: 8px; color:#e7e9ee; font: inherit; padding: 10px 12px; width: 100%; outline: none; transition: border-color .15s; }
  input:focus, textarea:focus { border-color:#7c3aed; }
  textarea { resize: vertical; min-height: 92px; }
  button { background:#7c3aed; border:0; color:#fff; padding:12px 18px; border-radius:8px; font-weight:600; cursor:pointer; width:100%; font-size: 14px; }
  button:hover { background:#6d28d9; }
  .error { background: rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.4); color:#fca5a5; padding: 10px 12px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; }
  .footer { color:#6b7180; font-size: 11px; text-align:center; margin-top:18px; }
</style>
</head><body>
<form class="card" method="POST" action="${escapeAttr(submitUrl)}" enctype="application/x-www-form-urlencoded">
  <h1>${escapeHtml(title)}</h1>
  ${description ? `<p class="desc">${escapeHtml(description)}</p>` : ""}
  ${errorBlock}
  ${fieldsHtml}
  <button type="submit">Submit</button>
  <div class="footer">Powered by Nod8</div>
</form>
</body></html>`;
}

function renderFormConfirmationPage(workflow: WorkflowItem): string {
  const title = workflow.trigger.formTitle?.trim() || workflow.metadata.name;
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)} — Submitted</title>
<style>
  body { margin:0; padding: 64px 16px; font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; background:#0b0d12; color:#e7e9ee; }
  .card { max-width: 480px; margin: 0 auto; background:#141821; border:1px solid #1f2430; border-radius: 12px; padding: 32px; text-align:center; }
  .check { width:48px; height:48px; border-radius: 50%; background: rgba(34,197,94,0.12); display:flex; align-items:center; justify-content:center; margin: 0 auto 16px; color:#4ade80; font-size: 28px; }
  h1 { font-size: 18px; margin: 0 0 8px; }
  p { color:#9ba3b3; margin: 0; font-size: 14px; line-height: 1.55; }
</style>
</head><body>
<div class="card">
  <div class="check">&#10003;</div>
  <h1>Submitted successfully</h1>
  <p>Your form has been received. You may close this page.</p>
</div>
</body></html>`;
}

async function parseFormRequestBody(req: any): Promise<Record<string, unknown>> {
  if (typeof req.isMultipart === "function" && req.isMultipart()) {
    const body: Record<string, unknown> = {};
    for await (const part of req.parts()) {
      if (part.type === "file") {
        const buffer = await part.toBuffer();
        body[part.fieldname] = {
          filename: part.filename,
          mimetype: part.mimetype,
          size: buffer.length,
          buffer,
        };
      } else {
        body[part.fieldname] = part.value;
      }
    }
    return body;
  }

  return (req.body as Record<string, unknown>) ?? {};
}

function formDefinition(workflow: WorkflowItem, mode: "test" | "prod") {
  return {
    id: formPublicId(workflow),
    workflowId: workflow.metadata.id,
    mode,
    title: workflow.trigger.formTitle?.trim() || workflow.metadata.name,
    description: workflow.trigger.formDescription?.trim() || "",
    fields: normalizeFormFields(workflow.trigger.formFields),
    theme: normalizeFormTheme(workflow.trigger.formTheme),
  };
}

// ──────────── Webhook signature validation ────────────

function validateWebhookSignature(
  payload: string,
  secret: string,
  signature: string,
): boolean {
  try {
    const expected =
      "sha256=" +
      crypto.createHmac("sha256", secret).update(payload).digest("hex");
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature),
    );
  } catch {
    return false;
  }
}

export default async function workflowsRoutes(fastify: FastifyInstance) {
  const sendResponse = <T>(reply: FastifyReply, response: ApiResponse<T>) => {
    return reply.code(response.status_code).send(response);
  };

  // ──────────── Webhook Ingress ─ TEST MODE (draft / unpublished) ────────────
  // Executes synchronously and returns the full context state.
  // Useful for debugging from the workflow editor.

  fastify.all("/webhook-test/:webhookPath", async (req, reply) => {
    const { webhookPath } = req.params as { webhookPath: string };

    // ── Listen for Event intercept ─────────────────────────────────
    if (TriggerListenerRegistry.has(webhookPath)) {
      const payload = {
        body: req.body ?? null,
        headers: req.headers,
        query: req.query,
        method: req.method,
        contentType: req.headers["content-type"] ?? "",
        receivedAt: Date.now(),
        identifier: webhookPath,
      };

      const { consumed, workflowId } = TriggerListenerRegistry.consume(webhookPath, payload);
      if (consumed && workflowId) {
        WorkflowRepository.saveLastTriggerPayload(workflowId, payload);
      }
      return reply.code(200).send({ ok: true });
    }
    // ──────────────────────────────────────────────────────────────

    const workflows = WorkflowRepository.getWorkflows();
    const workflow = workflows.find(
      (wf) =>
        (wf.trigger.type === "webhook" || wf.trigger.type === "plugin") &&
        (wf.trigger.webhookSlug === webhookPath ||
          wf.trigger.webhookPath === webhookPath ||
          (wf.trigger.type === "plugin" && wf.metadata.id === webhookPath)),
    );

    if (!workflow) {
      return reply.code(404).send({ error: "Webhook not found" });
    }

    const allowedMethods = workflow.trigger.webhookMethods ?? ["POST"];
    if (!allowedMethods.includes(req.method as any)) {
      return reply
        .code(405)
        .send({ error: `Method ${req.method} not allowed` });
    }

    const triggerPayload = {
      method: req.method,
      headers: req.headers,
      query: req.query,
      body: req.body ?? {},
      ip: req.ip,
      timestamp: Date.now(),
    };

    const executionId = `exec_wh_test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      // Synchronous — await the result so the caller gets the full context
      const result = await WorkflowEngine.executeWorkflow(
        workflow,
        triggerPayload,
        executionId,
      );
      return reply.code(200).send({
        status: "completed",
        executionId,
        context: sanitizeContextForLogging(result as any),
        message: `Test execution of "${workflow.metadata.name}" completed`,
      });
    } catch (err: any) {
      return reply.code(500).send({
        status: "failed",
        executionId,
        error: err.message,
      });
    }
  });

  // ──────────── Webhook Ingress ─ PRODUCTION MODE ────────────
  // Must be registered BEFORE /:workflowId routes to avoid conflicts
  // Resolves webhookSlug first, falls back to webhookPath.

  fastify.all("/webhook/:webhookPath", async (req, reply) => {
    const { webhookPath } = req.params as { webhookPath: string };

    console.log(
      `[NOD8 | WEBHOOK-IN]: ${req.method} /webhook/${webhookPath} — ` +
      `listen-active=${TriggerListenerRegistry.has(webhookPath)} ` +
      `body-keys=${Object.keys((req.body as any) ?? {}).join(",")}`
    );

    // ── Listen for Event intercept ─────────────────────────────────
    if (TriggerListenerRegistry.has(webhookPath)) {
      const payload = {
        body: req.body ?? null,
        headers: req.headers,
        query: req.query,
        method: req.method,
        contentType: req.headers["content-type"] ?? "",
        receivedAt: Date.now(),
        identifier: webhookPath,
      };

      const { consumed, workflowId } = TriggerListenerRegistry.consume(webhookPath, payload);
      if (consumed && workflowId) {
        WorkflowRepository.saveLastTriggerPayload(workflowId, payload);
      }
      return reply.code(200).send({ ok: true });
    }
    // ──────────────────────────────────────────────────────────────

    const workflows = WorkflowRepository.getActiveWorkflows();
    const workflow = workflows.find(
      (wf) =>
        (wf.trigger.type === "webhook" || wf.trigger.type === "plugin") &&
        (wf.trigger.webhookSlug === webhookPath ||
          wf.trigger.webhookPath === webhookPath ||
          (wf.trigger.type === "plugin" && wf.metadata.id === webhookPath)),
    );

    if (!workflow) {
      return reply.code(404).send({ error: "Webhook not found" });
    }

    // Method validation
    const allowedMethods = workflow.trigger.webhookMethods ?? ["POST"];
    if (!allowedMethods.includes(req.method as any)) {
      return reply
        .code(405)
        .send({ error: `Method ${req.method} not allowed` });
    }

    // HMAC signature validation when a secret is configured
    if (workflow.trigger.webhookSecret) {
      const signature = req.headers["x-nod8-signature"] as string | undefined;
      if (!signature) {
        return reply
          .code(401)
          .send({ error: "Missing X-Nod8-Signature header" });
      }
      const rawBody = JSON.stringify(req.body ?? {});
      if (
        !validateWebhookSignature(
          rawBody,
          workflow.trigger.webhookSecret,
          signature,
        )
      ) {
        return reply.code(401).send({ error: "Invalid webhook signature" });
      }
    } else {
      console.warn(
        `[NOD8 | WEBHOOK]: Webhook "${webhookPath}" has no secret configured — consider adding one`,
      );
    }

    const triggerPayload = {
      method: req.method,
      headers: req.headers,
      query: req.query,
      body: req.body ?? {},
      ip: req.ip,
      timestamp: Date.now(),
    };

    const contentType =
      (req.headers["content-type"] ?? "").split(";")[0].trim() ||
      "application/json";
    console.log(
      `[NOD8 | WEBHOOKS]: Webhook received — identifier: '${webhookPath}', content-type: ${contentType}`,
    );

    const executionId = `exec_wh_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Check if this workflow has a RespondToWebhookNode — if so, await the response
    const hasRespondNode = Object.values(workflow.nodes).some(
      (n: any) => n.type === "respond-webhook",
    );

    if (hasRespondNode) {
      // Inject correlationId into trigger payload for the executor to pick up
      const correlationId = `wh_${executionId}`;
      const enrichedPayload = {
        ...triggerPayload,
        _webhookCorrelationId: correlationId,
      };

      // Start execution (fire — don't await)
      WorkflowEngine.executeWorkflow(workflow, enrichedPayload, executionId).catch(
        (err: Error) =>
          console.error(
            `[NOD8 | WEBHOOK]: Execution failed for "${webhookPath}": ${err.message}`,
          ),
      );

      // Wait for RespondToWebhookNode to resolve (or 30s timeout → 504)
      try {
        const webhookResponse = await PendingWebhookResponseRegistry.waitForResponse(
          correlationId,
          30_000,
        );

        // Apply custom headers
        if (webhookResponse.headers) {
          for (const [k, v] of Object.entries(webhookResponse.headers)) {
            reply.header(k, v);
          }
        }

        return reply.code(webhookResponse.statusCode).send(webhookResponse.body);
      } catch {
        return reply.code(504).send({ error: "Gateway Timeout — workflow did not respond in time" });
      }
    }

    // Default: fire-and-forget (no RespondToWebhookNode)
    WorkflowEngine.executeWorkflow(workflow, triggerPayload, executionId).catch(
      (err: Error) =>
        console.error(
          `[NOD8 | WEBHOOK]: Execution failed for "${webhookPath}": ${err.message}`,
        ),
    );

    return reply.code(202).send({
      status: "accepted",
      executionId,
      message: `Workflow "${workflow.metadata.name}" triggered via webhook`,
    });
  });

  // ──────────── Form Trigger ─ Public Form Page ────────────
  // Renders an HTML form for workflows with `trigger.type === "form"`.
  // The page is fully self-contained (inline CSS, no external assets).

  fastify.get("/forms-test/:formId", async (req, reply) => {
    const { formId } = req.params as { formId: string };

    const workflow = resolveFormWorkflow(formId, { requireActive: false });
    if (!workflow) {
      return reply.code(404).type("text/html; charset=utf-8").send(
        `<!DOCTYPE html><html><body style="font-family: sans-serif; padding: 40px; background:#0b0d12; color:#e7e9ee;">
          <h1>Form not available</h1>
          <p>This draft form does not exist.</p>
        </body></html>`
      );
    }

    return reply.redirect(`${CLIENT_ORIGIN}/forms-test/${encodeURIComponent(formPublicId(workflow))}`);
  });

  fastify.get("/forms/:formId", async (req, reply) => {
    const { formId } = req.params as { formId: string };

    const workflow = resolveFormWorkflow(formId, { requireActive: true });
    if (!workflow) {
      return reply.code(404).type("text/html; charset=utf-8").send(
        `<!DOCTYPE html><html><body style="font-family: sans-serif; padding: 40px; background:#0b0d12; color:#e7e9ee;">
          <h1>Form not available</h1>
          <p>This form is either inactive or does not exist.</p>
        </body></html>`
      );
    }

    return reply.redirect(`${CLIENT_ORIGIN}/forms/${encodeURIComponent(formPublicId(workflow))}`);
  });

  fastify.get("/forms-api/:formId", async (req, reply) => {
    const { formId } = req.params as { formId: string };
    const { mode } = req.query as { mode?: string };
    const formMode = mode === "prod" ? "prod" : "test";
    const workflow = resolveFormWorkflow(formId, { requireActive: formMode === "prod" });

    if (!workflow) {
      return sendResponse(reply, {
        status_code: 404,
        message: "Form not found or unavailable",
        error: "Not Found",
        data: null,
      });
    }

    return sendResponse(reply, {
      status_code: 200,
      message: "Form definition fetched",
      error: null,
      data: formDefinition(workflow, formMode),
    });
  });

  // ──────────── Form Trigger ─ Submission Handler ────────────
  // Validates required fields, dispatches the workflow asynchronously, and
  // returns a confirmation page. Per-IP+workflow rate limit prevents spam.

  async function processFormSubmission(
    formId: string,
    opts: { requireActive: boolean; mode: "test" | "prod" },
    req: any,
  ): Promise<
    | { ok: true; workflow: WorkflowItem; executionId: string }
    | { ok: false; statusCode: number; message: string; workflow?: WorkflowItem; fields?: NormalizedFormField[] }
  > {
    const workflow = resolveFormWorkflow(formId, { requireActive: opts.requireActive });
    if (!workflow) {
      return { ok: false, statusCode: 404, message: "Form not available" };
    }

    // Rate limit: per-IP + per-workflow
    const rateKey = `${req.ip}:${workflow.metadata.id}`;
    if (isFormRateLimited(rateKey)) {
      return { ok: false, statusCode: 429, message: "Too many submissions", workflow };
    }

    const fields = normalizeFormFields(workflow.trigger.formFields);
    const rawBody = await parseFormRequestBody(req);

    // Validate + sanitize each declared field
    const fieldData: Record<string, unknown> = {};
    for (const field of fields) {
      const raw = rawBody[field.name];

      // ── File field ──────────────────────────────────────────────────────
      // parseFormRequestBody returns { filename, mimetype, size, buffer }
      // for uploaded files. We store only the serializable metadata so that
      // downstream nodes can read e.g. trigger.fields.foto_perfil.filename.
      if (
        field.type === "file" &&
        raw != null &&
        typeof raw === "object" &&
        "filename" in (raw as object)
      ) {
        const fileRaw = raw as { filename: string; mimetype: string; size: number; buffer: Buffer };
        if (field.required && !fileRaw.filename) {
          return {
            ok: false,
            statusCode: 400,
            message: `Field "${field.label}" is required.`,
            workflow,
            fields,
          };
        }
        fieldData[field.name] = {
          filename: fileRaw.filename,
          mimetype: fileRaw.mimetype,
          size: fileRaw.size,
          // Keep the buffer so downstream nodes (e.g. Google Drive upload) can use it
          buffer: fileRaw.buffer,
        };
        continue;
      }

      // ── Text / number fields ─────────────────────────────────────────────
      const asString = raw == null ? "" : String(raw);

      if (asString.length > FORM_FIELD_MAX_BYTES) {
        return {
          ok: false,
          statusCode: 400,
          message: `Field "${field.label}" exceeds the ${FORM_FIELD_MAX_BYTES} byte limit.`,
          workflow,
          fields,
        };
      }

      if (field.required && asString.trim() === "") {
        return {
          ok: false,
          statusCode: 400,
          message: `Field "${field.label}" is required.`,
          workflow,
          fields,
        };
      }

      if (field.type === "number") {
        if (asString === "") {
          fieldData[field.name] = 0;
        } else {
          const num = Number(asString);
          if (Number.isNaN(num)) {
            return {
              ok: false,
              statusCode: 400,
              message: `Field "${field.label}" must be a number.`,
              workflow,
              fields,
            };
          }
          fieldData[field.name] = num;
        }
      } else {
        fieldData[field.name] = asString;
      }
    }

    const triggerPayload = {
      fields: fieldData,
      submittedAt: Date.now(),
      ip: req.ip,
      userAgent: req.headers["user-agent"] ?? "",
    };

    const headerExecRaw = req.headers["x-nod8-execution-id"];
    const executionId =
      typeof headerExecRaw === "string" &&
      headerExecRaw.length < 96 &&
      /^exec_\d+_[a-z0-9]+$/i.test(headerExecRaw)
        ? headerExecRaw
        : `exec_form_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Emit trigger output immediately so the editor can show it in the Output tab.
    // We strip buffers here since they are not JSON-serializable via SSE.
    const serializableTriggerPayload = {
      fields: Object.fromEntries(
        Object.entries(fieldData).map(([k, v]) => [
          k,
          v && typeof v === "object" && "buffer" in (v as object)
            ? { filename: (v as any).filename, mimetype: (v as any).mimetype, size: (v as any).size }
            : v,
        ])
      ),
      submittedAt: triggerPayload.submittedAt,
      ip: triggerPayload.ip,
      userAgent: triggerPayload.userAgent,
    };
    workflowEventBus.emit(executionId, {
      type: "trigger:data",
      nodeId: "trigger",
      data: serializableTriggerPayload,
      timestamp: Date.now(),
    });

    // Fire-and-forget execution; the user gets the confirmation page immediately
    WorkflowEngine.executeWorkflow(workflow, triggerPayload, executionId).catch(
      (err: any) => {
        console.error(
          `[NOD8 | FORM-TRIGGER]: Execution failed for "${workflow.metadata.id}": ${err.message}`,
        );
      },
    );

    return { ok: true, workflow, executionId };
  }

  async function handleFormSubmission(
    formId: string,
    opts: { requireActive: boolean; mode: "test" | "prod" },
    req: any,
    reply: FastifyReply,
  ) {
    const result = await processFormSubmission(formId, opts, req);

    if (!result.ok) {
      if (!result.workflow || !result.fields) {
        return reply.code(result.statusCode).type("text/html; charset=utf-8").send(
          `<!DOCTYPE html><html><body><h1>${escapeHtml(result.message)}</h1></body></html>`,
        );
      }
      return reply
        .code(result.statusCode)
        .type("text/html; charset=utf-8")
        .send(renderFormPage(result.workflow, result.fields, {
          error: result.message,
          mode: opts.mode,
        }));
    }

    return reply
      .code(200)
      .type("text/html; charset=utf-8")
      .send(renderFormConfirmationPage(result.workflow));
  }

  fastify.post("/forms-api/:formId/submit", async (req, reply) => {
    const { formId } = req.params as { formId: string };
    const { mode } = req.query as { mode?: string };
    const formMode = mode === "prod" ? "prod" : "test";
    const result = await processFormSubmission(
      formId,
      { requireActive: formMode === "prod", mode: formMode },
      req,
    );

    if (!result.ok) {
      return sendResponse(reply, {
        status_code: result.statusCode,
        message: result.message,
        error: result.message,
        data: null,
      });
    }

    return sendResponse(reply, {
      status_code: 202,
      message: "Form submitted and workflow execution started",
      error: null,
      data: { executionId: result.executionId },
    });
  });

  fastify.post("/forms-test/:formId/submit", async (req, reply) => {
    const { formId } = req.params as { formId: string };
    return handleFormSubmission(formId, { requireActive: false, mode: "test" }, req, reply);
  });

  fastify.post("/forms/:formId/submit", async (req, reply) => {
    const { formId } = req.params as { formId: string };
    return handleFormSubmission(formId, { requireActive: true, mode: "prod" }, req, reply);
  });

  // ──────────── SSE Stream Endpoint ────────────

  fastify.get(
    "/workflows/executions/:executionId/stream",
    async (req, reply) => {
      const { executionId } = req.params as { executionId: string };

      // Hijack the request to prevent Fastify from auto-closing the SSE connection
      reply.hijack();

      // SSE headers
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": CLIENT_ORIGIN,
        "Access-Control-Allow-Credentials": "true",
      });

      const unsubscribe = workflowEventBus.onExecution(executionId, (event) => {
        try {
          reply.raw.write(`data: ${safeSerialize(event)}\n\n`);
        } catch {
          // Fallback: strip the data field so the node still advances in the UI
          const fallback = { ...event, data: "[unserializable output]" };
          try {
            reply.raw.write(`data: ${JSON.stringify(fallback)}\n\n`);
          } catch {
            // If even the fallback fails, skip this event silently
          }
        }

        if (
          event.type === "workflow:success" ||
          event.type === "workflow:failed" ||
          event.type === "workflow:cancelled"
        ) {
          // Small delay to ensure client receives the final event
          setTimeout(() => reply.raw.end(), 500);
        }
      });

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        reply.raw.write(": heartbeat\n\n");
      }, 15000);

      // Cleanup on client disconnect
      req.raw.on("close", () => {
        unsubscribe();
        clearInterval(heartbeat);
      });

      // Keep the fastify async handler alive until the connection closes
      return new Promise((resolve) => {
        req.raw.on("close", resolve);
      });
    },
  );

  // ──────────── Cancel workflow execution ────────────

  fastify.post(
    "/workflows/executions/:executionId/cancel",
    async (req, reply) => {
      const { executionId } = req.params as { executionId: string };

      if (!executionId || typeof executionId !== "string") {
        return sendResponse(reply, {
          status_code: 400,
          message: "Invalid executionId",
          error: "Parameter required",
          data: null,
        });
      }

      CancellationRegistry.cancel(executionId);

      return sendResponse(reply, {
        status_code: 202,
        message: "Cancellation requested",
        error: null,
        data: { executionId },
      });
    },
  );

  // ──────────── Emit Internal Event ────────────

  fastify.post("/events/emit", async (req, reply) => {
    const { name, payload } = req.body as {
      name?: string;
      payload?: Record<string, any>;
    };

    if (!name || typeof name !== "string") {
      return sendResponse(reply, {
        status_code: 400,
        message: "Event name is required",
        error: "Missing 'name' field",
        data: null,
      });
    }

    const event: InternalEvent = {
      name,
      payload: payload ?? {},
      emittedBy: "api",
      timestamp: Date.now(),
    };

    const result = await InternalEventBus.emit(event);

    return sendResponse(reply, {
      status_code: 200,
      message: `Event "${name}" emitted`,
      error: null,
      data: result,
    });
  });

  // ──────────── Get all workflows ────────────

  fastify.get("/workflows", async (req, reply) => {
    try {
      const workflows = WorkflowRepository.getWorkflows();
      return sendResponse(reply, {
        status_code: 200,
        message: "Workflows fetched successfully",
        error: null,
        data: workflows,
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 500,
        message: "Failed to fetch workflows",
        error: error.message,
        data: null,
      });
    }
  });

  // ──────────── Save or Update a workflow ────────────

  fastify.post("/workflows", async (req, reply) => {
    try {
      const workflow = req.body as WorkflowItem;

      if (workflow.metadata.isDraft === undefined) {
        workflow.metadata.isDraft = false;
      }

      // Auto-generate webhookPath if missing
      if (
        workflow.trigger.type === "webhook" &&
        !workflow.trigger.webhookPath
      ) {
        workflow.trigger.webhookPath = `wh_${workflow.metadata.id}_${crypto
          .randomBytes(4)
          .toString("hex")}`;
      }

      // Validate webhookSlug if provided
      if (workflow.trigger.type === "webhook" && workflow.trigger.webhookSlug) {
        const slugError = WorkflowRepository.validateWebhookSlug(
          workflow.trigger.webhookSlug,
          workflow.metadata.id,
        );
        if (slugError) {
          return sendResponse(reply, {
            status_code: 400,
            message: slugError,
            error: slugError,
            data: null,
          });
        }
      }

      if (workflow.trigger.type === "form" && workflow.trigger.formSlug) {
        const slugError = WorkflowRepository.validateFormSlug(
          workflow.trigger.formSlug,
          workflow.metadata.id,
        );
        if (slugError) {
          return sendResponse(reply, {
            status_code: 400,
            message: slugError,
            error: slugError,
            data: null,
          });
        }
      }

      const validationError = validateWorkflowDefinition(workflow);
      if (validationError) {
        return sendResponse(reply, {
          status_code: 400,
          message: `Invalid workflow: ${validationError}`,
          error: validationError,
          data: null,
        });
      }

      WorkflowRepository.saveWorkflow(workflow);
      Scheduler.resync();

      return sendResponse(reply, {
        status_code: 200,
        message: "Workflow saved successfully",
        error: null,
        data: workflow,
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 500,
        message: "Failed to save workflow",
        error: error.message,
        data: null,
      });
    }
  });

  // ──────────── Execute a workflow manually ────────────

  fastify.post("/workflows/:workflowId/execute", async (req, reply) => {
    const { workflowId } = req.params as { workflowId: string };

    try {
      const workflow = WorkflowRepository.getWorkflowById(workflowId);
      if (!workflow) {
        return sendResponse(reply, {
          status_code: 404,
          message: "Workflow not found",
          error: "Not Found",
          data: null,
        });
      }

      let triggerPayload: Record<string, any> = {};

      const headerExecRaw = req.headers["x-nod8-execution-id"];
      const headerExecutionId =
        typeof headerExecRaw === "string" &&
        headerExecRaw.length < 96 &&
        /^exec_\d+_[a-z0-9]+$/i.test(headerExecRaw)
          ? headerExecRaw
          : null;

      if (req.isMultipart()) {
        const parts = req.parts();
        for await (const part of parts) {
          if (part.type === "file") {
            triggerPayload[part.fieldname] = {
              content: await part.toBuffer(),
              filename: part.filename,
              mimeType: part.mimetype
            };
          } else {
            try {
              triggerPayload[part.fieldname] = JSON.parse(part.value as string);
            } catch {
              triggerPayload[part.fieldname] = part.value;
            }
          }
        }
      } else {
        triggerPayload = (req.body as Record<string, any>) || {};
      }

      const executionId =
        headerExecutionId ??
        `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const responseBody = {
        status_code: 202,
        message: "Workflow execution started",
        error: null,
        data: { executionId },
      } as const;

      // Defer engine start until after the 202 is sent so the client can open the
      // SSE stream first — otherwise early node:start events are dropped and the
      // first action node never shows "running" or a duration.
      await reply.code(202).send(responseBody);

      setImmediate(() => {
        WorkflowEngine.executeWorkflow(
          workflow,
          triggerPayload,
          executionId,
        ).catch((err: Error) =>
          console.error(
            `[NOD8 | WORKFLOW]: Background execution ${executionId} failed: ${err.message}`,
          ),
        );
      });

      return;
    } catch (error: any) {
      if (reply.sent) return;
      return sendResponse(reply, {
        status_code: 500,
        message: `Workflow execution failed: ${error.message}`,
        error: error.message,
        data: null,
      });
    }
  });

  // ──────────── Execute a single node (Test Step) ────────────

  fastify.post(
    "/workflows/:workflowId/nodes/:nodeId/execute",
    async (req, reply) => {
      const { workflowId, nodeId } = req.params as {
        workflowId: string;
        nodeId: string;
      };
      const overrideNodeConfig = req.body as WorkflowNode;

      try {
        const workflow = WorkflowRepository.getWorkflowById(workflowId);
        if (!workflow) {
          return sendResponse(reply, {
            status_code: 404,
            message: "Workflow not found",
            error: "Not Found",
            data: null,
          });
        }

        // Try to find the most recent execution context
        let baseContext = null;
        const executions = WorkflowRepository.getWorkflowExecutions(workflowId);
        const lastExecution = executions.find(
          (e) => e.status === "SUCCESS" || e.status === "FAILED",
        );

        if (lastExecution && lastExecution.context) {
          baseContext = JSON.parse(JSON.stringify(lastExecution.context));
        }

        const result = await WorkflowEngine.executeSingleNode(
          workflow,
          nodeId,
          overrideNodeConfig,
          baseContext,
        );

        return sendResponse(reply, {
          status_code: 200,
          message: "Node executed successfully",
          error: null,
          data: result,
        });
      } catch (error: any) {
        return sendResponse(reply, {
          status_code: 400,
          message: `Node execution failed: ${error.message}`,
          error: error.message,
          data: null,
        });
      }
    },
  );

  // ──────────── Get workflow executions ────────────

  fastify.get("/workflows/:workflowId/executions", async (req, reply) => {
    const { workflowId } = req.params as { workflowId: string };
    try {
      const executions = WorkflowRepository.getWorkflowExecutions(workflowId);
      return sendResponse(reply, {
        status_code: 200,
        message: "Executions fetched successfully",
        error: null,
        data: executions,
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 500,
        message: "Failed to fetch executions",
        error: error.message,
        data: null,
      });
    }
  });

  // ──────────── Get workflow schema ────────────

  fastify.get("/workflows/:workflowId/schema", async (req, reply) => {
    const { workflowId } = req.params as { workflowId: string };

    try {
      const workflow = WorkflowRepository.getWorkflowById(workflowId);
      if (!workflow) {
        return sendResponse(reply, {
          status_code: 404,
          message: "Workflow not found",
          error: "Not Found",
          data: null,
        });
      }

      const schema = buildWorkflowSchema(workflow, {
        getPlugin: (pluginId) => PluginManager.getPlugin(pluginId),
      });

      return sendResponse(reply, {
        status_code: 200,
        message: "Workflow schema retrieved",
        error: null,
        data: schema,
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 500,
        message: "Failed to fetch workflow schema",
        error: error.message,
        data: null,
      });
    }
  });

  // ──────────── Update a workflow ────────────

  fastify.put("/workflows/:workflowId", async (req, reply) => {
    const { workflowId } = req.params as { workflowId: string };
    try {
      const workflow = req.body as WorkflowItem;
      workflow.metadata.id = workflowId;
      workflow.metadata.updatedAt = new Date().toISOString();

      if (workflow.metadata.isDraft === undefined) {
        workflow.metadata.isDraft = false;
      }

      // Auto-generate webhookPath if missing
      if (
        workflow.trigger.type === "webhook" &&
        !workflow.trigger.webhookPath
      ) {
        workflow.trigger.webhookPath = `wh_${workflow.metadata.id}_${crypto.randomBytes(4).toString("hex")}`;
      }

      // Validate webhookSlug if provided
      if (workflow.trigger.type === "webhook" && workflow.trigger.webhookSlug) {
        const slugError = WorkflowRepository.validateWebhookSlug(
          workflow.trigger.webhookSlug,
          workflowId,
        );
        if (slugError) {
          return sendResponse(reply, {
            status_code: 400,
            message: slugError,
            error: slugError,
            data: null,
          });
        }
      }

      if (workflow.trigger.type === "form" && workflow.trigger.formSlug) {
        const slugError = WorkflowRepository.validateFormSlug(
          workflow.trigger.formSlug,
          workflowId,
        );
        if (slugError) {
          return sendResponse(reply, {
            status_code: 400,
            message: slugError,
            error: slugError,
            data: null,
          });
        }
      }

      const validationError = validateWorkflowDefinition(workflow);
      if (validationError) {
        return sendResponse(reply, {
          status_code: 400,
          message: `Invalid workflow: ${validationError}`,
          error: validationError,
          data: null,
        });
      }

      WorkflowRepository.saveWorkflow(workflow);
      Scheduler.resync();

      return sendResponse(reply, {
        status_code: 200,
        message: "Workflow updated successfully",
        error: null,
        data: workflow,
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 500,
        message: "Failed to update workflow",
        error: error.message,
        data: null,
      });
    }
  });


  // ──────────── Production Status ────────────

  fastify.get("/workflows/production-status", async (_req, reply) => {
    try {
      const status = WorkflowRepository.getProductionStatus();
      return sendResponse(reply, {
        status_code: 200,
        message: "Production status fetched",
        error: null,
        data: status,
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 500,
        message: "Failed to fetch production status",
        error: error.message,
        data: null,
      });
    }
  });

  // ──────────── Listen for Event (SSE) ────────────
  // Opens a temporary SSE connection that waits for the NEXT webhook call on
  // this workflow's webhook path. Intercepted by the webhook ingress routes.
  // Automatically times out after 120 seconds.

  fastify.get("/workflows/:workflowId/trigger/listen", async (req, reply) => {
    const { workflowId } = req.params as { workflowId: string };

    const workflow = WorkflowRepository.getWorkflowById(workflowId);
    if (!workflow) {
      return reply.code(404).send({ error: "Workflow not found" });
    }

    // Determine the webhook path used for this workflow
    const webhookPath =
      workflow.trigger.webhookSlug ||
      workflow.trigger.webhookPath ||
      (workflow.trigger.type === "plugin" ? workflowId : null);

    if (!webhookPath) {
      return reply.code(400).send({
        error: "Workflow trigger has no webhookPath — save the workflow first.",
      });
    }

    // Hijack the request so Fastify doesn't automatically close the connection
    reply.hijack();

    // SSE headers
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": CLIENT_ORIGIN,
      "Access-Control-Allow-Credentials": "true",
    });

    const isUnpublishedPluginTrigger =
      workflow.trigger.type === "plugin" && !workflow.metadata.isActive;

    let teardownDone = false;
    const performTeardown = () => {
      if (teardownDone) return;
      teardownDone = true;
      TriggerListenerRegistry.remove(webhookPath);
      if (isUnpublishedPluginTrigger) {
        // Teardown in background so we don't block SSE cleanup
        WorkflowLifecycleManager.deactivate(workflow).catch(console.error);
      }
    };

    if (isUnpublishedPluginTrigger) {
      try {
        await WorkflowLifecycleManager.activate(workflow);
      } catch (err: any) {
        console.error(`[NOD8 | LISTEN]: Failed to temporarily activate plugin trigger:`, err.message);
        reply.raw.write(`data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`);
        reply.raw.end();
        return;
      }
    }

    // Notify the frontend that listening started
    reply.raw.write(`data: ${JSON.stringify({ type: "listening", webhookPath })}\n\n`);

    const LISTEN_TIMEOUT_MS = 120_000; // 2 minutes

    const timeoutId = setTimeout(() => {
      performTeardown();
      try {
        reply.raw.write(`data: ${JSON.stringify({ type: "timeout" })}\n\n`);
        reply.raw.end();
      } catch { /* already closed */ }
    }, LISTEN_TIMEOUT_MS);

    // Register with SSE sender function
    TriggerListenerRegistry.register(webhookPath, workflowId, (payload) => {
      clearTimeout(timeoutId);
      performTeardown();
      try {
        reply.raw.write(`data: ${JSON.stringify({ type: "captured", payload })}\n\n`);
        reply.raw.end();
      } catch { /* already closed */ }
    });

    // Cleanup on client disconnect
    req.raw.on("close", () => {
      clearTimeout(timeoutId);
      performTeardown();
    });

    // Keep the fastify async handler alive until the connection closes
    return new Promise((resolve) => {
      req.raw.on("close", resolve);
    });
  });

  // ──────────── Get last trigger payload ────────────

  fastify.get("/workflows/:workflowId/trigger/last-payload", async (req, reply) => {
    const { workflowId } = req.params as { workflowId: string };
    const payload = WorkflowRepository.getLastTriggerPayload(workflowId);
    return sendResponse(reply, {
      status_code: 200,
      message: "Last trigger payload fetched",
      error: null,
      data: payload,
    });
  });

  // ──────────── Publish a workflow ────────────

  fastify.post("/workflows/:workflowId/publish", async (req, reply) => {
    const { workflowId } = req.params as { workflowId: string };
    try {
      const workflow = WorkflowRepository.publishWorkflow(workflowId);
      if (!workflow) {
        return sendResponse(reply, {
          status_code: 404,
          message: "Workflow not found",
          error: "Not Found",
          data: null,
        });
      }
      Scheduler.resync();

      // Trigger lifecycle: call plugin setup() if trigger type is "plugin".
      // If setup() fails (e.g. invalid token), return 422 so the UI shows the error.
      try {
        await WorkflowLifecycleManager.activate(workflow);
      } catch (lifecycleErr: any) {
        // Rollback publish so the workflow isn't stuck in a broken active state
        WorkflowRepository.unpublishWorkflow(workflowId);
        Scheduler.resync();
        return sendResponse(reply, {
          status_code: 422,
          message: `Workflow published but trigger setup failed: ${lifecycleErr.message}`,
          error: lifecycleErr.message,
          data: null,
        });
      }

      console.log(
        `[NOD8 | WORKFLOWS]: Published workflow "${workflow.metadata.name}" (${workflowId})`,
      );
      return sendResponse(reply, {
        status_code: 200,
        message: "Workflow published and running in production",
        error: null,
        data: workflow,
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 500,
        message: "Failed to publish workflow",
        error: error.message,
        data: null,
      });
    }
  });

  // ──────────── Unpublish a workflow ────────────

  fastify.post("/workflows/:workflowId/unpublish", async (req, reply) => {
    const { workflowId } = req.params as { workflowId: string };
    try {
      // Capture the workflow BEFORE unpublishing so we have trigger data for teardown
      const workflowBeforeUnpublish = WorkflowRepository.getWorkflowById(workflowId);

      const workflow = WorkflowRepository.unpublishWorkflow(workflowId);
      if (!workflow) {
        return sendResponse(reply, {
          status_code: 404,
          message: "Workflow not found",
          error: "Not Found",
          data: null,
        });
      }
      Scheduler.resync();

      // Lifecycle teardown — non-fatal (errors are logged, not propagated)
      if (workflowBeforeUnpublish) {
        await WorkflowLifecycleManager.deactivate(workflowBeforeUnpublish);
      }

      console.log(
        `[NOD8 | WORKFLOWS]: Unpublished workflow "${workflow.metadata.name}" (${workflowId})`,
      );
      return sendResponse(reply, {
        status_code: 200,
        message: "Workflow unpublished — removed from production",
        error: null,
        data: workflow,
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 500,
        message: "Failed to unpublish workflow",
        error: error.message,
        data: null,
      });
    }
  });

  // ──────────── Delete a workflow ────────────

  fastify.delete("/workflows/:workflowId", async (req, reply) => {
    const { workflowId } = req.params as { workflowId: string };
    try {
      // Capture workflow before deletion for lifecycle teardown
      const workflowBeforeDelete = WorkflowRepository.getWorkflowById(workflowId);

      WorkflowRepository.deleteWorkflowExecutions(workflowId);
      WorkflowRepository.deleteWorkflow(workflowId);
      Scheduler.resync();

      // Lifecycle teardown — non-fatal
      if (workflowBeforeDelete) {
        await WorkflowLifecycleManager.deactivate(workflowBeforeDelete);
      }

      return sendResponse(reply, {
        status_code: 200,
        message: "Workflow deleted successfully",
        error: null,
        data: null,
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 500,
        message: "Failed to delete workflow",
        error: error.message,
        data: null,
      });
    }
  });

  // ──────────── Clear workflow executions ────────────

  fastify.delete("/workflows/:workflowId/executions", async (req, reply) => {
    const { workflowId } = req.params as { workflowId: string };
    try {
      WorkflowRepository.deleteWorkflowExecutions(workflowId);
      return sendResponse(reply, {
        status_code: 200,
        message: "Workflow execution history cleared successfully",
        error: null,
        data: null,
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 500,
        message: "Failed to clear execution logs",
        error: error.message,
        data: null,
      });
    }
  });
}
