import crypto from "crypto";
import type { FormTheme, FormTriggerField } from "../../../shared/models/workflow-types.ts";

export interface TemporaryFormSessionInput {
  workflowId: string;
  executionId: string;
  nodeId: string;
  title: string;
  description?: string;
  fields: FormTriggerField[];
  theme?: FormTheme;
  publicSlug?: string;
  expiresInSeconds: number;
}

export interface TemporaryFormSubmission {
  formId: string;
  fields: Record<string, unknown>;
  submittedAt: number;
}

interface TemporaryFormSessionRecord extends TemporaryFormSessionInput {
  id: string;
  createdAt: number;
  expiresAt: number;
  status: "waiting" | "submitted" | "expired";
  timer: ReturnType<typeof setTimeout>;
  resolve: (submission: TemporaryFormSubmission) => void;
  reject: (error: Error) => void;
  result: Promise<TemporaryFormSubmission>;
}

export interface TemporaryFormSession {
  id: string;
  result: Promise<TemporaryFormSubmission>;
  expiresAt: number;
}

const sessions = new Map<string, TemporaryFormSessionRecord>();

export class TemporaryFormExpiredError extends Error {
  constructor(formId: string) {
    super(`Temporary form "${formId}" expired`);
    this.name = "TemporaryFormExpiredError";
  }
}

export class TemporaryFormSessionConflictError extends Error {
  constructor(formId: string) {
    super(`Temporary form "${formId}" already exists`);
    this.name = "TemporaryFormSessionConflictError";
  }
}

export class TemporaryFormCancelledError extends Error {
  constructor(formId: string, reason: string) {
    super(`Temporary form "${formId}" cancelled: ${reason}`);
    this.name = "TemporaryFormCancelledError";
  }
}

export function createTemporaryFormSession(
  input: TemporaryFormSessionInput,
): TemporaryFormSession {
  const id = buildSessionId(input.publicSlug);
  if (sessions.has(id)) {
    throw new TemporaryFormSessionConflictError(id);
  }

  const now = Date.now();
  const expiresAt = now + Math.max(1, input.expiresInSeconds * 1000);

  let resolve!: (submission: TemporaryFormSubmission) => void;
  let reject!: (error: Error) => void;
  const result = new Promise<TemporaryFormSubmission>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  const timer = setTimeout(() => {
    expireTemporaryFormSession(id);
  }, expiresAt - now);

  sessions.set(id, {
    ...input,
    id,
    createdAt: now,
    expiresAt,
    status: "waiting",
    timer,
    resolve,
    reject,
    result,
  });

  return { id, result, expiresAt };
}

function buildSessionId(publicSlug: string | undefined): string {
  const cleanSlug = publicSlug
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleanSlug || crypto.randomUUID();
}

export function getTemporaryFormSession(id: string) {
  const session = sessions.get(id);
  if (!session || session.status !== "waiting") return null;

  return {
    id: session.id,
    workflowId: session.workflowId,
    executionId: session.executionId,
    nodeId: session.nodeId,
    title: session.title,
    description: session.description,
    fields: session.fields,
    theme: session.theme,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
  };
}

export function submitTemporaryFormSession(
  id: string,
  fields: Record<string, unknown>,
): boolean {
  const session = sessions.get(id);
  if (!session || session.status !== "waiting") return false;

  session.status = "submitted";
  clearTimeout(session.timer);
  sessions.delete(id);
  session.resolve({
    formId: id,
    fields,
    submittedAt: Date.now(),
  });
  return true;
}

export function expireTemporaryFormSession(id: string): boolean {
  const session = sessions.get(id);
  if (!session || session.status !== "waiting") return false;

  session.status = "expired";
  clearTimeout(session.timer);
  sessions.delete(id);
  session.reject(new TemporaryFormExpiredError(id));
  return true;
}

export function cancelTemporaryFormSessionsByExecution(
  executionId: string,
  reason: string,
): number {
  let cancelled = 0;
  for (const session of Array.from(sessions.values())) {
    if (session.executionId !== executionId || session.status !== "waiting") continue;
    session.status = "expired";
    clearTimeout(session.timer);
    sessions.delete(session.id);
    session.reject(new TemporaryFormCancelledError(session.id, reason));
    cancelled++;
  }
  return cancelled;
}

export function resetTemporaryFormSessionsForTests(): void {
  for (const session of sessions.values()) {
    clearTimeout(session.timer);
    session.reject(new Error("Temporary form session reset"));
  }
  sessions.clear();
}
