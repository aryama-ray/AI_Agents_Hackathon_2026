"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type { User, UserBackground, TodayFeeling } from "@/types";
import { STORAGE_KEYS } from "@/lib/constants";
import { hashPassword } from "@/lib/auth";
import { saveTodayPoint } from "@/lib/trendStore";

// ─── Stored account (email + hashed password, kept separate from session) ─────

interface StoredAccount {
  email: string;       // lowercase
  passwordHash: string;
  user: User;
}

function readAccounts(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
    return raw ? (JSON.parse(raw) as StoredAccount[]) : [];
  } catch {
    return [];
  }
}

function writeAccounts(accounts: StoredAccount[]) {
  localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface UserContextValue {
  user: User | null;
  isLoading: boolean;
  register: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<"ok" | "not_found" | "wrong_password">;
  loginAsGuest: () => void;
  giveConsent: () => void;
  saveBackground: (bg: UserBackground) => void;
  updateTodayFeeling: (feeling: TodayFeeling) => void;
  updateDemographics: (fields: Omit<UserBackground, "todayFeeling">) => void;
  logout: () => void;
  markProfileComplete: () => void;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore active session on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USER);
      if (stored) setUser(JSON.parse(stored) as User);
    } catch {
      // ignore malformed data
    } finally {
      setIsLoading(false);
    }
  }, []);

  async function register(name: string, email: string, password: string): Promise<void> {
    const passwordHash = await hashPassword(password);
    const newUser: User = {
      id: crypto.randomUUID(),
      name,
      email: email.toLowerCase(),
      isGuest: false,
      hasConsented: false,
      hasBackground: false,
      hasProfile: false,
      createdAt: new Date().toISOString(),
    };

    // Upsert into accounts registry (separate from guest session key)
    const accounts = readAccounts().filter(
      (a) => a.email !== email.toLowerCase()
    );
    accounts.push({ email: email.toLowerCase(), passwordHash, user: newUser });
    writeAccounts(accounts);

    // Set active session
    setUser(newUser);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser));
  }

  async function login(
    email: string,
    password: string
  ): Promise<"ok" | "not_found" | "wrong_password"> {
    const accounts = readAccounts();
    const account = accounts.find((a) => a.email === email.toLowerCase());
    if (!account) return "not_found";

    const hash = await hashPassword(password);
    if (hash !== account.passwordHash) return "wrong_password";

    // Restore latest user state from accounts registry, then set session
    setUser(account.user);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(account.user));
    return "ok";
  }

  function loginAsGuest() {
    const guest: User = {
      id: crypto.randomUUID(),
      name: "Guest",
      isGuest: true,
      hasConsented: false,
      hasBackground: false,
      hasProfile: false,
      createdAt: new Date().toISOString(),
    };
    setUser(guest);
    // Only writes to SESSION key — never touches the accounts registry
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(guest));
  }

  function logout() {
    setUser(null);
    localStorage.removeItem(STORAGE_KEYS.USER);
  }

  function giveConsent() {
    if (!user) return;
    const updated: User = { ...user, hasConsented: true };
    setUser(updated);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updated));
    // Keep accounts registry in sync for registered users
    if (!updated.isGuest && updated.email) {
      const accounts = readAccounts().map((a) =>
        a.email === updated.email ? { ...a, user: updated } : a
      );
      writeAccounts(accounts);
    }
  }

  function saveBackground(bg: UserBackground) {
    if (!user) return;
    const updated: User = { ...user, hasBackground: true, background: bg };
    setUser(updated);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updated));
    if (!updated.isGuest && updated.email) {
      const accounts = readAccounts().map((a) =>
        a.email === updated.email ? { ...a, user: updated } : a
      );
      writeAccounts(accounts);
    }
    // Mood point is recorded after the pre-screening check-in, not here
  }

  function updateTodayFeeling(feeling: TodayFeeling) {
    if (!user) return;
    const updated: User = {
      ...user,
      background: user.background
        ? { ...user.background, todayFeeling: feeling }
        : undefined,
    };
    setUser(updated);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updated));
    if (!updated.isGuest && updated.email) {
      const accounts = readAccounts().map((a) =>
        a.email === updated.email ? { ...a, user: updated } : a
      );
      writeAccounts(accounts);
    }
    // Average all four 1–5 scales and map to 2–10 mood score
    const avg = (feeling.focusLevel + feeling.energyLevel + feeling.moodLevel + feeling.calmLevel) / 4;
    const moodScore = Math.round(avg * 2);
    saveTodayPoint(updated.id, moodScore);
  }

  function updateDemographics(fields: Omit<UserBackground, "todayFeeling">) {
    if (!user || !user.background) return;
    const updated: User = {
      ...user,
      background: { ...fields, todayFeeling: user.background.todayFeeling },
    };
    setUser(updated);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updated));
    if (!updated.isGuest && updated.email) {
      const accounts = readAccounts().map((a) =>
        a.email === updated.email ? { ...a, user: updated } : a
      );
      writeAccounts(accounts);
    }
  }

  function markProfileComplete() {
    if (!user) return;
    const updated: User = { ...user, hasProfile: true };
    setUser(updated);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updated));
    if (!updated.isGuest && updated.email) {
      const accounts = readAccounts().map((a) =>
        a.email === updated.email ? { ...a, user: updated } : a
      );
      writeAccounts(accounts);
    }
  }

  return (
    <UserContext.Provider
      value={{ user, isLoading, register, login, loginAsGuest, giveConsent, saveBackground, updateTodayFeeling, updateDemographics, logout, markProfileComplete }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within <UserProvider>");
  return ctx;
}
