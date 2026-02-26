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
] as const;

