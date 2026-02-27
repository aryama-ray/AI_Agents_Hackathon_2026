"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { User, UserBackground, TodayFeeling } from "@/types";
import { STORAGE_KEYS } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { createGuestSession } from "@/lib/api";
import { saveTodayPoint } from "@/lib/trendStore";

// ─── Context ──────────────────────────────────────────────────────────────────

interface UserContextValue {
  user: User | null;
  isLoading: boolean;
  register: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<"ok" | "not_found" | "wrong_password">;
  loginAsGuest: () => Promise<void>;
  giveConsent: () => void;
  saveBackground: (bg: UserBackground) => void;
  updateTodayFeeling: (feeling: TodayFeeling) => void;
  updateDemographics: (fields: Omit<UserBackground, "todayFeeling">) => void;
  logout: () => void;
  markProfileComplete: () => void;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function persistUser(user: User) {
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore active session on mount
  useEffect(() => {
    async function restoreSession() {
      try {
        // Check Supabase session first
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          // Valid Supabase session — restore user from localStorage
          const stored = localStorage.getItem(STORAGE_KEYS.USER);
          if (stored) {
            const parsed = JSON.parse(stored) as User;
            if (parsed.id === session.user.id) {
              setUser(parsed);
            } else {
              // ID mismatch — rebuild from session
              const rebuilt: User = {
                id: session.user.id,
                name: session.user.user_metadata?.name ?? "User",
                email: session.user.email,
                isGuest: session.user.is_anonymous ?? false,
                hasConsented: false,
                hasBackground: false,
                hasProfile: false,
                createdAt: session.user.created_at,
              };
              setUser(rebuilt);
              persistUser(rebuilt);
            }
          } else {
            // No localStorage but valid session
            const rebuilt: User = {
              id: session.user.id,
              name: session.user.user_metadata?.name ?? "User",
              email: session.user.email,
              isGuest: session.user.is_anonymous ?? false,
              hasConsented: false,
              hasBackground: false,
              hasProfile: false,
              createdAt: session.user.created_at,
            };
            setUser(rebuilt);
            persistUser(rebuilt);
          }
        } else {
          // No Supabase session — fall back to localStorage (offline/demo)
          const stored = localStorage.getItem(STORAGE_KEYS.USER);
          if (stored) setUser(JSON.parse(stored) as User);
        }
      } catch {
        // Supabase unavailable — fall back to localStorage
        try {
          const stored = localStorage.getItem(STORAGE_KEYS.USER);
          if (stored) setUser(JSON.parse(stored) as User);
        } catch {
          // ignore malformed data
        }
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();

    // Listen for auth state changes (token refresh, sign out from another tab)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          setUser(null);
          localStorage.removeItem(STORAGE_KEYS.USER);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ─── Register via Supabase Auth ───────────────────────────────────────────

  const register = useCallback(
    async (name: string, email: string, password: string): Promise<void> => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        });
        if (error) throw error;

        const newUser: User = {
          id: data.user!.id,
          name,
          email: email.toLowerCase(),
          isGuest: false,
          hasConsented: false,
          hasBackground: false,
          hasProfile: false,
          createdAt: new Date().toISOString(),
        };

        setUser(newUser);
        persistUser(newUser);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // ─── Login via Supabase Auth ──────────────────────────────────────────────

  const login = useCallback(
    async (
      email: string,
      password: string
    ): Promise<"ok" | "not_found" | "wrong_password"> => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.includes("Invalid login")) return "wrong_password";
          return "not_found";
        }

        const userData: User = {
          id: data.user.id,
          name: data.user.user_metadata?.name ?? "User",
          email: data.user.email,
          isGuest: false,
          hasConsented: true,
          hasBackground: false,
          hasProfile: false,
          createdAt: data.user.created_at,
        };

        setUser(userData);
        persistUser(userData);
        return "ok";
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // ─── Guest login: Supabase anonymous auth + backend seed ──────────────────

  const loginAsGuest = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Create anonymous Supabase Auth session
      const { data: authData, error: authError } =
        await supabase.auth.signInAnonymously();

      if (authError || !authData.user) {
        // Supabase unavailable — fall back to local-only guest
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
        persistUser(guest);
        return;
      }

      // 2. Call backend to seed Alex demo data (JWT attached via api.ts interceptor)
      let guestData;
      try {
        guestData = await createGuestSession();
      } catch {
        guestData = null;
      }

      const guest: User = {
        id: guestData?.userId ?? authData.user.id,
        name: guestData?.name ?? "Alex",
        isGuest: true,
        hasConsented: false,
        hasBackground: false,
        hasProfile: guestData?.hasProfile ?? false,
        createdAt: new Date().toISOString(),
      };

      setUser(guest);
      persistUser(guest);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ─── Logout ───────────────────────────────────────────────────────────────

  const logout = useCallback(() => {
    supabase.auth.signOut().catch(() => {
      // best-effort sign out
    });
    setUser(null);
    localStorage.removeItem(STORAGE_KEYS.USER);
  }, []);

  // ─── Local state updates (consent, background, etc.) ─────────────────────

  function updateAndPersist(updater: (u: User) => User) {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = updater(prev);
      persistUser(updated);
      return updated;
    });
  }

  function giveConsent() {
    updateAndPersist((u) => ({ ...u, hasConsented: true }));
  }

  function saveBackground(bg: UserBackground) {
    updateAndPersist((u) => ({ ...u, hasBackground: true, background: bg }));
  }

  function updateTodayFeeling(feeling: TodayFeeling) {
    updateAndPersist((u) => ({
      ...u,
      background: u.background
        ? { ...u.background, todayFeeling: feeling }
        : undefined,
    }));
    if (user) {
      const avg =
        (feeling.focusLevel +
          feeling.energyLevel +
          feeling.moodLevel +
          feeling.calmLevel) /
        4;
      const moodScore = Math.round(avg * 2);
      saveTodayPoint(user.id, moodScore);
    }
  }

  function updateDemographics(fields: Omit<UserBackground, "todayFeeling">) {
    updateAndPersist((u) => {
      if (!u.background) return u;
      return {
        ...u,
        background: { ...fields, todayFeeling: u.background.todayFeeling },
      };
    });
  }

  function markProfileComplete() {
    updateAndPersist((u) => ({ ...u, hasProfile: true }));
  }

  return (
    <UserContext.Provider
      value={{
        user,
        isLoading,
        register,
        login,
        loginAsGuest,
        giveConsent,
        saveBackground,
        updateTodayFeeling,
        updateDemographics,
        logout,
        markProfileComplete,
      }}
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
