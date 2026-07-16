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

  // "admin" subdomain → rewrite to /superadmin (accessible as admin.classphere.com or admin.localhost:3000)
  // Guard: if path already starts with /superadmin (e.g. internal Link navigation), don't double-prefix.
  if (subdomain === "admin") {
    const alreadyPrefixed = url.pathname.startsWith("/superadmin");
    const superadminPath = alreadyPrefixed
      ? url.pathname
      : url.pathname === "/"
        ? "/superadmin"
        : `/superadmin${url.pathname}`;
    return NextResponse.rewrite(new URL(`${superadminPath}${url.search}`, req.url));
  }

  // Other reserved subdomains (www, api, app) pass through unchanged
  const reservedSubdomains = ["www", "api", "app"];
  if (subdomain && reservedSubdomains.includes(subdomain)) {
    subdomain = null;
  }

  // If we have a valid institute subdomain, rewrite to /[domain]/path
  if (subdomain) {
    // Guard: if path already starts with /subdomain (e.g. internal Link navigation), don't double-prefix (FE-1)
    const alreadyPrefixed = url.pathname.startsWith(`/${subdomain}`);
    const domainPath = alreadyPrefixed
      ? url.pathname
      : url.pathname === "/"
        ? `/${subdomain}`
        : `/${subdomain}${url.pathname}`;
    return NextResponse.rewrite(new URL(`${domainPath}${url.search}`, req.url));
  }

  return NextResponse.next();
}
