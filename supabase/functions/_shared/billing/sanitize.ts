// Removes any field that may carry credentials from log payloads.
const FORBIDDEN_KEYS = new Set([
  "authorization", "authentication", "token", "access_token", "refresh_token",
  "api_key", "apikey", "secret", "password", "passwd", "client_secret",
  "x-api-key", "x-auth-token", "cookie", "set-cookie",
]);

export function sanitize<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(sanitize) as unknown as T;
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (FORBIDDEN_KEYS.has(k.toLowerCase())) {
        out[k] = "[REDACTED]";
      } else {
        out[k] = sanitize(v);
      }
    }
    return out as unknown as T;
  }
  return value;
}
