/** Stable public-only filter variants, bounded to avoid unbounded URL keys. */
export type PublicFilters = Record<string, string | undefined>;
export function filterKey(
  params: URLSearchParams,
  allowed: readonly string[],
): string {
  const result = new URLSearchParams();
  for (const key of allowed) {
    const value = params.get(key);
    if (value && value.length <= 120) result.set(key, value);
  }
  return result.toString();
}
function encode(value: string) {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function encodeFilterKey(
  params: URLSearchParams,
  allowed: readonly string[],
) {
  const key = filterKey(params, allowed);
  return key ? encode(key) : "";
}
export function parseFilterKey(
  token: string,
  allowed: readonly string[],
): PublicFilters | null {
  if (!/^[A-Za-z0-9_-]+$/.test(token) || token.length > 8192) return null;
  try {
    const key = atob(token.replace(/-/g, "+").replace(/_/g, "/"));
    const canonical = filterKey(new URLSearchParams(key), allowed);
    if (!canonical || canonical !== key || encode(canonical) !== token)
      return null;
    return Object.fromEntries(new URLSearchParams(canonical));
  } catch {
    return null;
  }
}
