import { TenantProvider, TenantConfig } from "@/lib/tenant-context";
import { API_URL } from "@/lib/api.client";

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
          logoUrl: data.theme_logo_url,
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
      <style dangerouslySetInnerHTML={{
        __html: `:root { --primary-institute: ${tenantConfig.primaryColor}; }`
      }} />
      <TenantProvider initialConfig={tenantConfig}>
        {children}
      </TenantProvider>
    </>
  );
}
