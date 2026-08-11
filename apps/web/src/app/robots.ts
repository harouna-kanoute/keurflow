import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Everything behind auth is per-user private data — no reason for it
      // to ever be crawled or show up in search results.
      disallow: ["/dashboard", "/api/", "/auth/"],
    },
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
