const FORM_RATE_LIMIT_WINDOW_MS = 60_000;
const FORM_RATE_LIMIT_MAX = 30;

interface FormRateBucket {
  count: number;
  resetAt: number;
}

const formRateLimit = new Map<string, FormRateBucket>();

export function isFormRateLimited(key: string): boolean {
  const now = Date.now();
  const bucket = formRateLimit.get(key);
  if (!bucket || bucket.resetAt < now) {
    formRateLimit.set(key, {
      count: 1,
      resetAt: now + FORM_RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }

  bucket.count += 1;
  return bucket.count > FORM_RATE_LIMIT_MAX;
}
