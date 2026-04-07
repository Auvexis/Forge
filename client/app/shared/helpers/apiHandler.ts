import type { ApiResponse } from "../types/apiResponse";

export const handleApi = async <T>(
  url: string,
  options?: Omit<RequestInit, "body">,
  body?: any,
) => {
  try {
    const fetchOptions: RequestInit = { ...options };

    if (body) {
      fetchOptions.body =
        typeof body === "string" ? body : JSON.stringify(body);

      if (typeof body !== "string") {
        fetchOptions.headers = {
          "Content-Type": "application/json",
          ...options?.headers,
        };
      }
    }

    const req = await fetch(url, fetchOptions);
    const res = (await req.json()) as ApiResponse<T>;

    if (res.error) {
      throw new Error(res.error);
    }

    return res.data as T;
  } catch (error) {
    throw error;
  }
};
