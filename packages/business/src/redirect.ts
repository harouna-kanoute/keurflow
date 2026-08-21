// Guards every `next`-style redirect target sourced from a query string
// against open-redirect payloads — plain absolute URLs ("https://evil.com"),
// protocol-relative URLs ("//evil.com"), and the userinfo-injection bypass
// ("@evil.com", which `${origin}${next}` string concatenation turns into
// "https://app.example.com@evil.com", a URL every browser resolves to host
// "evil.com"). Requiring a single leading "/" with no "//"/"/\" prefix rules
// out all three at once.
export function isSafeRedirectPath(path: string | null | undefined): path is string {
  if (!path) return false;
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//") || path.startsWith("/\\")) return false;
  return true;
}
