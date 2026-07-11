import type { WorkflowItem } from "../../../shared/models/workflow-types.ts";
import type { FormMode, NormalizedFormField } from "./form-types.ts";
import { formPublicId } from "./form-service.ts";

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escapeAttr(value: unknown): string {
  return escapeHtml(value);
}

export function renderFormPage(
  workflow: WorkflowItem,
  fields: NormalizedFormField[],
  opts: { error?: string; mode?: FormMode; submitPath?: string } = {},
): string {
  const trigger = workflow.trigger;
  const title = trigger.formTitle?.trim() || workflow.metadata.name;
  const description = trigger.formDescription?.trim() || "";

  const fieldsHtml = fields
    .map((field) => {
      const labelHtml =
        `<label for="f-${escapeAttr(field.name)}">${escapeHtml(field.label)}` +
        (field.required ? ' <span class="req">*</span>' : "") +
        `</label>`;
      const descriptionHtml = field.description
        ? `<div class="field-desc">${escapeHtml(field.description)}</div>`
        : "";
      const common =
        `id="f-${escapeAttr(field.name)}" name="${escapeAttr(field.name)}"` +
        (field.required ? " required" : "") +
        (field.placeholder
          ? ` placeholder="${escapeAttr(field.placeholder)}"`
          : "");
      const optionsHtml = field.options
        .map((option) => {
          return `<option value="${escapeAttr(option.value)}">${escapeHtml(option.label)}</option>`;
        })
        .join("");
      const choiceHtml = field.options
        .map((option) => {
          const type = field.type === "checkbox-group" ? "checkbox" : "radio";
          return `<label class="choice"><input type="${type}" name="${escapeAttr(field.name)}" value="${escapeAttr(option.value)}" /> ${escapeHtml(option.label)}</label>`;
        })
        .join("");
      const control =
        field.type === "textarea"
          ? `<textarea ${common} rows="4"></textarea>`
          : field.type === "select"
            ? `<select ${common}><option value="">${escapeHtml(field.placeholder || "Select...")}</option>${optionsHtml}</select>`
            : field.type === "multiselect"
              ? `<select ${common} multiple>${optionsHtml}</select>`
              : field.type === "checkbox"
                ? `<label class="choice"><input type="checkbox" name="${escapeAttr(field.name)}" value="true" /> ${escapeHtml(field.placeholder || "Yes")}</label>`
                : field.type === "checkbox-group" ||
                    field.type === "radio" ||
                    field.type === "quiz"
                  ? `<div class="choice-group">${choiceHtml}</div>`
                  : `<input type="${escapeAttr(field.type)}" ${common} />`;

      return `<div class="field">${labelHtml}${descriptionHtml}${control}</div>`;
    })
    .join("\n");

  const errorBlock = opts.error
    ? `<div class="error">${escapeHtml(opts.error)}</div>`
    : "";

  const mode = opts.mode ?? "prod";
  const basePath = mode === "test" ? "/forms-test" : "/forms";
  const submitUrl =
    opts.submitPath ?? `${basePath}/${escapeAttr(formPublicId(workflow))}/submit`;

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
  .field-desc { color:#7f8797; font-size: 12px; line-height:1.45; margin-top:-2px; }
  .req { color:#ff6b6b; }
  input, textarea, select { background:#0b0d12; border:1px solid #2a3142; border-radius: 8px; color:#e7e9ee; font: inherit; padding: 10px 12px; width: 100%; outline: none; transition: border-color .15s; }
  input:focus, textarea:focus, select:focus { border-color:#7c3aed; }
  textarea { resize: vertical; min-height: 92px; }
  .choice, .choice-group { display:flex; flex-direction:column; gap:8px; color:#c5cad6; font-size: 13px; }
  .choice input { width:auto; margin-right: 8px; }
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
  <div class="footer">Powered by Fabric</div>
</form>
</body></html>`;
}

export function renderFormConfirmationPage(workflow: WorkflowItem): string {
  const title = workflow.trigger.formTitle?.trim() || workflow.metadata.name;
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)} - Submitted</title>
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
