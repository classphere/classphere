/**
 * Institute brand colour → the CSS variables the app actually renders with.
 *
 * The tenant colour was stored, injected as `--primary-institute`, and then
 * read by nothing at all, which is why every institute looked identical. The
 * accent token the UI genuinely uses is `--primary-01`, so that is what these
 * values feed.
 *
 * A brand colour cannot be dropped straight into the design system, because
 * components put white text on the accent. That is fine for a navy and
 * illegible for a yellow, so the foreground is computed rather than assumed.
 */

const FALLBACK = "#2a85ff";

/** Accepts #rgb and #rrggbb. Returns null for anything else rather than guessing. */
function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const value = hex.trim().replace(/^#/, "");
  const full =
    value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

const toHex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0");

/** WCAG relative luminance. Channels are linearised first — a plain average calls yellow dark. */
function luminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const channel = (raw: number) => {
    const c = raw / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * Text colour that stays readable on `hex`.
 *
 * The 0.45 threshold sits slightly above the midpoint because the app's near
 * black (#0b0b0b) holds contrast better against mid tones than white does.
 */
export function foregroundOn(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return "#ffffff";
  return luminance(rgb) > 0.45 ? "#0b0b0b" : "#ffffff";
}

/** Shifts a colour toward black (amount < 0) or white (amount > 0). */
function shift(hex: string, amount: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const target = amount < 0 ? 0 : 255;
  const ratio = Math.abs(amount);
  return `#${toHex(rgb.r + (target - rgb.r) * ratio)}${toHex(rgb.g + (target - rgb.g) * ratio)}${toHex(rgb.b + (target - rgb.b) * ratio)}`;
}

export interface ThemeVars {
  primary: string;
  foreground: string;
  hover: string;
  active: string;
  /** Top stop of the primary button gradient, so the button keeps its lift. */
  gradientFrom: string;
  gradientTo: string;
}

/**
 * Every value the stylesheet needs, derived from one brand colour.
 *
 * Dark and light hover shifts are asymmetric on purpose: darkening a very dark
 * brand colour produces no visible hover state, so near-black brands brighten
 * instead.
 */
export function themeVarsFor(color: string | null | undefined): ThemeVars {
  const primary = parseHex(color ?? "") ? (color as string) : FALLBACK;
  const rgb = parseHex(primary)!;
  const isVeryDark = luminance(rgb) < 0.06;

  return {
    primary,
    foreground: foregroundOn(primary),
    hover: isVeryDark ? shift(primary, 0.18) : shift(primary, -0.12),
    active: isVeryDark ? shift(primary, 0.28) : shift(primary, -0.2),
    gradientFrom: isVeryDark ? shift(primary, 0.08) : shift(primary, -0.14),
    gradientTo: isVeryDark ? shift(primary, 0.26) : shift(primary, 0.1),
  };
}

/** The `<style>` body injected by the tenant layout. Server-rendered, so there is no flash. */
export function themeStyleBlock(color: string | null | undefined): string {
  const v = themeVarsFor(color);
  return `:root{--primary-institute:${v.primary};--primary-institute-fg:${v.foreground};--primary-institute-hover:${v.hover};--primary-institute-active:${v.active};--primary-institute-from:${v.gradientFrom};--primary-institute-to:${v.gradientTo};}`;
}
