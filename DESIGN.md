---
name: Zen-I Assistant
description: A calm, grounded personal records assistant for notes, money, plans and learning.
colors:
  paper: "#f8fafc"
  surface: "#ffffff"
  surface-muted: "#e9eef6"
  navy-ink: "#1e40af"
  navy-ink-deep: "#1e3a8a"
  slate-body: "#334155"
  muted-ink: "#475569"
  hairline-blue: "#dbeafe"
  hairline-slate: "#e2e8f0"
  navy-wash: "#dbeafe"
  amber-ember: "#d97706"
  amber-ember-deep: "#b45309"
  amber-wash: "#fef3c7"
  on-navy: "#ffffff"
  success: "#15803d"
  success-wash: "#dcfce7"
  destructive: "#dc2626"
  destructive-wash: "#fee2e2"
  chart-spend: "#2563eb"
  ripple-ink: "rgba(15,23,42,0.04)"
  scrim: "rgba(0,0,0,0.5)"
typography:
  title:
    fontFamily: "Fira Code, ui-monospace, monospace"
    fontSize: "22px"
    fontWeight: 600
  heading:
    fontFamily: "Fira Sans, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
  body:
    fontFamily: "Fira Sans, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
  label:
    fontFamily: "Fira Sans, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
  caption:
    fontFamily: "Fira Sans, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
  micro:
    fontFamily: "Fira Sans, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 400
  control:
    fontFamily: "Fira Sans, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
  control-sm:
    fontFamily: "Fira Sans, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
  figure:
    fontFamily: "Fira Code, ui-monospace, monospace"
    fontSize: "14px"
    fontWeight: 600
    fontFeature: "tnum"
rounded:
  sm: "10px"
  md: "14px"
  lg: "18px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.navy-ink}"
    textColor: "{colors.on-navy}"
    typography: "{typography.control}"
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "48px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.navy-ink-deep}"
    typography: "{typography.control}"
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "48px"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.on-navy}"
    typography: "{typography.control}"
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "48px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted-ink}"
    typography: "{typography.control}"
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "48px"
  chip-active:
    backgroundColor: "{colors.navy-ink}"
    textColor: "{colors.on-navy}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
  chip-inactive:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted-ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.navy-ink-deep}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "16px"
  field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.navy-ink-deep}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "46px"
  badge:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.navy-ink-deep}"
    typography: "{typography.micro}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
---

# Design System: Zen-I Assistant

## Overview

**Creative North Star: "The Lantern Ledger"**

Zen-I looks like a ledger kept at night: navy ink for the records and their structure, one warm amber lamp for the thing that needs attention. Every screen is a page in the same book, so the switch between money, notes, plans and study should feel like turning a page, not changing apps.

The app runs in Operate mode. Scanability, consistency and Android expectations outrank expression. Density is comfortable rather than airy, surfaces are paper-flat with hairline rules, and the figures are set in Fira Code so numbers read like ledger entries. Expression lives in precision: monospace screen titles, a single ember signal, and the physical gradient account cards.

Light and dark are peer schemes, not an inversion. Motion is brief and functional (140/220/320ms), selection carries a haptic tick, and the Android Back gesture and safe areas are always honored. Android is the design authority; Material supplies the structure and the brand lives in the theme.

**Key Characteristics:**

- Navy Ink structure with a single Amber Ember signal.
- Fira Sans for prose; Fira Code for figures and screen titles.
- Flat, hairline-bordered surfaces; one rare raised lift.
- 4pt rhythm, 16px gutters, 48dp targets.
- Light and dark share one semantic token set.
- Android-first, portrait, safe-area aware.

## Colors

A two-ink palette: deep navy for structure and a single warm amber for attention, over cool paper neutrals.

### Primary

- **Navy Ink** (#1e40af): primary buttons, active tab, selected chips, focus ring. Carries action and current selection.
- **Navy Ink Deep** (#1e3a8a): screen and section foreground, titles and card headings. Structure, not action.
- **Navy Wash** (#dbeafe): selected-tab pill, soft primary fills and badge backgrounds. Never used for text.
- **On Navy** (#ffffff): text and icons on navy fills.

### Secondary

- **Amber Ember** (#d97706): attention and comparison. A budget at 85% or more, the income comparison line, a single accent badge. Not a general highlight.
- **Amber Ember Deep** (#b45309): amber text on Amber Wash.
- **Amber Wash** (#fef3c7): soft amber background.

### Neutral

- **Paper** (#f8fafc): app background and input background.
- **Surface** (#ffffff): cards, sheets and the tab bar.
- **Surface Muted** (#e9eef6): tracks, inner wells and the default badge background.
- **Slate Body** (#334155): long-form note and answer text.
- **Muted Ink** (#475569): labels, subtitles, metadata and inactive icons.
- **Hairline Blue** (#dbeafe): card and control borders.
- **Hairline Slate** (#e2e8f0): dividers and the chart grid.
- **Ripple Ink** (`rgba(15,23,42,0.04)` light, `rgba(255,255,255,0.08)` dark): Android ripple. **Scrim** (`rgba(0,0,0,0.5)`): sheet backdrop.

### Status

- **Success** (#15803d) on **Success Wash** (#dcfce7): income deltas and completed states.
- **Destructive** (#dc2626) on **Destructive Wash** (#fee2e2): destructive fills and over-limit warnings.
- **Destructive Text** (#b91c1c light / #fca5a5 dark): destructive labels, warning icons and inline error copy that must stay legible on Paper.
- **Chart Spend** (#2563eb): the value series. Amber Ember is the comparison series.

Dark mode is a peer scheme, not an inversion: night paper, lifted navy and a warmer amber. Its exact values live in `.impeccable/design.json` under `darkPalette`.

### Named Rules

**The One Ember Rule.** Amber is a signal, not decoration. It appears where the user must look — a budget nearing its limit, the income comparison, a single accent badge — and stays rare everywhere else.

**The Meaningful Color Rule.** Navy means "act or selected"; success and destructive mean a real delta or error. Never use status colors as ornament.

**The Two-Ink Chart Rule.** Charts use exactly two data inks: Chart Spend for values and Amber Ember for the comparison line. No third hue.

## Typography

**Display Font:** Fira Sans (fallback: system-ui, sans-serif)
**Body Font:** Fira Sans
**Figure / Title Font:** Fira Code (fallback: ui-monospace, monospace)

**Character:** Humanist sans keeps prose calm and legible; monospace gives numbers and screen titles the authority of a ledger entry. The pairing is the product's voice: quiet prose, exact figures.

### Hierarchy

- **Display** (30, reserved): defined in the token scale but not used by any current screen. Do not introduce it without a surface that needs it.
- **Title** (22, Fira Code SemiBold): empty-state questions, hero figures and the sign-in title.
- **Screen title** (17, Fira Code SemiBold): exactly one per screen header; subtitle at 11 in Fira Sans.
- **Heading** (16, Fira Sans SemiBold): section and card headings.
- **Body** (14, Fira Sans Regular, line-height 20–22): prose, answers, list rows and inputs.
- **Label** (13, Fira Sans Medium, line-height 20): progress labels and supporting copy.
- **Caption** (12, Fira Sans Regular, line-height 17–19): hints, timestamps, metadata; field labels use Medium.
- **Micro** (11, Fira Sans Regular/Medium): overlines and IDs. Uppercase micro carries 0.6 letter-spacing.
- **Figures** (Fira Code 400/500/600, `tnum`): amounts, counts, percentages, dates and times. The one sanctioned exception is the 12px StatCard delta, which uses Fira Sans Medium with tabular numbers.

### Named Rules

**The Tabular Truth Rule.** If it is a number, it is tabular. The default face is Fira Code; the only exception is the small StatCard delta, which keeps tabular figures in Fira Sans Medium.

**The Mono Title Rule.** Screen titles and empty-state questions use Fira Code SemiBold; section headings use Fira Sans SemiBold. This contrast is the signature — do not flatten it.

**The Signed-Figure Rule.** `money()` emits U+2212 (`−`) for negatives, never a hyphen. When only magnitude matters — an over-budget amount, a deleted total — use `moneyAbs()` instead of stripping the sign by hand.

**The Two-Family Rule.** Fira Sans and Fira Code only. No third family, no display serif, no icon font.

## Layout

A single 4pt spatial rhythm, with portrait Android as the authority.

- Screen gutter 16; header top inset +8, bottom 12; scroll content gap 24; bottom padding 48 when tabbed.
- Section internal gap 12; card header 16 all sides with 12 at the bottom; card body 16 horizontal, 12 top, 16 bottom.
- Bottom navigation is 62dp plus the system inset: four destinations and one raised Ask action (54dp, lifted 18dp).
- Every touch target is at least 48dp; icon buttons are 44dp with hit slop.
- Forms live in a bottom sheet capped at 88% height, with a 16 content gap and safe-area bottom padding.
- No breakpoints are defined. The app is portrait-phone first; do not invent tablet layouts — follow Material navigation guidance if expanded widths are added.

### Named Rules

**The 4pt Rule.** Spacing comes from `xs`–`xxl` (4/8/12/16/24/32). No arbitrary gaps.

**The 16px Gutter Rule.** Screen edges are 16, not 12 or 20. Cards and sheets inherit that gutter internally.

**The 48dp Target Rule.** Anything tappable is at least 48dp tall; icon-only controls get hit slop to reach it.

## Elevation & Depth

Flat by default. Depth is communicated by tonal layering (Paper → Surface → Surface Muted) and hairline borders, not by shadows. Exactly one shadow exists — a soft 6px lift at 10% in light and 45% in dark, with `elevation: 6` — reserved for the raised Ask action or a genuinely floating surface. Sheets use a scrim and a top border instead of a shadow.

### Shadow Vocabulary

- **Floating** (`0 6px 12px rgba(15,23,42,0.10)` light; `0 6px 12px rgba(15,23,42,0.45)` dark): the raised Ask action and nothing else by default.

### Named Rules

**The Hairline-or-Shadow Rule.** A surface gets a hairline border or a shadow, never both.

**The One Lift Rule.** One raised element per screen. On the dashboard that is the Ask action; do not add competing floating cards.

## Shapes

Rounded, never sharp. Radius is role-based: `sm` (10) for small inner surfaces, `md` (14) for controls and inputs, `lg` (18) for cards, sheets and account cards, and `pill` (999) for anything action- or tag-like. Buttons, chips, badges, the active-tab indicator and progress tracks are pills. Borders are 1px hairline; dividers are 1px Hairline Slate. The sheet grabber is a 36×4 pill. Account cards are a fixed 280×172 with 18 radius and decorative translucent circles.

### Named Rules

**The Pill-for-Actions Rule.** If it can be pressed, tagged or selected, it is a pill. A rectangular button is off-system.

**The 10px Floor Rule.** No radius below 10. Sharp corners do not exist in this system.

## Components

### Buttons

- **Shape:** pill (999), 48dp tall (40 for small), 18 horizontal padding (14 for small).
- **Primary:** Navy Ink fill, On Navy label in Fira Sans SemiBold 14. One per view.
- **Secondary:** Surface fill, Hairline Blue border, Navy Ink Deep label. The default button.
- **Destructive:** Destructive fill, On Navy label, reserved for irreversible actions.
- **Ghost:** transparent, Muted Ink label, for tertiary actions.
- **Press / Focus:** Android ripple in Ripple Ink, opacity 0.85, haptic selection. Disabled is 0.5 opacity. The focus ring token is Navy Ink; no screen currently draws a custom focus treatment beyond the native caret and ripple.

### Chips

- **Style:** pill, 1px border, 14 horizontal / 8 vertical padding, Caption 12, 44 minimum height so filter rows stay tappable without changing the visual padding.
- **Selected:** Navy Ink fill, On Navy label, Navy Ink border.
- **Unselected:** Surface fill, Hairline Blue border, Muted Ink label.
- **Use:** filters and tag pickers only, never as primary actions.

### Cards / Containers

- **Corner Style:** 18.
- **Background:** Surface.
- **Shadow Strategy:** none; hairline border only (see Elevation).
- **Border:** 1px Hairline Blue.
- **Internal Padding:** 16; header 16/16/12, body 16/12/16.
- **Header:** title Heading 16 Fira Sans SemiBold, subtitle Caption 12, optional Caption 12 action.
- **Rule:** cards are for content that genuinely needs grouping. Plain sections use `Section` plus spacing, not a card.

### Empty States

A quiet centred block: optional 26px muted icon, a Fira Code SemiBold 22 question (line-height 28), one Caption 12 line of guidance, and an optional action. The mono question is deliberate — an empty state is a title, not prose.

### Inputs / Fields

- **Style:** Paper fill, 1px Hairline Blue border, 14 radius, 46 minimum height (88 multiline), 12 horizontal padding.
- **Label:** Caption 12 Fira Sans Medium in Muted Ink, 6 above the field.
- **Focus:** native caret and keyboard; no custom glow or border-color shift is implemented. Keep it that way rather than adding an off-system ring.
- **Error:** Destructive border plus Destructive Text at Caption 12 below the field; the error line is a polite live region. Disabled fields drop to 0.5 opacity.
- **Disabled:** 0.5 opacity, no ripple, state exposed to assistive tech.

### Navigation

- **Bottom bar:** Surface, 1px Hairline Slate top border, 62dp plus the safe-area inset.
- **Destinations:** Home, Notes, Money, Plan. The active tab gets a Navy Wash pill, a filled Navy Ink Deep icon and a SemiBold label; inactive tabs use Muted Ink.
- **Ask action:** 54dp Navy Ink circle with an On Navy icon, lifted 18dp with the single Floating shadow. It is the product's core move, not a fifth tab.
- **Labels:** 10px Fira Sans with 0.2 letter-spacing. Screen headers use a 44dp back target, a Fira Code title at 17 and an 11px subtitle.

### Badges

- **Style:** pill, 2 vertical / 8 horizontal padding, 11px Fira Sans Medium.
- **Tones:** default Surface Muted; primary Navy Wash on Navy Ink; accent Amber Wash on Amber Ember Deep; success Success Wash on Success; danger Destructive Wash on Destructive; outline transparent with a Hairline Blue border.
- **Use:** status only, never for counts that need scanning.

### Icons

Phosphor only, weight `regular` at rest and `bold` on actions. One size per role: 11 badge, 13 inline/stat, 15 account-card menu, 16 button, 18 row menu, 20 action sheet, 22 tab/header back, 24 raised Ask, 26 empty state. Do not invent sizes between roles.

### Sheet

- **Style:** Surface, 18 top corners, 1px Hairline Blue top border, scrim backdrop, maximum 88% height.
- **Header:** 16 horizontal padding, 12 top / 8 bottom, 16 Fira Sans SemiBold title, 12 caption subtitle, 36dp close target with hit slop to clear 48dp.
- **Content:** 16 horizontal, 16 gap, keyboard-aware, bottom inset + 16.

### Stat Cards

Borderless quiet metrics: an uppercase Micro 11 label with 0.6 letter-spacing, a value in Fira Code SemiBold 22 tabular, and an optional 12px delta in Success or Destructive Text. No card, border or shadow — spacing is the grouping.

### Progress

A 6dp pill track in Surface Muted. The fill is Navy Ink below 85%, Amber Ember at 85–99% and Destructive at 100% or more. Label 13; the right-hand value is Fira Code Micro tabular.

### Signature: Account Card

A physical-feeling 280×172 card with an 18 radius and a per-kind gradient (GCash blue, BDO deep blue, cash teal-green, other navy). White text: 15 SemiBold name, 11 mono kind pill, 26 mono semibold balance, 11 mono monthly income. Two translucent circles give it depth without a shadow. This is the one place gradients are allowed.

### Signature: Trend Area Chart

200dp tall: a Chart Spend area with a 0.28→0.02 vertical fade, a 2px line, an Amber Ember dashed income line, Hairline Slate grid and 10px labels. Always paired with a "View data table" toggle for accessibility.

## Do's and Don'ts

### Do:

- **Do** pull every color, space, radius, font and motion value from `src/theme/tokens.js` through `useTheme()`.
- **Do** set every number in tabular figures, defaulting to Fira Code.
- **Do** use the 4pt scale and 16px screen gutters.
- **Do** use pill shapes for buttons, chips, badges and selection indicators.
- **Do** pair a hairline border with flat surfaces; reserve the single shadow for the Ask action.
- **Do** keep amber rare and meaningful.
- **Do** preserve 48dp touch targets, safe-area insets and Android Back behavior.
- **Do** design light and dark together and verify both.

### Don't:

- **Don't** hardcode hex values in screens; use the semantic palette.
- **Don't** set figures in Fira Sans (except the sanctioned StatCard delta) or add a third font family.
- **Don't** put shadows on cards, sections or list rows.
- **Don't** use success, destructive or amber as decoration.
- **Don't** wrap plain sections in cards.
- **Don't** introduce sharp corners or radii below 10.
- **Don't** copy iOS controls, bottom-only navigation or Cupertino dialogs; theme Material structure instead.
- **Don't** add tablet breakpoints or layouts that are not defined.
