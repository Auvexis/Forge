/**
 * Removes any properties from an object that start with an underscore.
 * This is used to prevent transient execution state (like _executionStatus)
 * from being persisted to the backend or staying in the UI on reload.
 */
export function sanitizeNodeData<T extends Record<string, any>>(data: T): T {
  if (!data || typeof data !== "object") return data;

  const sanitized = { ...data };
  Object.keys(sanitized).forEach((key) => {
    if (key.startsWith("_")) {
      delete (sanitized as any)[key];
    }
  });

  return sanitized;
}
