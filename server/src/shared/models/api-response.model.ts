export interface ApiResponse<T> {
  status_code: number;
  message: string | null;
  error: string | null;
  data: T | null;
}
