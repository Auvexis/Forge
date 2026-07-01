import {
  VALID_FORM_FIELD_TYPES,
  type NormalizedFormField,
} from "./form-types.ts";

export function normalizeFormFields(raw: unknown): NormalizedFormField[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((field): field is Record<string, unknown> => {
      return !!field && typeof field === "object";
    })
    .map((field) => {
      const options = Array.isArray(field.options)
        ? field.options
            .filter((option): option is Record<string, unknown> => {
              return !!option && typeof option === "object";
            })
            .map((option) => ({
              label: String(option.label ?? option.value ?? "").trim(),
              value: String(option.value ?? option.label ?? "").trim(),
            }))
            .filter((option) => {
              return option.label.length > 0 && option.value.length > 0;
            })
        : [];

      const type = String(field.type);
      return {
        name: String(field.name ?? "").trim(),
        label: String(field.label ?? field.name ?? "").trim(),
        type: VALID_FORM_FIELD_TYPES.has(type as NormalizedFormField["type"])
          ? (type as NormalizedFormField["type"])
          : "text",
        required: Boolean(field.required),
        placeholder: String(field.placeholder ?? ""),
        description: String(field.description ?? "").trim(),
        options,
        accept:
          typeof field.accept === "string" && field.accept.trim()
            ? field.accept.trim()
            : undefined,
        maxSize:
          typeof field.maxSize === "number" && field.maxSize > 0
            ? field.maxSize
            : undefined,
      };
    })
    .filter((field) => field.name.length > 0);
}
