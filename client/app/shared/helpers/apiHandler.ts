import type { ApiResponse } from "../types/apiResponse";

export const handleApi = async <T>(
  url: string,
  options?: Omit<RequestInit, "body">,
  body?: any,
) => {
  try {
    const fetchOptions: RequestInit = { ...options };

    if (body) {
      if (body instanceof FormData) {
        fetchOptions.body = body;
        // Don't set Content-Type header, browser will set it with boundary
      } else {
        fetchOptions.body =
          typeof body === "string" ? body : JSON.stringify(body);

        if (typeof body !== "string") {
          fetchOptions.headers = {
            "Content-Type": "application/json",
            ...options?.headers,
          };
        }
      }
    }

    const req = await fetch(url, fetchOptions);
    const res = (await req.json()) as ApiResponse<T>;

    if (!req.ok || res.error) {
      throw new Error(res.error || `Request failed with status ${req.status}`);
    }

    return res.data as T;
  } catch (error) {
    throw error;
  }
};
