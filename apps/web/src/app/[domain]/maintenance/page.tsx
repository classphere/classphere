"use client";

import { useTenant } from "@/lib/tenant-context";
import { RiToolsFill, RiRefreshLine } from "@remixicon/react";

/**
 * Shown when the platform is in maintenance and this user is not exempt.
 *
 * Deliberately makes no API calls of its own. Every call would come back 503,
 * and api.client redirects here on a 503 — a page that fetched anything would
 * bounce off itself forever. Institute name and logo come from the tenant
 * layout, which resolved them server-side before any of this ran.
 *
 * A student sitting a test never arrives here: their resume, autosave and
 * submit calls are exempt server-side, so nothing they do returns 503.
 */
export default function MaintenancePage() {
  const tenant = useTenant();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-b-surface1 px-6 py-16 text-center">
      {tenant.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={tenant.logoUrl} alt={tenant.instituteName ?? "Institute"} className="h-12 max-w-[200px] object-contain" />
      ) : null}

      <div className="flex size-16 items-center justify-center rounded-[20px] border border-s-stroke2 bg-b-surface2 text-primary-05">
        <RiToolsFill size={30} />
      </div>

      <div className="max-w-[520px] space-y-3">
        <h1 className="text-[24px] font-bold tracking-tight text-t-primary">
          We&rsquo;re carrying out maintenance
        </h1>
        <p className="text-[15px] leading-relaxed text-t-secondary">
          {tenant.instituteName ? `${tenant.instituteName} on Classphere` : "Classphere"} is briefly
          unavailable while we make some changes. Nothing you have submitted is affected.
        </p>
        <p className="text-[14px] leading-relaxed text-t-secondary">
          If you were in the middle of a test, it has not been interrupted — reopen it from your
          tests page and carry on.
        </p>
      </div>

      <button
        type="button"
        onClick={() => window.location.reload()}
        className="flex h-11 items-center gap-2 rounded-[10px] border border-s-stroke2 bg-b-surface2 px-5 text-[14px] font-semibold text-t-primary transition-colors hover:border-primary-01/40"
      >
        <RiRefreshLine size={17} />
        Try again
      </button>
    </main>
  );
}
