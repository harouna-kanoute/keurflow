"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

// Mounted once per page that wants a pageview event (e.g. `landing_view`) —
// a dedicated Client Component so the page itself can stay a Server
// Component. Fires once on mount, not on every render.
export function AnalyticsPageView({ event }: { event: string }) {
  useEffect(() => {
    trackEvent(event);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per mount, not on every `event` identity change.
  }, []);

  return null;
}
