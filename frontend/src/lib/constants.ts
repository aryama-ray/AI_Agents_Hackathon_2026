export const APP_NAME = "Attune";
export const APP_TAGLINE = "Structure for the way your mind actually works.";
export const APP_DESCRIPTION =
  "Attune screens for attention challenges and builds a calm, step-by-step daily schedule — so you always know what's next, without the overwhelm.";

export const STORAGE_KEYS = {
  USER: "attune_user",
  ACCOUNTS: "attune_accounts",
  TREND: "attune_trend",        // real per-day data points, keyed by userId
  SCREENING: "attune_screening", // screening records, keyed by userId
} as const;

export const API_TIMEOUT = 30000;

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/profile", label: "My Profile" },
  { href: "/screening", label: "Get Started" },
  { href: "/plan", label: "My Plan" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/settings", label: "Settings" },
] as const;

// ─── Brain States (plan feature) ────────────────────────────────────────────

import type { BrainState } from "@/types";

export const BRAIN_STATES: Record<
  BrainState,
  {
    label: string;
    description: string;
    icon: string;
    color: string;
    lightColor: string;
  }
> = {
  foggy: {
    label: "Foggy",
    description: "Low energy, hard to focus",
    icon: "Cloud",
    color: "var(--brain-foggy)",
    lightColor: "var(--brain-foggy-light)",
  },
  focused: {
    label: "Focused",
    description: "Clear mind, ready to work",
    icon: "Crosshair",
    color: "var(--brain-focused)",
    lightColor: "var(--brain-focused-light)",
  },
  wired: {
    label: "Wired",
    description: "High energy, restless",
    icon: "Zap",
    color: "var(--brain-wired)",
    lightColor: "var(--brain-wired-light)",
  },
};

export const CATEGORY_COLORS: Record<string, string> = {
  deep_work: "var(--cat-deep-work)",
  "deep-work": "var(--cat-deep-work)",
  admin: "var(--cat-admin)",
  creative: "var(--cat-creative)",
  physical: "var(--cat-physical)",
  social: "var(--cat-social)",
  communication: "var(--cat-communication)",
  planning: "var(--cat-planning)",
  learning: "var(--cat-learning)",
  review: "var(--cat-review)",
};

export const CATEGORY_ICONS: Record<string, string> = {
  deep_work: "Brain",
  "deep-work": "Brain",
  admin: "ClipboardList",
  creative: "Palette",
  physical: "Activity",
  social: "Users",
  communication: "MessageSquare",
  planning: "LayoutGrid",
  learning: "BookOpen",
  review: "Search",
};

