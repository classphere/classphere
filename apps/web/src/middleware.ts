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
  const hostname = (req.headers.get("host") || "").split(":")[0].toLowerCase();
  const baseDomain = (process.env.NEXT_PUBLIC_BASE_DOMAIN || "classphere.com").toLowerCase();
  const platformHosts = new Set(
    (process.env.APP_PLATFORM_HOSTS || "")
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
  );

  // Define allowed top-level domains and dev hosts
  const isLocal = hostname.includes("localhost") || hostname.includes("127.0.0.1");
  
  // Get the subdomain (e.g., 'allen' from 'allen.classphere.com')
  // For local testing, you can use 'allen.localhost:3000'
  let subdomain = null;
  if (!isLocal && hostname.endsWith(`.${baseDomain}`)) {
    subdomain = hostname.slice(0, -(baseDomain.length + 1));
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
    const alreadyPrefixed = url.pathname === "/superadmin" || url.pathname.startsWith("/superadmin/");
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

  // A verified custom domain reaches the same tenant route using its full host.
  // Deploy host aliases are excluded through APP_PLATFORM_HOSTS so they continue
  // to render the public Classphere site.
  const customDomain = !isLocal && !subdomain && hostname && hostname !== baseDomain && !platformHosts.has(hostname)
    ? hostname
    : null;
  const tenantDomain = subdomain || customDomain;

  // If we have a valid institute subdomain or custom domain, rewrite to /[domain]/path
  if (tenantDomain) {
    // Guard: only skip rewrite if path is already double-prefixed (e.g. /test/test/...).
    // A simple startsWith check is NOT sufficient — it causes false positives when the subdomain
    // name matches a real route segment (e.g. subdomain='test', path='/test/uuid' is a real page).
    const doublePrefix = `/${tenantDomain}/${tenantDomain}`;
    const alreadyPrefixed =
      url.pathname === `/${tenantDomain}` ||
      url.pathname.startsWith(doublePrefix + "/") ||
      url.pathname === doublePrefix;
    const domainPath = alreadyPrefixed
      ? url.pathname
      : url.pathname === "/"
        ? `/${tenantDomain}`
        : `/${tenantDomain}${url.pathname}`;
    return NextResponse.rewrite(new URL(`${domainPath}${url.search}`, req.url));
  }

  return NextResponse.next();
}
