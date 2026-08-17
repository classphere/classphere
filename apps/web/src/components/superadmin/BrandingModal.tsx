"use client";

import { useState } from "react";
import { RiLoader4Line } from "@remixicon/react";
import { Modal } from "@/components/shared/Modal";
import { themeVarsFor } from "@/lib/theme";
import type { Institute } from "@/lib/hooks/useInstitutes";

/** Sensible starting points, so a colour can be picked without a hex in hand. */
const PRESETS = ["#4F46E5", "#2a85ff", "#0b1f3a", "#00A656", "#E8590C", "#C2255C", "#7048E8", "#0C8599"];

/**
 * An institute's brand colour and logo, set by us rather than by them.
 *
 * The preview matters more than it looks: the colour drives button text via a
 * computed contrast foreground, so a light brand flips the label to near-black.
 * Seeing that before saving is the difference between a considered choice and
 * discovering an unreadable button on a customer's login page.
 */
export function BrandingModal({
  institute,
  onClose,
  onSave,
}: {
  institute: Institute;
  onClose: () => void;
  onSave: (id: string, payload: { theme_primary_color?: string; theme_logo_url?: string | null }) => Promise<{ success: boolean; message: string }>;
}) {
  const [color, setColor] = useState(institute.theme_primary_color ?? "#4F46E5");
  const [logoUrl, setLogoUrl] = useState(institute.logo_url ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vars = themeVarsFor(color);
  const validHex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color);

  const submit = async () => {
    setError(null);
    if (!validHex) {
      setError("Enter a hex colour such as #4F46E5.");
      return;
    }
    setSaving(true);
    const result = await onSave(institute.id, {
      theme_primary_color: color,
      theme_logo_url: logoUrl.trim() || null,
    });
    setSaving(false);
    if (result.success) onClose();
    else setError(result.message);
  };

  return (
    <Modal open onClose={onClose} title={institute.name} subtitle="Brand colour and logo" maxWidth="max-w-[460px]">
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wide text-t-primary">Brand colour</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={validHex ? color : "#4F46E5"}
                onChange={(e) => setColor(e.target.value)}
                className="size-11 shrink-0 cursor-pointer rounded-[10px] border border-s-stroke2 bg-transparent p-1"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#4F46E5"
                className="input h-11 w-full font-mono text-[13px]"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setColor(preset)}
                  title={preset}
                  style={{ backgroundColor: preset }}
                  className={`size-7 rounded-[8px] border transition-transform hover:scale-110 ${
                    color.toLowerCase() === preset.toLowerCase() ? "border-t-primary" : "border-s-stroke2/50"
                  }`}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wide text-t-primary">Logo URL</label>
            <input
              type="text"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://…"
              className="input h-11 w-full text-[13px]"
            />
            <p className="mt-1.5 text-[11px] text-t-secondary">
              Upload the file when creating the institute, or paste an existing URL. Leaving this empty falls back to the Classphere mark.
            </p>
          </div>

          {/* Live preview of what the institute will actually see. */}
          <div className="rounded-[12px] border border-s-stroke2/60 bg-b-surface2 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-t-secondary">Preview</p>
            <div className="mt-3 flex items-center gap-3">
              <span
                className="flex h-10 items-center rounded-[10px] px-5 text-[12px] font-bold"
                style={{
                  backgroundImage: `linear-gradient(342.29deg, ${vars.gradientFrom} 12.1%, ${vars.gradientTo} 87.9%)`,
                  color: vars.foreground,
                  border: `1px solid ${vars.primary}`,
                }}
              >
                Sign In
              </span>
              <span className="text-[13px] font-bold" style={{ color: vars.primary }}>
                Accent text
              </span>
            </div>
            <p className="mt-2.5 text-[11px] text-t-secondary">
              Button text is {vars.foreground === "#ffffff" ? "white" : "near-black"} — chosen from the colour's luminance so it stays legible.
            </p>
          </div>

          {error && <p className="text-[12px] font-medium text-primary-03">{error}</p>}

          <div className="flex justify-end gap-2 border-t border-s-stroke2 pt-4 -mx-8 px-8 -mb-8 pb-8 mt-1">
            <button onClick={onClose} className="h-10 rounded-[10px] border border-s-stroke2 px-4 text-[12px] font-semibold text-t-secondary transition-colors hover:text-t-primary">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={saving}
              className="flex h-10 items-center gap-2 rounded-[10px] bg-primary-01 px-5 text-[12px] font-bold text-white disabled:opacity-60"
            >
              {saving && <RiLoader4Line size={14} className="animate-spin" />}
              Save branding
            </button>
          </div>
        </div>
    </Modal>
  );
}
