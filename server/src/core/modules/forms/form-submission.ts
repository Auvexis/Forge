import type { WorkflowItem } from "../../../shared/models/workflow-types.ts";
import { WorkflowEngine } from "../workflows/executor.ts";
import { workflowEventBus } from "../workflows/event-bus.ts";
import { normalizeFormFields } from "./form-fields.ts";
import { isFormRateLimited } from "./form-rate-limit.ts";
import { parseFormRequestBody } from "./form-request.ts";
import { resolveFormWorkflow } from "./form-service.ts";
import {
  FORM_FIELD_MAX_BYTES,
  type FormMode,
  type NormalizedFormField,
} from "./form-types.ts";

type FormSubmissionResult =
  | { ok: true; workflow: WorkflowItem; executionId: string }
  | {
      ok: false;
      statusCode: number;
      message: string;
      workflow?: WorkflowItem;
      fields?: NormalizedFormField[];
    };

export async function processFormSubmission(
  formId: string,
  opts: { requireActive: boolean; mode: FormMode },
  req: any,
): Promise<FormSubmissionResult> {
  const workflow = resolveFormWorkflow(formId, {
    requireActive: opts.requireActive,
  });
  if (!workflow) {
    return { ok: false, statusCode: 404, message: "Form not available" };
  }

  const rateKey = `${req.ip}:${workflow.metadata.id}`;
  if (isFormRateLimited(rateKey)) {
    return {
      ok: false,
      statusCode: 429,
      message: "Too many submissions",
      workflow,
    };
  }

  const fields = normalizeFormFields(workflow.trigger.formFields);
  const rawBody = await parseFormRequestBody(req);
  const fieldData: Record<string, unknown> = {};

  for (const field of fields) {
    const raw = rawBody[field.name];

    if (
      field.type === "file" &&
      raw != null &&
      typeof raw === "object" &&
      "filename" in raw
    ) {
      const fileRaw = raw as {
        filename: string;
        mimetype: string;
        size: number;
        buffer: Buffer;
      };
      const validationError = validateUploadedFile(field, fileRaw);
      if (validationError) {
        return {
          ok: false,
          statusCode: 400,
          message: validationError,
          workflow,
          fields,
        };
      }

      fieldData[field.name] = {
        filename: fileRaw.filename,
        mimetype: fileRaw.mimetype,
        size: fileRaw.size,
        buffer: fileRaw.buffer,
      };
      continue;
    }

    if (field.type === "checkbox") {
      const checked =
        raw === true || raw === "true" || raw === "on" || raw === "1";
      if (field.required && !checked) {
        return requiredFieldError(workflow, fields, field);
      }
      fieldData[field.name] = checked;
      continue;
    }

    if (field.type === "multiselect" || field.type === "checkbox-group") {
      const values = (
        Array.isArray(raw) ? raw : raw == null || raw === "" ? [] : [raw]
      ).map(String);
      if (field.required && values.length === 0) {
        return requiredFieldError(workflow, fields, field);
      }
      const validOptions = new Set(field.options.map((option) => option.value));
      fieldData[field.name] = values.filter((value) => {
        return validOptions.size === 0 || validOptions.has(value);
      });
      continue;
    }

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
      return requiredFieldError(workflow, fields, field);
    }

    if (["select", "radio", "quiz"].includes(field.type) && asString) {
      const validOptions = new Set(field.options.map((option) => option.value));
      if (validOptions.size > 0 && !validOptions.has(asString)) {
        return {
          ok: false,
          statusCode: 400,
          message: `Field "${field.label}" has an invalid option.`,
          workflow,
          fields,
        };
      }
    }

    if (field.type === "number") {
      const parsedNumber = parseNumberField(asString);
      if (parsedNumber === null) {
        return {
          ok: false,
          statusCode: 400,
          message: `Field "${field.label}" must be a number.`,
          workflow,
          fields,
        };
      }
      fieldData[field.name] = parsedNumber;
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
  const executionId = resolveExecutionId(req.headers["x-nod8-execution-id"]);

  workflowEventBus.emitWorkflowEvent({
    executionId,
    workflowId: workflow.metadata.id,
    type: "trigger:data",
    nodeId: "trigger",
    data: serializeTriggerPayload(triggerPayload),
    timestamp: Date.now(),
  });

  WorkflowEngine.executeWorkflow(workflow, triggerPayload, executionId).catch(
    (err: Error) => {
      console.error(
        `[NOD8 | FORM-TRIGGER]: Execution failed for "${workflow.metadata.id}": ${err.message}`,
      );
    },
  );

  return { ok: true, workflow, executionId };
}

function requiredFieldError(
  workflow: WorkflowItem,
  fields: NormalizedFormField[],
  field: NormalizedFormField,
): FormSubmissionResult {
  return {
    ok: false,
    statusCode: 400,
    message: `Field "${field.label}" is required.`,
    workflow,
    fields,
  };
}

function validateUploadedFile(
  field: NormalizedFormField,
  fileRaw: {
    filename: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
  },
): string | null {
  if (field.required && !fileRaw.filename) {
    return `Field "${field.label}" is required.`;
  }
  if (!fileRaw.filename) return null;

  if (field.maxSize && fileRaw.size > field.maxSize * 1024 * 1024) {
    return `Field "${field.label}" file size exceeds the ${field.maxSize}MB limit.`;
  }

  if (!field.accept) return null;

  const acceptedTypes = field.accept
    .split(",")
    .map((entry) => entry.trim().toLowerCase());
  const fileExt = fileRaw.filename.split(".").pop()?.toLowerCase() || "";
  const isAccepted = acceptedTypes.some((type) => {
    if (type.startsWith(".")) return type === `.${fileExt}`;
    if (type.endsWith("/*")) {
      return fileRaw.mimetype.startsWith(type.replace("/*", ""));
    }
    return type === fileRaw.mimetype.toLowerCase();
  });

  return isAccepted
    ? null
    : `Field "${field.label}" has an invalid file type. Allowed: ${field.accept}`;
}

function parseNumberField(value: string): number | null {
  if (value === "") return 0;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function resolveExecutionId(headerExecRaw: unknown): string {
  if (
    typeof headerExecRaw === "string" &&
    headerExecRaw.length < 96 &&
    /^exec_\d+_[a-z0-9]+$/i.test(headerExecRaw)
  ) {
    return headerExecRaw;
  }

  return `exec_form_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function serializeTriggerPayload(triggerPayload: {
  fields: Record<string, unknown>;
  submittedAt: number;
  ip: string;
  userAgent: unknown;
}) {
  return {
    fields: Object.fromEntries(
      Object.entries(triggerPayload.fields).map(([key, value]) => [
        key,
        value && typeof value === "object" && "buffer" in value
          ? {
              filename: (value as any).filename,
              mimetype: (value as any).mimetype,
              size: (value as any).size,
              buffer: `<Buffer size: ${(value as any).buffer.length}>`,
            }
          : value,
      ]),
    ),
    submittedAt: triggerPayload.submittedAt,
    ip: triggerPayload.ip,
    userAgent: triggerPayload.userAgent,
  };
}
