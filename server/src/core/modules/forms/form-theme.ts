import type { FormTheme } from "../../../shared/models/workflow-types.ts";

const MAX_THEME_DEPTH = 8;
const MAX_THEME_KEYS = 120;
const MAX_THEME_ARRAY_ITEMS = 80;
const MAX_THEME_STRING_LENGTH = 2048;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}

function sanitizeThemeValue(value: unknown, depth: number): unknown {
  if (depth > MAX_THEME_DEPTH) return undefined;

  if (
    value === null ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    return value;
  }

  if (typeof value === "string") {
    return value.trim().slice(0, MAX_THEME_STRING_LENGTH);
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_THEME_ARRAY_ITEMS)
      .map((entry) => sanitizeThemeValue(entry, depth + 1))
      .filter((entry) => entry !== undefined);
  }

  if (!isPlainObject(value)) return undefined;

  return Object.fromEntries(
    Object.entries(value)
      .slice(0, MAX_THEME_KEYS)
      .map(([key, entry]) => [key, sanitizeThemeValue(entry, depth + 1)])
      .filter(([, entry]) => entry !== undefined),
  );
}

export function normalizeFormTheme(raw: unknown): FormTheme {
  const sanitized = sanitizeThemeValue(raw, 0);
  return isPlainObject(sanitized) ? (sanitized as FormTheme) : {};
}
