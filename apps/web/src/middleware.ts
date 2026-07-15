import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api/ routes
     * 2. /_next/ (Next.js internals)
     * 3. /_static (inside /public)
     * 4. /_vercel (Vercel internals)
     * 5. Static files (e.g. /favicon.ico, /sitemap.xml, /robots.txt, etc.)
     */
    "/((?!api/|_next/|_static/|_vercel|[\\w-]+\\.\\w+).*)",
  ],
};

export default function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get("host") || "";

  // Define allowed top-level domains and dev hosts
  const isLocal = hostname.includes("localhost") || hostname.includes("127.0.0.1");
  
  // Get the subdomain (e.g., 'allen' from 'allen.classphere.com')
  // For local testing, you can use 'allen.localhost:3000'
  let subdomain = null;
  if (!isLocal && hostname.endsWith(".classphere.com")) {
    subdomain = hostname.replace(".classphere.com", "");
  } else if (isLocal && hostname.split(".").length > 1) {
    subdomain = hostname.split(".")[0];
    if (subdomain === "localhost" || subdomain === "127") {
      subdomain = null;
    }
  }

  // Also support ?tenant= for local dev fallback
  if (isLocal && !subdomain && url.searchParams.has("tenant")) {
    subdomain = url.searchParams.get("tenant");
  }

  // Super admin / marketing domains shouldn't be rewritten to /[domain]
  const reservedSubdomains = ["admin", "www", "api", "app"];
  if (subdomain && reservedSubdomains.includes(subdomain)) {
    subdomain = null;
  }

  // If we have a valid institute subdomain, rewrite to /[domain]/path
  if (subdomain) {
    return NextResponse.rewrite(new URL(`/${subdomain}${url.pathname}${url.search}`, req.url));
  }

  return NextResponse.next();
}
