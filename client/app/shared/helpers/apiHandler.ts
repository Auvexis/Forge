import { toast } from "sonner";
import type { ApiResponse } from "../types/apiResponse";

export interface HandleApiOptions {
  /**
   * If true, suppresses the automatic error toast.
   * Useful when the caller wants to handle the error itself.
   */
  silent?: boolean;
}

/**
 * Centralized API helper.
 *
 * - Automatically shows a Nod8-styled toast.error() for every backend error.
 * - Pass `{ silent: true }` in options to suppress the toast for a specific call.
 * - Still throws the error so callers can do their own handling if needed.
 */
export const handleApi = async <T>(
  url: string,
  options?: Omit<RequestInit, "body"> & HandleApiOptions,
  body?: any,
): Promise<T | null> => {
  const { silent, ...fetchInit } = options ?? {};

  try {
    const fetchOptions: RequestInit = { ...fetchInit };

    if (body) {
      if (body instanceof FormData) {
        fetchOptions.body = body;
        // Don't set Content-Type header — browser adds it with the boundary
      } else {
        fetchOptions.body =
          typeof body === "string" ? body : JSON.stringify(body);

        if (typeof body !== "string") {
          fetchOptions.headers = {
            "Content-Type": "application/json",
            ...fetchInit?.headers,
          };
        }
      }
    }

    const req = await fetch(url, fetchOptions);
    const res = (await req.json()) as ApiResponse<T>;

    if (!req.ok || res.error) {
      const message = res.error || `Request failed with status ${req.status}`;
      const error = new Error(message);

      if (!silent) {
        // Derive a human-readable title from the URL path
        // e.g. /plugins/google-drive/execute → "Plugin Execution Error"
        const title = deriveErrorTitle(url, options?.method);
        toast.error(title, {
          description: message,
          duration: 6000,
        });
      }

      throw error;
    }

    return res.data as T;
  } catch (error: any) {
    // Only toast network-level errors (fetch failed, no response, etc.)
    // if they haven't already been toasted above.
    if (!silent && !(error instanceof Response)) {
      const isAlreadyToasted =
        error?.message &&
        (error.message.includes("Request failed") ||
          // The error came from our own throw above — already toasted
          error.__nod8Toasted);

      if (!isAlreadyToasted && error?.name === "TypeError") {
        // Network error (server unreachable)
        toast.error("Connection Error", {
          description: "Cannot reach the Nod8 server. Is it running?",
          duration: 8000,
        });
      }
    }

    throw error;
  }
};

/**
 * Derives a short, readable title for the toast based on the URL pattern.
 */
function deriveErrorTitle(url: string, method?: string): string {
  if (url.includes("/execute")) return "Execution Failed";
  if (url.includes("/auth/connect")) return "OAuth Connection Failed";
  if (url.includes("/auth/callback")) return "OAuth Callback Error";
  if (url.includes("/auth/disconnect")) return "Disconnect Failed";
  if (url.includes("/credentials")) return "Credential Save Failed";
  if (url.includes("/workflows") && method === "POST") return "Workflow Save Failed";
  if (url.includes("/workflows") && method === "DELETE") return "Workflow Delete Failed";
  if (url.includes("/workflows")) return "Workflow Error";
  if (url.includes("/plugins")) return "Plugin Error";
  return "Request Failed";
}
