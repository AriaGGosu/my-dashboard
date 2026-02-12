/**
 * KPR Brand Book Design System — Version 1.0
 * Based on KPR Brand Book: colors (primary + secondary), typography (IBM Plex Mono, Whyte-style, Hexaframe-style), logo/symbol, patterns.
 */

/** Primary: black & white */
export const KPR_PRIMARY = {
  black: "#000000",
  white: "#ffffff",
} as const;

/** Secondary palette (Brand Book p.14): extended color family for art and visuals */
export const KPR_SECONDARY = {
  olive: { 300: "#879C91", 500: "#6A8275", 700: "#383D3B" },
  navy: { 300: "#A2AABD", 500: "#586685", 700: "#282752" },
  thistle: { 300: "#C2BAC5", 500: "#AF9CB4", 700: "#73304F" },
  smoke: { 300: "#CBCBCB", 500: "#868187", 700: "#584B5B" },
  yellow: { 300: "#F4E6B5", 500: "#F9D477", 700: "#ECB935" },
  magenta: { 300: "#FF76A5", 500: "#FE075B", 700: "#AF0A32" },
  coral: { 300: "#FF7E12", 500: "#FF591F", 700: "#FA231E" },
  lime: { 300: "#25F893", 500: "#00E578", 700: "#00AF5C" },
} as const;

/** Accent for CTAs and highlights (magenta/lime from brand) */
export const KPR_ACCENT = {
  magenta: KPR_SECONDARY.magenta[500],
  lime: KPR_SECONDARY.lime[500],
  yellow: KPR_SECONDARY.yellow[500],
} as const;

// ——— Typography (Brand Book: IBM Plex Mono, ABC Whyte Inktrap, Hexaframe CF) ———
/** IBM Plex Mono: body, subline, label. Futuristic, slab/mono. */
export const KPR_MONO = "font-mono-kpr";
/** Headline / subheading: clean, minimal (Whyte-style — we use system sans + weight). */
export const KPR_HEADLINE = "font-headline-kpr font-semibold tracking-tight";
/** Display: geometric, bold, use sparingly (Hexaframe-style — Orbitron). */
export const KPR_DISPLAY = "font-display-kpr font-bold uppercase tracking-tight";

/** Label: small caps, wide tracking */
export const KPR_LABEL = "text-xs sm:text-sm uppercase tracking-[0.25em]";
/** Body text */
export const KPR_BODY = "text-base leading-relaxed";

// ——— Spacing & layout (Brand Book structure) ———
export const KPR_SPACING = {
  section: "py-16 sm:py-24 lg:py-32",
  sectionNarrow: "py-12 sm:py-16",
  container: "px-6 sm:px-10 lg:px-16 max-w-7xl mx-auto",
  containerWide: "px-4 sm:px-6 lg:px-12 max-w-[1600px] mx-auto",
  sidebarWidth: "w-12 sm:w-16 lg:w-20",
} as const;

// ——— Type scale ———
export const KPR_HERO_TEXT = "text-[clamp(1.75rem,5vw,3.5rem)] sm:text-[clamp(2.25rem,7vw,4.5rem)] leading-[1.05]";
export const KPR_SECTION_TITLE = "text-[clamp(2.25rem,6vw,4rem)] lg:text-[5rem] leading-[0.92]";
export const KPR_BIG_LETTER = "text-[clamp(6rem,20vw,14rem)] leading-none font-bold";
export const KPR_INTRO_STATEMENT = "text-[clamp(1.5rem,4vw,2.5rem)] sm:text-[clamp(1.75rem,5vw,3rem)] leading-[1.1]";
