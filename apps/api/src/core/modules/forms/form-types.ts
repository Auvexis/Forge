export type FormMode = "test" | "prod";

export type NormalizedFormFieldType =
  | "text"
  | "email"
  | "number"
  | "textarea"
  | "date"
  | "password"
  | "file"
  | "select"
  | "multiselect"
  | "checkbox"
  | "checkbox-group"
  | "radio"
  | "quiz"
  | "tel"
  | "url";

export interface NormalizedFormField {
  name: string;
  label: string;
  type: NormalizedFormFieldType;
  required: boolean;
  placeholder: string;
  description: string;
  options: Array<{ label: string; value: string }>;
  accept?: string;
  maxSize?: number;
}

export const VALID_FORM_FIELD_TYPES = new Set<NormalizedFormFieldType>([
  "text",
  "email",
  "number",
  "textarea",
  "date",
  "password",
  "file",
  "select",
  "multiselect",
  "checkbox",
  "checkbox-group",
  "radio",
  "quiz",
  "tel",
  "url",
]);

export const FORM_FIELD_NAME_REGEX = /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/i;
export const FORM_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const FORM_FIELD_MAX_BYTES = 8 * 1024;
