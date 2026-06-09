---
name: rayum-design-system
description: Use this skill whenever you need to build UI using the Rayum Design System. Triggers: any request to create screens, components, dashboards, forms, or interfaces that should follow the Rayum CRM design language. This skill gives you the complete token system, component library, and usage rules so your output is indistinguishable from native Rayum UI.
version: 1.0
author: Rayum / Belén del Olmo
---

# Rayum Design System — Complete Skill Reference

You are building UI with the Rayum Design System. Every decision — color, type, spacing, radius, component anatomy, state — must come from this document. Do not invent tokens. Do not use generic defaults. Rayum has a specific visual identity: clean, professional, CRM-grade, with a signature green primary and a dark neutral palette.

---

## 1. FOUNDATIONS

### 1.1 Typography

**Font:** Inter (Google Fonts — open licence, universally compatible)
**Weights used:** Regular (400), Medium (500), Semibold (600), Bold (700)

| Token | Style | Size | Weight |
|---|---|---|---|
| Title Hero | Display | 72px | Bold |
| Title Page L | Display | 64px | Regular |
| Title Page B | Display | 48px | Regular |
| Title Page S | Display | 40px | Regular |
| Heading L | Heading | 40px | Semibold |
| Heading B | Heading | 32px | Semibold |
| Heading S | Heading | 24px | Semibold |
| Subheading L | Subheading | 24px | Bold |
| Subheading B | Subheading | 20px | Bold |
| Subheading S | Subheading | 18px | Bold |
| Body Large Bold | Body | 18px | Bold |
| Body Large Medium | Body | 18px | Semibold |
| Body Large | Body | 18px | Regular |
| Body Base Bold | Body | 16px | Bold |
| Body Base Medium | Body | 16px | Semibold |
| Body Base | Body | 16px | Regular |
| Body Small Bold | Body | 16px | Bold |
| Body Small Medium | Body | 16px | Semibold |
| Body Small | Body | 16px | Regular |

**Rules:**
- Page titles use Title Page tokens; never use Heading for page-level titles
- Section headers use Heading tokens
- Labels, helper text, and UI copy use Body Base or Body Small
- Buttons use Body Base Bold or Body Small Bold depending on size

---

### 1.2 Color System

#### Primitive Colors (raw hex values)

**Primary (Brand Green)**
| Shade | Hex |
|---|---|
| 10 | #F1FFF4 |
| 20 | #C6FFD2 |
| 30 | #9CFFB1 |
| 40 | #70FC8E |
| 50 (Base) | #5CDF78 |
| 60 | #4AC263 |
| 70 | #39A550 |
| 80 | #2B873F |
| 90 | #1E6A2F |
| 100 | #07200C |

**Secondary (Brand Blue)**
| Shade | Hex |
|---|---|
| 10 | #EBF0FF |
| 20 | #BECEFF |
| 30 | #92ACFF |
| 40 | #658AFF |
| 50 (Base) | #3765F6 |
| 60 | #244FD4 |
| 70 | #153BB2 |
| 80 | #092A90 |
| 90 | #011C6E |
| 100 | #011040 |

**Neutrals (Gray/Slate)**
| Shade | Hex |
|---|---|
| 10 | #F6F7F9 |
| 20 | #E1E5EA |
| 30 | #D3DBE4 |
| 40 | #B0BECB |
| 50 (Base) | #929FB1 |
| 60 | #606E80 |
| 70 | #404B5A |
| 80 | #2F3B4C |
| 90 | #1F2633 |
| 100 | #000000 |

**Support Colors**
| Role | 10 | 50 | 60 | 70 | 80 | 100 |
|---|---|---|---|---|---|---|
| Success | #EFFAF0 | #5CE362 | #60CC65 | #4CAF50 | #3A923D | #0B310C |
| Warning | #FFF1E5 | #FF902E | #F07000 | #C85D00 | #9F4A00 | #431F00 |
| Info | #E5F1FF | #2E8EFF | #0070F3 | #005DCA | #004AA2 | #002249 |
| Error | #FFEDED | #FF5252 | #E53E3E | #C32B2B | #A11B1B | #450000 |

#### Semantic Tokens

Semantic tokens are the functional layer — always use semantic tokens in components, never raw primitives directly. They automatically adapt between Light and Dark modes.

**Background tokens:**
- `bg-default` — page/canvas background
- `bg-muted` — subtle section backgrounds
- `bg-inset` — inset/recessed surfaces
- `bg-inverse` — inverse (dark on light, light on dark)
- `bg-neutral-emphasis` — strong neutral fills
- `bg-neutral-muted` — weak neutral fills
- `bg-neutral-muted-alpha` — transparent neutral
- `bg-accent-emphasis` — strong accent (primary green)
- `bg-accent-muted` — soft accent tint
- `bg-overlay` — modal/drawer backdrop
- `bg-brand-primary` — brand primary fill
- `bg-brand-secondary` — brand secondary fill

**Foreground tokens:**
- `fg-default` — primary text
- `fg-muted` — secondary/helper text
- `fg-inverse` — text on dark backgrounds
- `fg-accent-emphasis` — accent-colored text
- `fg-brand-primary` — primary brand text
- `fg-brand-secondary` — secondary brand text

**Border tokens:**
- `border-default` — standard borders
- `border-muted` — subtle borders
- `border-muted-input` — input field borders at rest
- `border-muted-card` — card borders
- `border-inverse` — inverse borders
- `border-accent-emphasis` — focus rings (primary green)
- `border-overlay` — overlay borders
- `border-brand-primary` / `border-brand-secondary`

**Support tokens (per semantic type):**
- Background: `{type}-emphasis`, `{type}-muted-neutral`, `{type}-muted-color`
- Border: `{type}-emphasis`
- Foreground: `{type}-emphasis`
- Where `{type}` = info | success | warning | danger

---

### 1.3 Spacing Scale

| Token | Value |
|---|---|
| Space 100 | 4px |
| Space 200 | 8px |
| Space 300 | 12px |
| Space 400 | 16px |
| Space 600 | 24px |

Negative variants exist for Space 100–500 (same values, negative direction).

---

### 1.4 Border Radius

| Token | Value |
|---|---|
| Radius Small | 4px |
| Radius Medium | 8px |
| Radius Large | 16px |
| Radius X-Large | 24px |
| Radius Full | 9999px |

**Rules:**
- Buttons: Radius Full (pill shape)
- Cards, modals, dropdowns: Radius Large (16px)
- Inputs: Radius Full for single-line; Radius Medium for textarea
- Chips, tags, badges: Radius Full
- Table cells: no radius
- Tooltips: Radius Medium

---

### 1.5 Shadows (Elevation)

7 levels: 100 (X-Small) through 700 (3X-Large). Use:
- 100: subtle hover lifts
- 200: cards at rest
- 300: dropdowns, popovers
- 400: modals, dialogs
- 500+: high-priority overlays

---

### 1.6 Icons

- Library: 257 components, 1,542 variants
- Style: Outlined with filled active states (diamond-shaped Rayum icon motif visible throughout)
- Usage: icons are always paired with semantic meaning; use as left-icon, right-icon, or only-icon variants in buttons and nav items

---

## 2. COMPONENT LIBRARY

### 2.1 Button

**Sizes:** Large | Medium | Small
**Variants:** Primary | Danger
**Styles:** Fill | Outline | Ghost
**Icon slots:** Text only | Left Icon | Right Icon | Icon Only
**States:** Default | Hover | Focus | Active | Disabled

**Anatomy rules:**
- Shape: pill (Radius Full)
- Primary Fill: bg = Primary-50 (#5CDF78), text = dark
- Primary Outline: border = Primary-50, text = Primary-50, bg = transparent
- Primary Ghost: no border, text = Primary-50, bg = transparent
- Danger Fill: bg = Error-50 (#FF5252), text = white
- Focus state: green outline ring (border-accent-emphasis)
- Disabled: reduced opacity, no interaction

**CSS pattern:**
```css
.btn { border-radius: 9999px; font-weight: 700; }
.btn-primary-fill { background: #5CDF78; color: #1F2633; }
.btn-primary-outline { border: 1.5px solid #5CDF78; color: #5CDF78; background: transparent; }
.btn-primary-ghost { color: #5CDF78; background: transparent; border: none; }
.btn-danger-fill { background: #FF5252; color: #fff; }
.btn:focus-visible { outline: 2px solid #5CDF78; outline-offset: 2px; }
.btn:disabled { opacity: 0.4; pointer-events: none; }
```

---

### 2.2 Button Link

Inline link-style button. Primary (green), Secondary (neutral), Danger (red).
- Sizes: Large | Medium | Small
- Icon slots: Text | Left Icon | Right Icon
- States: Default | Hover | Focus | Active | Disabled
- No background or border; text color carries the variant

---

### 2.3 Input Text

**Sizes:** Large | Medium
**States:** Rest | Hover | Focus | Filled | Disabled | Feedback (Error/Warning/Success) | AI Feedback

**Anatomy:**
- Label above the field (required fields marked with *)
- Field: full-width, pill shape (Radius Full), border = `border-muted-input`
- Focus: border changes to `border-accent-emphasis` (green)
- Error: border = Error-60, text = Error-60, helper = validation message in red
- Warning: border = Warning-60, helper = orange
- Success: border = Success-60, helper = green
- AI Feedback: border = Info-50 (blue), helper shows "AI-generated insight" in blue
- Left/right slots: icons, country flags, select dropdowns
- Character counter: `0/100` aligned right below field
- Clear (×) button appears when filled

```css
.input-field {
  border-radius: 9999px;
  border: 1.5px solid #D3DBE4; /* border-muted-input */
  padding: 10px 16px;
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  width: 100%;
}
.input-field:focus { border-color: #5CDF78; outline: none; }
.input-field.error { border-color: #E53E3E; }
.input-field:disabled { background: #F6F7F9; opacity: 0.6; }
```

---

### 2.4 Input Text Area

- Default + Toolbar variant (Bold / Italic / Underline / Align left/center/right / More)
- Resizable (drag handle bottom-right)
- Same 7 states as Input Text
- Character counter bottom-right: `0/100`

---

### 2.5 Input Counter

- Sizes: Large | Medium
- Anatomy: [−] [value] [+] stepper inside a pill-shaped container
- Buttons: dark filled circles with +/− icons
- States: Rest | Hover | Focus | Filled | Disabled | Error | AI Feedback

---

### 2.6 Input Search

- Single size
- Search icon on the right; clear (×) appears on focus/filled
- Same 7 states as Input Text
- Focus: green border ring

---

### 2.7 Input Message (Chat)

- Row layout: [+] [text field] [emoji] [gif/image] [mic] [send]
- Send button: pill icon button, fills with primary green when text is present
- Used in messaging/comments contexts

---

### 2.8 Select Dropdown

**Modes:** Default (single) | Multiselect
**States:** Rest | Hover | Focus | Filled | Disabled | Error | Open

**Overlay anatomy:**
- Search field at top of dropdown
- Option list with icon + label
- With Description variant adds a subtitle line per option
- Option Group headers (bold, non-selectable)
- Dividers between groups
- "No options" empty state
- Multiselect: checkboxes per option; selected shown as chips in field (1, 2, 3, or "+N more")

---

### 2.9 Checkbox

**Sizes:** Medium (Button-Checkbox) | Small
**Field types:** Default | With Description | Card
**Group:** Default | Disabled | Readonly
**States:** Unchecked | Checked | Indeterminate × Default | Focus | Disabled | Readonly

- Checked: green fill with white checkmark
- Indeterminate: green fill with dash
- Focus: green outline ring
- Card type: full-width bordered card that highlights green when checked

---

### 2.10 Radio Button

**Sizes:** Medium | Small
**Field types:** Default | With Description | Card
**Group:** Default | Disabled | Readonly
**States:** Unchecked | Checked × Default | Focus | Disabled | Readonly

- Checked: green dot inside circle
- Card type: same card highlight pattern as Checkbox

---

### 2.11 Switch

**Sizes:** Small | Medium
**States:** Unchecked | Checked × Default | Hover | Focus | Disabled
**Field types:** Default | With Description | Card

- Unchecked: gray pill with × icon
- Checked: green pill with ✓ icon
- Card: highlighted green border when checked

---

### 2.12 Accordion

**Types:**
- Collapsible: chevron toggle (▼/▲), single expand
- Accordion: + / − toggle
- Collapsible-Showmore: arrow toggle (▼/▲), "show more" pattern

**States:** Default | Hover | Expanded | Disabled
- Expanded: content slot revealed below item; pink "Replace me" slot placeholder visible in design mode
- Disabled: muted opacity

---

### 2.13 Alert

**Types:** Info | Success | Warning | Error
**Styles:** Solid (full color fill) | Alpha (tinted background)
**Layouts:** Inline | Stacked
**Responsive:** Desktop | Mobile

**Color mapping:**
- Info: bg = Info-50, icon = ℹ
- Success: bg = Success-60, icon = ✓
- Warning: bg = Warning-50, icon = ⚠
- Error: bg = Error-50, icon = ✕

**Anatomy:** [Icon] [Title + description] [CTA Button] [CTA Link] [×Close]
Stacked layout places buttons below description.

---

### 2.14 Badge

**Positions:** Right Top | Right Center | Right Bottom
**Types:** Dot | Number (+2) | Text ("New")
**Colors:** Primary (green) | Secondary (blue)
**Sizes:** Medium | Small

**Name badge (trend indicator):**
- Inverse True: dark bg, white text
- Inverse False: colored bg
- Up/Down arrows with percentage (e.g. ▲36% / ▼23%)

---

### 2.15 Avatar

**Sizes:** Extra Large | Large | Medium | Small
**Types:** Image | Initials (e.g. "BD") | Icon (generic person)
- Presence indicator: green dot bottom-right
- All avatars are circular (Radius Full)

---

### 2.16 Avatar Group

**Layouts:** Overlap | Spaced
**Sizes:** XL | L | M | S
- Overflow counter: "+8" in a neutral circle at the end

---

### 2.17 Persona

A user row component combining Avatar + Name + @handle.

**Sizes:** Large | Medium | Small
**Variants:**
- Dropdown: avatar + name + handle + chevron (v)
- Message: avatar + name + handle + timestamp + unread count badge
- With Action: avatar + name + action context (e.g. "commented on Project X")

**States:** Default | Hover | Focus | Active

**Message-Dropdown panel:** scrollable list of Persona-Message rows + "View in message center" CTA button.

---

### 2.18 Card

12 component types, 94 variants. General rules:
- Background: `bg-default` or `bg-muted`
- Border: `border-muted-card`
- Radius: Large (16px)
- Shadow: 200 (at rest), 300 (hover)
- Padding: Space 400 (16px) or Space 600 (24px)
- Cards support: KPI metrics, charts, lists, images, actions

---

### 2.19 Chart

**Types:**
- Bar Chart (comparison true/false, days/months/years X-axis)
- Line Chart (comparison true/false)
- Donut Chart (2/3/4 segments)
- Progress Bar Chart (Medium/Small, Primary/Secondary)
- Grid Chart (Neutral/Primary/Secondary)
- Trend Line Chart (Primary/Secondary)

**Color:** Primary charts use Primary green; comparison mode adds Secondary blue
**Legend:** horizontal pill indicators with labels
**Tooltip:** dark card with title, value, period comparison, trend %
**KPI Indicator:** large number + trend badge + description text
**Axes:** X-axis (Days/Months/Month-Year/Years), Y-axis (4/5/6 levels, with/without gridlines)

---

### 2.20 Tag

**Sizes:** Large | Medium | Small
**Styles:** Filled | Stroke
**Semantic types:**
- Brand → green (Primary)
- Neutro → gray
- Inverse → black/dark
- Info → blue
- Success → green (lighter)
- Warning → orange
- Error → red

**Tag-Status variants:** Active (green) | Archived (red) | Scheduled (orange) | Draft (blue) | New (blue)

**Tag-Brand:** Primary (green) | Secondary (blue) | Tertiary (purple-ish), in Default and Inverse modes.

All tags: Radius Full (pill), with Rayum diamond icon on left.

---

### 2.21 Chip

**Sizes:** Medium | Small
**Styles:** Filled | Light
**Types:** Informative | Dismissible (with ×)
**States:** Default | Hover | Focus | Selected | Selected Focus | Disabled

- Selected: dark fill (near black) with white text
- Focus: green outline ring
- Chip-Group: wrapping row of chips

---

### 2.22 Breadcrumbs

**Variants:** Icon with text | Text only | Icon only
**Levels:** 1–5 (More truncates to "…")
**Separators:** Chevron (›) | Slash (/)
**States:** Active (bold) | Inactive | Inactive Hover

---

### 2.23 Pagination

**Sizes:** Small | Medium
**Styles:** Text ("Page 2 of 10") | Spaced (1 2 3 … 10) | Congested (1 2 3 4 … 8 9 10)
**Controls:** Previous/Next with chevrons
**Dot pagination:** 2–6 dots for carousels/slideshows
**Tab pagination:** pill-shaped active indicator

---

### 2.24 Tab

**Types:**
- Basic: icon + label, multiple tabs, active underline
- Dynamic: closeable (×) + addable (+)

**States:** Inactive | Hover | Focus | Active | Disabled
- Active: bold label + green underline
- Badge count: green number badge on tab

---

### 2.25 Segmented Controls

**Sizes:** Large | Medium | Small
**Items:** 2–5 per group
**Content:** Text | Icon + Text | Icon only
**Alignment:** Left | Center | Right (for base items)

**Segmented-Tag states:** Default | Hover | Active | Active Hover | Disabled

- At rest: outline style
- Active: dark filled with white text
- Focus: green ring

---

### 2.26 Dropdown Menu

**Sizes:** 3–8 items
**Item types:** Basic | With Key Shortcut (⌘F) | With Submenu (›) | With Switch | Slot | Header | Divider
**States:** Default | Hover | Focus | Disabled

- Container: white card, Radius Large, Shadow 300
- Items: full-width rows with icon + label
- Hover: muted bg highlight
- Focus: green ring on item

---

### 2.27 Dialog / Modal

**Types:**
- Confirmation (icon + title + description + Cancel + Action)
- Content (title + slot + footer buttons)

**Icon types:** Info (blue) | Warning (orange) | Success (green) | Error (red)

**Footer layouts:**
- Inline: Link + Outline Button + Fill Button
- Stacked: Link on top, Fill Button below

- Container: white card, Radius Large, Shadow 400, centered with overlay backdrop

---

### 2.28 Tooltip

**Positions:** Below | Top | Start | End
**Alignment:** Left | Center | Right
**Types:** Default (light) | Inverted (dark)
**Content:** Only Text | Title + Body | Text with Button
**Inline variant:** small text-only tooltip beside elements

- Max width: 240px (wraps text beyond)
- Beak: small triangle pointer
- Radius: Medium (8px)

---

### 2.29 Notification

**Types:** Warning | Success | Intelligence | Team | Team Reply
**Sizes:** Desktop | Mobile
**States:** Default | Hover

**Anatomy:**
- [Colored icon] [Title + timestamp] [Body text] [CTA Button] [Unread dot] [Delete ×]
- Team Reply expands an inline reply input with Send/Cancel
- Notifications-Dropdown: panel with scrollable notification list + "See all notifications" CTA

---

### 2.30 Navbar User

**Breakpoints:** Desktop | Tablet | Mobile
**Levels:**
- Level 1: Page title + subtitle + search + notification icons + avatar + name
- Level 2: Back arrow + Page title + same right-side controls

Mobile collapses to: hamburger menu icon + page title.

---

### 2.31 Sidebar

**Breakpoints:** Desktop (full labels) | Tablet (icons only column) | Mobile (drawer overlay)

**Nav item states:** Default | Hover | Focus | Active | Disabled
- Active: green filled pill background
- Submenu: chevron toggles nested items

**Sidebar anatomy:**
- Logo/brand at top
- Main menu section with nav items
- Others section (Settings, Help)
- Bottom: user avatar + name + @handle + Light/Dark toggle + "Download our Mobile App" CTA

**Divider types:** Line | Text (section header)

---

### 2.32 Action Bar

**Item-Action-Bar:** single action slot — Button | Button Link | Link | Segmented Tag | Custom Slot
**Action-Bar:** multi-action row — up to 7 Buttons or Button Links in a row

---

### 2.33 Calendar

**Dialog types:** Basic | Date Range (dual month)
**Day states:** Default | Hover | Active (selected, green fill) | Event (dot) | Disabled | Range Start | Range Middle | Range End

**Header:** month + year label with left/right chevron navigation
**Footer:** Cancel | Done buttons

---

### 2.34 Datepicker

**Sizes:** Large | Medium
**Mode:** Single | Range (From / To)
**States:** Default | Hover | Focus | Filled | Disabled | Error | Open

- Format: DD/MM/YYYY
- Calendar dialog opens inline below the input on Open state
- Error: red border + validation text

---

### 2.35 File Upload

**Uploader types:**
- Drag & drop zone (dashed border, cloud icon, "Click to upload or drag and drop")
- Inline: label + "No file selected" + "Select file" button + "Maximum file size: 20MB"

**States:** Empty | Active (dragging, blue border) | Uploading (70% progress ring) | Complete (file chip with ×)

**Uploaded-Files list:** Document | Image | Figma | Photo file types with filename, size, and ••• menu

---

### 2.36 Key Shortcut

**Display styles:** Plain text | Light box | Bold text | Bold box
**Modifier keys:** ⇧ ⌥ ⌘ (Mac) and combinations
**Usage:** inside dropdown items, tooltips, command palettes

---

### 2.37 Link

**Sizes:** Medium | Small
**States:** Default | Hover | Focus | Active | Disabled
- Color: Secondary blue (#3765F6)
- External link icon (↗) inline after text
- Focus: green outline ring

---

### 2.38 Divider

**Orientations:** Horizontal | Vertical
**Styles:** vary by opacity/weight — 4 horizontal, 4 vertical variants

---

### 2.39 Progress

Linear progress bar with label above and percentage value on the right.
- Fill color: Secondary blue (#3765F6)
- Track: neutral gray
- States: 0% | 25% | 50% | 75% | 100%

---

### 2.40 Range Slider

**Types:**
- Single handle: value displayed in numeric input box on the right
- Dual handle (range): min/max values shown below the track

- Track fill: Secondary blue
- Handle: white circle with border
- Track background: neutral gray

---

### 2.41 Rating

**Sizes:** Medium | Small
**Types:** Type 1 (score + stars + count) | Type 2 (stars + score + count) | Simple (star + score + count)
**Icons:** Star | Heart
**States:** Active (blue filled) | Inactive (gray outline)

---

### 2.42 Scroll

Scrollbar component at 25/50/75% fill, Start/Center/End positions. Thin pill-style thumb on neutral track.

---

### 2.43 Stepper

**Orientations:** Vertical | Horizontal
**Sizes:** Medium | Small
**Alignment:** Center | Left
**Indicator types:** Number | Icon

**Step states:** Default | Active (dark filled circle) | Completed (green check) | Disabled (muted) | Error (red ×)
**Focus/Hover variants** exist for each state.

Up to 6 steps. Each step has Title, Description, and optional content slot.

---

### 2.44 Table

A full-featured data table. Anatomy:

**Header row:** sortable column headers with sort icon (↑↓)
**Row cells support:** text+description, user (avatar+name), rating stars, status tag, button link, price, action buttons (outline+fill), trend badge, image+title
**Features:**
- Row selection (checkboxes)
- Bulk action bar on selection ("2 products selected" + action buttons)
- Search bar + Filter by + Sort by + Add Product button
- Pagination: "1 2 3 … 10", "10-20 of 200 items", "Items per page: [10]"
- "View more" inline expand pattern
- Responsive: mobile collapses to card-like rows

---

### 2.45 Toolbar

**Item counts:** 2 | 3 | 4 | 5 | 6 | 7 | 8 | More
**Common tool sets:**
- 2: Undo / Redo
- 3: Align left/center/right
- 4: Bold / Italic / Underline / Color
- More: Body style dropdown + color picker + B/I/U + alignment + emoji + ···

**Button-Toolbar states:** Default | Hover | Focus | Active (dark filled) | Disabled

---

### 2.46 Treeview List

Folder/file hierarchy. Nodes: collapsed (▶ folder) | expanded (▼ folder) | leaf (file icon)
**States:** Default | Hover (bg highlight)
Two visual modes: without highlight bg | with highlight bg

---

### 2.47 Verification Code

4-digit OTP input. Each digit: large rounded square field.
**Digit states:** Default (empty) | Focus (green outline + cursor) | Filled (large digit) | Error (red outline + red digit)

---

### 2.48 Persona / Cursor / Other Utilities

**Cursor:** Full OS cursor set (pointer, text, grab, grabbing, zoom, resize, etc.) + Touch Gesture library (tap, swipe, pinch, rotate, etc.)

---

## 3. LAYOUT & BREAKPOINTS

### Dashboard Layout (reference from screens)
- **Desktop:** full sidebar (220px) + top navbar + main content area
- **Tablet:** icon-only sidebar (60px collapsed) + top navbar + content
- **Mobile:** no sidebar (drawer via hamburger) + simplified top navbar

### Grid
- Desktop: multi-column card grid (typically 3–4 columns for KPI cards)
- Tablet: 2-column
- Mobile: 1-column stacked

### Spacing principles
- Page padding: Space 600 (24px) on desktop, Space 400 (16px) on mobile
- Card internal padding: Space 400–600
- Between cards: Space 400 (16px)
- Between form fields: Space 400 (16px)
- Between label and input: Space 100 (4px)
- Between input and helper text: Space 100 (4px)

---

## 4. INTERACTION PATTERNS

### Focus states
- All interactive elements: `outline: 2px solid #5CDF78; outline-offset: 2px;`
- Never remove focus outlines; Rayum is keyboard-accessible

### Hover states
- Buttons: slight brightness shift on primary fill
- Nav items: `bg-neutral-muted` background
- Table rows: `bg-muted` background
- Cards: shadow lifts from 200 → 300

### Disabled states
- Always: `opacity: 0.4; pointer-events: none; cursor: not-allowed;`

### Validation feedback
- Error: red border + red validation text with ● icon
- Warning: orange border + orange text with ⚠ icon
- Success: green border + green text with ✓ icon
- AI Feedback: blue border + blue "AI-generated insight" with ✦ icon

### Empty states
- Search/filter with no results: show "No options" text in dropdown
- Tables: empty state illustration + CTA

---

## 5. DARK MODE

All semantic tokens have Light and Dark mode values built in via Variable Modes. To apply Dark mode, switch the mode on the semantic token layer — no component changes are needed. Background tokens invert from near-white to near-black, foreground tokens invert correspondingly. The green primary and support colors remain consistent across both modes.

---

## 6. CODE IMPLEMENTATION GUIDE

### CSS Variables (minimal starter set)
```css
:root {
  /* Brand */
  --color-primary: #5CDF78;
  --color-primary-dark: #39A550;
  --color-primary-light: #C6FFD2;
  --color-secondary: #3765F6;

  /* Neutrals */
  --color-bg: #F6F7F9;
  --color-surface: #FFFFFF;
  --color-border: #D3DBE4;
  --color-border-input: #D3DBE4;
  --color-text-default: #1F2633;
  --color-text-muted: #606E80;
  --color-text-subtle: #929FB1;

  /* Support */
  --color-success: #4CAF50;
  --color-warning: #F07000;
  --color-info: #0070F3;
  --color-error: #E53E3E;

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 9999px;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;

  /* Typography */
  --font: 'Inter', sans-serif;
}
```

### Dark mode
```css
[data-theme="dark"] {
  --color-bg: #1F2633;
  --color-surface: #2F3B4C;
  --color-border: #404B5A;
  --color-text-default: #F6F7F9;
  --color-text-muted: #929FB1;
}
```

### Base resets for Rayum UI
```css
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: var(--font); background: var(--color-bg); color: var(--color-text-default); }
button, input, select, textarea { font-family: var(--font); }
:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
```

---

## 7. DESIGN VOICE & COPY RULES

Rayum UI copy is:
- **Direct:** "Save changes" not "Submit form"
- **Specific:** "12% ahead of target this week" not "doing well"
- **Action-first:** CTAs use imperative verbs (View Order, Restock Now, Reply, Fix Now)
- **Contextual:** Notifications include the what, who, and when
- **Measured:** No exclamation marks except in celebration states

Placeholder patterns from Rayum:
- Input placeholders: "Placeholder Text", "DD/MM/YYYY", "Enter a large description"
- Empty slot: "Replace me" (pink in design mode)
- Generic names: "William Donat / @willydonat", "John Doe / @johndoe"

---

## 8. QUICK REFERENCE — COMPONENT DECISION TREE

| Need | Use |
|---|---|
| Primary action | Button (Fill, Primary) |
| Secondary action | Button (Outline or Ghost) |
| Destructive action | Button (Fill, Danger) |
| Inline link action | Button Link |
| Navigation link | Link component |
| Short text label | Tag |
| Status indicator | Tag-Status |
| User identification | Avatar / Persona |
| Grouped user avatars | Avatar Group |
| Notification count | Badge (Number) |
| Online presence | Badge (Dot) |
| Binary toggle | Switch |
| Single choice | Radio Button |
| Multiple choice | Checkbox |
| Dropdown selection | Select Dropdown |
| Multi-value selection | Select Dropdown (Multiselect) |
| Filter chips | Chip / Chip-Group |
| Page navigation | Breadcrumbs |
| Content tabs | Tab |
| Toggle between views | Segmented Controls |
| Step-by-step flow | Stepper |
| List navigation | Pagination |
| Expandable content | Accordion |
| System feedback | Alert |
| Contextual hint | Tooltip |
| User action items | Notification |
| Date selection | Datepicker / Calendar |
| File attachment | File Upload |
| Data display | Table |
| Metrics display | Card (KPI) + Chart |
| User list rows | Persona |
| Nested file structure | Treeview List |
| OTP/code input | Verification Code |
| Number input | Input Counter |
| Text range | Range Slider |
| Auth/search bar | Input Search |
| Chat message input | Input Message |
| Long text | Input Text Area |
| Confirm action | Dialog |
| Context menu | Dropdown Menu |
| Rich text editing | Toolbar + Input Text Area |
| Page structure | Sidebar + Navbar User |

---

## 9. SAMPLE SCREEN PATTERNS (from Rayum CRM)

### Dashboard
```
[Navbar: Page Title + subtitle | search | notifications | user avatar + name]
[Sidebar: Logo | Main menu items | Others | User profile + Light/Dark toggle]
[Content:
  Row 1: KPI Cards (Total Revenue | Pipeline Volume | Conversion Rate | Team Updates)
  Row 2: Annual Revenue Performance chart (Line) | Traffic Sources (Donut)
  Row 3: Top Selling Products table | Action Required alerts
]
```

### KPI Card anatomy
```
[Card]
  [Label: "Total Revenue"]
  [Value: "$124,500"]
  [Trend badge: ▲12% vs last week]
[/Card]
```

### Notification panel
```
[Notification: Warning | Stock Critical | just now]
  "Unexpected demand spike (+40%) on Eames House Bird. Only 2 units left."
  [Restock Now button]

[Notification: Success | New Order #5205 | 12 min ago]
  "Order confirmed. Total: $12,450."
  [View Order button]
```

---

## 10. CHECKLIST BEFORE DELIVERING RAYUM UI

- [ ] All colors sourced from token system (no arbitrary hex values)
- [ ] Inter font loaded and applied to all text
- [ ] Border radius matches component type (pill for buttons/inputs/chips, 16px for cards/modals)
- [ ] Focus states visible with green ring on all interactive elements
- [ ] Disabled states use opacity: 0.4 + pointer-events: none
- [ ] Error/warning/success/AI feedback states use correct colors and icons
- [ ] Spacing uses the 4/8/12/16/24px scale
- [ ] Shadows match elevation context (200 cards, 300 dropdowns, 400 modals)
- [ ] Icons follow outlined style with diamond motif
- [ ] Copy is direct, action-first, and contextual
- [ ] Light/Dark mode semantic tokens applied (not hardcoded primitives)
- [ ] Responsive breakpoints accounted for (Desktop/Tablet/Mobile)
- [ ] Table includes pagination, search, filter, and selection if data-heavy
- [ ] Charts use correct color (primary green for single series, + blue for comparison)
