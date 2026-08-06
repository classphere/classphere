"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/lib/auth-context";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api.client";
import { useApiQuery } from "@/lib/hooks/useApiQuery";
import { PremiumSectionCard as SectionCard } from "@/components/premium-ui";
import { RiPaletteLine, RiGlobalLine, RiMailSendLine, RiSaveLine } from "@remixicon/react";

type Settings = {
  subdomain?: string;
  custom_domain?: string;
  theme_primary_color?: string;
  theme_logo_url?: string;
  support_email?: string;
};

export default function InstituteSettingsPage() {
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "classphere.com";
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    subdomain: "",
    custom_domain: "",
    theme_primary_color: "#4F46E5",
    theme_logo_url: "",
    support_email: "",
  });

  const SETTINGS_PATH = "/api/v1/institutes/me/settings";
  const { data: settings, isPending: loading } = useApiQuery<Settings>(SETTINGS_PATH);

  // Server values seed the form once they arrive; after that the form is the
  // source of truth so a background revalidation cannot overwrite typing.
  useEffect(() => {
    if (!settings) return;
    setForm({
      subdomain: settings.subdomain || "",
      custom_domain: settings.custom_domain || "",
      theme_primary_color: settings.theme_primary_color || "#4F46E5",
      theme_logo_url: settings.theme_logo_url || "",
      support_email: settings.support_email || "",
    });
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiClient.patch("/api/v1/institutes/me/settings", form, session?.access_token || "");
      if (res.success) {
        await queryClient.invalidateQueries({ queryKey: [SETTINGS_PATH] });
        alert("Settings saved successfully!");
      } else {
        alert("Failed to save: " + res.message);
      }
    } catch (e: any) {
      alert("Error saving settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading settings...</div>;
  }

  return (
    <>
      <Navbar title="White-Label Studio" subtitle="Customize your platform branding and domain" breadcrumbs="Dashboard > Settings" />
      <main className="mx-auto w-full max-w-screen-xl px-6 pb-12 pt-6">
        
        <div className="grid gap-3 md:grid-cols-2">
          
          {/* Branding Section */}
          <SectionCard title="Brand Appearance">
            <div className="flex flex-col gap-3 p-2">
              <div>
                <label className="text-sm font-semibold text-t-primary mb-1.5 block">Primary Theme Color</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="color" 
                    value={form.theme_primary_color}
                    onChange={(e) => setForm({ ...form, theme_primary_color: e.target.value })}
                    className="w-12 h-12 rounded cursor-pointer border-0 p-0"
                  />
                  <input 
                    type="text"
                    value={form.theme_primary_color}
                    onChange={(e) => setForm({ ...form, theme_primary_color: e.target.value })}
                    className="input h-10 w-32 font-mono uppercase"
                  />
                </div>
                <p className="text-xs text-t-secondary mt-1">This color will be used for primary buttons and accents.</p>
              </div>

              <div>
                <label className="text-sm font-semibold text-t-primary mb-1.5 block">Logo URL</label>
                <input 
                  type="text" 
                  placeholder="https://example.com/logo.png"
                  value={form.theme_logo_url}
                  onChange={(e) => setForm({ ...form, theme_logo_url: e.target.value })}
                  className="input w-full h-11"
                />
              </div>
            </div>
          </SectionCard>

          {/* Domain Section */}
          <SectionCard title="Domain Configuration">
            <div className="flex flex-col gap-3 p-2">
              <div>
                <label className="text-sm font-semibold text-t-primary mb-1.5 block">Classphere Subdomain</label>
                <div className="flex items-center">
                  <input 
                    type="text" 
                    placeholder="allen"
                    value={form.subdomain}
                    onChange={(e) => setForm({ ...form, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    className="input w-full h-11 rounded-r-none border-r-0"
                  />
                  <div className="h-11 px-4 bg-b-surface2 border border-l-0 border-s-stroke2 flex items-center text-t-secondary text-sm rounded-r-[10px]">
                    .{baseDomain}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-t-primary mb-1.5 block">Custom Domain (Advanced)</label>
                <input 
                  type="text" 
                  placeholder="learn.myinstitute.com"
                  value={form.custom_domain}
                  onChange={(e) => setForm({ ...form, custom_domain: e.target.value })}
                  className="input w-full h-11"
                />
                <p className="text-xs text-t-secondary mt-1">Leave blank if you prefer to use the subdomain.</p>
              </div>
            </div>
          </SectionCard>

          {/* Communication Section */}
          <SectionCard title="Communication">
            <div className="flex flex-col gap-3 p-2">
              <div>
                <label className="text-sm font-semibold text-t-primary mb-1.5 block">Support Email</label>
                <input 
                  type="email" 
                  placeholder="support@myinstitute.com"
                  value={form.support_email}
                  onChange={(e) => setForm({ ...form, support_email: e.target.value })}
                  className="input w-full h-11"
                />
                <p className="text-xs text-t-secondary mt-1">Students will see this email for technical support.</p>
              </div>
            </div>
          </SectionCard>

        </div>

        <div className="mt-3 flex justify-end">
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="btn btn-primary h-12 px-8 flex items-center gap-2 rounded-[10px]"
            style={{ backgroundColor: form.theme_primary_color }}
          >
            <RiSaveLine size={18} />
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>

      </main>
    </>
  );
}
