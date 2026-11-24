import { createFileRoute } from "@tanstack/react-router";
import portfolioHtml from "@/content/portfolio.html?raw";

/** Public portfolio at aduf.me/portfolio. No sign-in, no app shell, no database: one finished page served
 *  as-is. Edit the page in src/content/portfolio.html. Its own security policy lets the on-page video
 *  players load from YouTube's embed host; the rest of the app's policy is untouched. */
function portfolioCsp(): string {
  const parts = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "frame-src https://www.youtube-nocookie.com",
    "connect-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ];
  if (typeof process !== "undefined" && process.env["NODE_ENV"] === "production")
    parts.push("upgrade-insecure-requests");
  return parts.join("; ");
}

const headers = (): Record<string, string> => ({
  "content-type": "text/html; charset=utf-8",
  "content-security-policy": portfolioCsp(),
  "cache-control": "public, max-age=0, s-maxage=600, stale-while-revalidate=86400",
});

export const Route = createFileRoute("/portfolio")({
  server: {
    handlers: {
      GET: () => new Response(portfolioHtml, { status: 200, headers: headers() }),
      HEAD: () => new Response(null, { status: 200, headers: headers() }),
    },
  },
});
