// ─────────────────────────────────────────────────────────────
//  API Response — mirrors server/src/shared/models/api-response.model.ts
// ─────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  status_code: number
  message: string | null
  error: string | null
  data: T | null
}

// ─────────────────────────────────────────────────────────────
//  API Error
// ─────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly serverError: string | null = null,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// ─────────────────────────────────────────────────────────────
//  Async state helpers (for composables)
// ─────────────────────────────────────────────────────────────

export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export function createAsyncState<T>(initial: T | null = null): AsyncState<T> {
  return { data: initial, loading: false, error: null }
}
