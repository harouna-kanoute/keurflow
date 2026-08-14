// Provider-agnostic event emission for marketing/acquisition tracking
// (landing_view, hero_cta_click, pricing_cta_click, signup_started,
// signup_completed, ...). Pushes to `window.dataLayer` — the de facto
// standard consumed by GTM, GA4, and most other analytics tools — if one is
// present, and silently no-ops otherwise. Wiring an actual provider (adding
// its script tag, e.g. via Google Tag Manager) is a separate, deliberate
// choice outside this file's scope; until then these calls are inert.
export function trackEvent(name: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  const w = window as typeof window & { dataLayer?: unknown[] };
  if (!Array.isArray(w.dataLayer)) return;
  w.dataLayer.push({ event: name, ...params });
}
