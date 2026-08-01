import { TenantProvider, TenantConfig } from "@/lib/tenant-context";
import { API_URL } from "@/lib/api.client";
import { themeStyleBlock } from "@/lib/theme";

export default async function DomainLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;

  // Server-side fetch to eliminate loading flicker
  let tenantConfig: TenantConfig = {
    domain,
    instituteId: null,
    instituteName: "Classphere",
    logoUrl: null,
    primaryColor: "#6366f1",
    isLoading: false,
  };

  // Skip public institute fetch for non-tenant domains (Vercel previews, www, admin)
  const isNonTenantDomain =
    !domain ||
    domain === "www" ||
    domain === "admin" ||
    domain.startsWith("www.") ||
    domain.endsWith(".vercel.app");

  if (!isNonTenantDomain) {
    try {
      const res = await fetch(`${API_URL}/api/v1/institutes/public/${encodeURIComponent(domain)}`, {
        next: { revalidate: 60 * 5 }, // Cache for 5 minutes
      });
      const { data } = await res.json();
      if (data) {
        const colorPattern = /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
        const validatedColor =
          data.theme_primary_color && colorPattern.test(data.theme_primary_color)
            ? data.theme_primary_color
            : "#6366f1";

        tenantConfig = {
          domain,
          instituteId: data.institutes?.id || data.institute_id,
          instituteName: data.institutes?.name || "Institute",
          // "" is not a logo. Older rows hold an empty string from the settings
          // form submitting untouched fields, and every consumer falls back with
          // ?? , which would treat "" as a real URL and render a broken image.
          logoUrl: data.theme_logo_url || null,
          primaryColor: validatedColor,
          isLoading: false,
        };
      }
    } catch (err) {
      console.error("[DomainLayout] Failed to fetch tenant config", err);
    }
  }

  return (
    <>
      {/* Server-rendered so the branded colours are present on first paint
          rather than swapping in after hydration. Emits the hover, active and
          gradient stops too, plus a foreground computed for contrast — a
          single colour is not enough to style a button safely. */}
      <style dangerouslySetInnerHTML={{ __html: themeStyleBlock(tenantConfig.primaryColor) }} />
      <TenantProvider initialConfig={tenantConfig}>
        {children}
      </TenantProvider>
    </>
  );
}
