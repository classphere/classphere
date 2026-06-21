---
name: core2-dashboard-style
description: Use this skill when building or restyling React/Next.js dashboard UI (cards, sidebars, tables, buttons, dropdowns, modals) and the user wants the exact "Core 2.0" dashboard look — soft depth shadows, pill-rounded borders, subtle gradient surfaces, light/dark theme via data-theme, and the specific Tailwind v4 token system extracted from the uploaded core-2-dashboard-builder-react project. Trigger whenever the user references "ditto same effects", "that dashboard style", "glassmorphism dashboard", or asks to reuse this exact design system in a new component/page.
---

# Core 2.0 Dashboard Visual Style

This skill reproduces the exact visual language of the "Core 2.0" dashboard
(Next.js 15 + React 19 + Tailwind CSS v4 + @headlessui/react). It is **not**
classic blurred glassmorphism (no `backdrop-blur` is used anywhere in the
source). The "glass" feel instead comes from three stacked techniques used
consistently across every component:

1. **Multi-layer "depth" box-shadows** (named shadow tokens, several rgba
   layers stacked to fake soft ambient occlusion + a crisp 1px contact shadow).
2. **Hairline borders** using a translucent stroke color (`--stroke-subtle`,
   `--stroke-stroke2`) rather than pure black/white, so borders look etched
   into the surface instead of drawn on top of it.
3. **Subtle linear gradients** on raised surfaces (buttons, hover boxes,
   menu strips) going from a slightly lighter to slightly darker shade,
   plus inset borders (`after:` pseudo-element with `mask-image`) to fake a
   light bevel along the top edge.

Read `reference/globals.css` for the literal source of truth before writing
any CSS — copy variables verbatim, don't approximate them.

## Setup (do this first for any new project)

1. Tailwind v4 (`@import "tailwindcss";`), plugin `tailwind-scrollbar`.
2. Copy the entire `:root`, `[data-theme="dark"]`, and `@theme` blocks from
   `reference/globals.css` into the project's `globals.css`. These define:
   - Raw color primitives: `--shade-01..10`, `--primary-01..05`,
     `--secondary-01..05`.
   - Semantic aliases consumed by Tailwind utilities via `@theme`:
     `--color-b-surface1/2/3`, `--color-b-pop`, `--color-b-dark1/2`,
     `--color-b-highlight`, `--color-b-depth`, `--color-t-primary/secondary
     /tertiary/light/blue`, `--color-s-border/subtle/focus/highlight
     /stroke2`.
   - Shadow tokens: `--shadow-depth`, `--shadow-widget`,
     `--shadow-depth-toggle`, `--shadow-depth-menu`, `--shadow-dropdown`,
     `--shadow-press-pressing(-dark)`, `--shadow-hover-light`,
     `--shadow-input-typing`. Always reference these via Tailwind's
     `shadow-*` utilities (e.g. `shadow-widget`, `shadow-depth`), never hand
     roll a one-off shadow.
   - Typography scale tokens (`text-h1`..`text-h6`, `text-sub-title-1/2`,
     `text-body-1/2`, `text-button`, `text-caption`, `text-overline`) each
     bundled with their own line-height/letter-spacing/weight — use the
     Tailwind `text-h5`, `text-body-2`, `text-button` etc. utilities directly
     instead of setting font-size/line-height manually.
   - Custom breakpoints: `sm 480 / md 767 / lg 1023 / xl 1259 / 2xl 1419 /
     3xl 1719 / 4xl 1899`.
3. Theme switching is done with `@custom-variant dark
   (&:where([data-theme=dark], [data-theme=dark] *));` and a `data-theme`
   attribute (driven by `next-themes`) — **not** Tailwind's default `dark:`
   media-query variant. Always toggle dark mode via `[data-theme="dark"]` on
   `html`, and write dark overrides with the `dark:` prefix (it resolves to
   the custom variant above).
4. Root font-size is fluid: `text-[calc(0.7rem+0.4vw)]` clamped down at
   smaller viewports (see `@layer base` in reference file) — keep this if the
   user wants the same fluid scaling feel.
5. Load Inter Display as a local variable font (`--font-inter-display`,
   weights 300/400/500/600/700) and map it to `--font-inter` in `@theme`.

## Core surface recipe ("the card")

Every panel uses the `.card` utility class:
```css
.card {
  @apply mb-3 p-3 rounded-4xl bg-b-surface2 shadow-widget last:mb-0
    dark:shadow-[inset_0_0_0_1.5px_rgba(229,229,229,0.04),0px_5px_1.5px_-4px_rgba(8,8,8,0.5),0px_6px_4px_-4px_rgba(8,8,8,0.05)];
}
```
Key recipe: **very round corners (`rounded-4xl` = 2rem)**, a soft multi-layer
shadow instead of a border in light mode, and in dark mode an **inset 1.5px
hairline highlight** (`inset_0_0_0_1.5px_rgba(229,229,229,0.04)`) standing in
for a border — this inset-white-line-on-dark-surface is the signature "glass
edge" effect. Reuse this `inset 0 0 0 1.5px rgba(229,229,229,0.04)` pattern
on any dark-mode card/panel.

## Buttons (`reference/components/Button.tsx`)

Base: `inline-flex items-center justify-center h-12 border rounded-3xl
text-button transition-all`. Variants are boolean props, not a single
`variant` enum:
- `isWhite` — flat `bg-b-surface2`, border-0, gains a dark-mode gradient
  `dark:bg-linear-to-b dark:from-[#2A2A2A] dark:to-[#202020]`.
- `isBlack` — the signature "glossy dark pill" button: gradient
  `bg-linear-to-b from-[#2C2C2C] to-[#282828]`, inner glow
  `shadow-[inset_2px_0px_8px_2px_rgba(248,248,248,0.20)]`, plus an
  `after:` pseudo-element that draws a `1.5px` white/20% border and fades it
  out at the top via `after:[mask-image:linear-gradient(to_top,transparent_0,black_100%)]`
  — this is the bevel-edge trick, reuse it anywhere you want a "glossy dark
  capsule" control.
- `isGray` — flat secondary button, `hover:shadow-depth` on hover only.
- `isStroke` — outlined: `border-s-stroke2`, hover brightens to
  `border-s-highlight`.
- `isCircle` — square `w-12 !px-0 rounded-full`, used for icon-only buttons.

## Labels / status pills

`.label` (`h-7 px-1.75 rounded-lg text-button`) + a color modifier, all
following the same recipe: 15%-opacity border, 5%-opacity fill, full-opacity
text, all from the *same* hex:
```
.label-green  { @apply border border-[#00A656]/15 bg-[#00A656]/5 text-[#00A656]; }
.label-red    { @apply border border-[#FF6A55]/15 bg-[#FF6A55]/5 text-[#FF6A55]; }
.label-yellow { @apply border border-[#EF9D0E]/15 bg-[#EF9D0E]/5 text-[#EF9D0E]; }
.label-gray   { @apply border border-s-stroke2 bg-b-surface1 text-t-secondary; }
```
Apply this `/15 border, /5 bg, full text — same hex` pattern for any new
status colors.

## "box-hover" gradient-border hover effect (used on product/grid cards)

```css
.box-hover {
  @apply absolute inset-0 rounded-[20px] bg-linear-to-b from-shade-09 to-[#ebebeb]
    before:absolute before:inset-[1.5px] before:bg-b-highlight before:rounded-[18.5px]
    before:border-[1.5px] before:border-b-surface2
    invisible opacity-0 transition-all group-hover:visible group-hover:opacity-100
    dark:from-shade-09/[0.075] dark:to-[#ebebeb]/[0.075];
}
```
This is THE glassmorphism-looking trick in the kit: an outer gradient
"frame" div sized to the card, with an inner `before:` pseudo-element inset
by `1.5px` that paints the actual surface color — producing a crisp 1.5px
gradient-edge border that only fades in on `group-hover`. Always pair with
`group` on the parent card and `relative` so this absolutely-positioned
layer sits correctly behind the content.

## Dropdowns / Select / Listbox (`reference/components/Select.tsx`, Dropdown.tsx)

Built on `@headlessui/react` `Listbox`/`Menu`. Trigger button:
`h-12 rounded-3xl border border-s-stroke2`, on open state the corners
square off at the bottom (`data-[open]:rounded-b-none
data-[open]:border-s-subtle data-[open]:border-b-transparent`) so the
options panel reads as one continuous shape. Options panel:
```
bg-b-surface2 border border-t-0 border-s-subtle shadow-depth
rounded-b-[1.25rem] data-[closed]:scale-95 data-[closed]:opacity-0
```
plus the same dark-mode multi-layer shadow override as `.card`. Selected
option gets a small `after:` dot (`after:size-2 after:rounded-full
after:bg-t-blue`) that fades in via opacity, not display toggling.

## Modal (`reference/components/Modal.tsx`)

`@headlessui/react` `Dialog`. Backdrop: `bg-shade-04/90` (90%-opacity dark
scrim, no blur). Panel: `bg-b-surface1 shadow-depth rounded-3xl`, entrance
animation via Headless UI `data-[closed]:scale-95 data-[closed]:opacity-0`.
Slide-panel variant (`isSlidePanel`) docks right (`justify-end`, panel
`w-114 h-svh`, `data-[closed]:translate-x-full`) instead of centering.
Always include the floating circular `CloseButtonModal`
(`size-12 rounded-full bg-b-surface2-overlay`, fixed `top-5 right-5`).

## Sidebar (`reference/components/Sidebar.tsx`)

Fixed, full-height, `w-85` desktop down to `w-60`/`w-74` at smaller
breakpoints, `bg-b-surface1`, no border/shadow (it's a flat color block
since it sits flush against the page edge). Slides in/out via
`translate-x` + `transition-transform duration-300`, gated by Tailwind's
custom breakpoints (`max-xl:`), not a separate mobile component.

## General conventions to keep when extending this system

- Always reach for the **semantic** color utilities (`bg-b-surface1/2/3`,
  `text-t-primary/secondary/tertiary`, `border-s-stroke2/subtle`) — never
  hardcode hex except for the one-off brand/status colors already shown
  above (those intentionally bypass the token system).
- Reach for the named shadow utilities (`shadow-widget`, `shadow-depth`,
  `shadow-dropdown`, `shadow-depth-menu`) instead of inventing new
  `shadow-[...]` arbitrary values — only the dark-mode "inset hairline"
  override pattern is hand-written, and even that should be copy-pasted
  verbatim from `.card`/`Select`/`Modal` rather than re-derived.
- Corner radius scale used throughout: `rounded-lg`/`rounded-xl` for small
  controls, `rounded-3xl` (1.5rem) for buttons/inputs/modals, `rounded-4xl`
  (2rem, custom token) for top-level cards/panels, `rounded-full` for
  avatars/circular buttons.
- Transitions: `transition-all` / `transition-colors` with the project-wide
  default duration `--default-transition-duration: 0.2s` (already wired into
  Tailwind's `transition-*` utilities via `@theme`).
- Border width default is `1.5px` (`--default-border-width: 1.5px`), not the
  Tailwind default `1px` — this is why borders read as slightly bolder/more
  tactile than typical Tailwind UIs.

## Workflow for a new component in this style

1. Skim `reference/components/` for the closest existing analog (Button,
   Select, Card, Modal, Table, Field, Checkbox, Switch, Tooltip, NavLink,
   Header, Sidebar, Dropdown) and copy its class patterns rather than
   inventing new ones.
2. Use only semantic tokens + named shadow/radius utilities described above.
3. For any "hover reveal" affordance, default to the `.box-hover` gradient
   frame technique, not `backdrop-blur` or `box-shadow` alone.
4. For dark mode, always add the inset-hairline shadow override alongside
   any light-mode shadow utility — don't ship a card/menu/modal without it.
5. Verify in both `data-theme="light"` and `data-theme="dark"` since nearly
   every token flips meaning between themes (e.g. `--backgrounds-surface1`
   is near-white in light mode and near-black in dark mode).
