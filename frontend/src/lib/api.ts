import axios from "axios";
import { supabase } from "@/lib/supabase";
import type { PlanResponse, InterventionResponse, BrainState } from "@/types";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor: attach Supabase JWT to every request
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// ── Auth ──

export interface GuestLoginData {
  userId: string;
  name: string;
  isGuest: boolean;
  hasProfile: boolean;
  accessToken?: string;
}

export interface AuthResponseData {
  userId: string;
  name: string;
  isGuest: boolean;
  hasProfile: boolean;
  accessToken: string;
}

export async function createGuestSession(): Promise<GuestLoginData> {
  const { data } = await api.post<GuestLoginData>("/api/auth/guest");
  return data;
}

export async function signupUser(
  email: string,
  password: string,
  name: string,
): Promise<AuthResponseData> {
  const { data } = await api.post<AuthResponseData>("/api/auth/signup", {
    email,
    password,
    name,
  });
  return data;
}

export async function loginUser(
  email: string,
  password: string,
): Promise<AuthResponseData> {
  const { data } = await api.post<AuthResponseData>("/api/auth/login", {
    email,
    password,
  });
  return data;
}

export async function logoutUser(): Promise<void> {
  await api.post("/api/auth/logout");
}

// ── Screening ──

export async function evaluateScreening(
  answers: Array<{ questionIndex: number; questionText: string; score: number }>,
) {
  const { data } = await api.post("/api/screening/evaluate", { answers });
  return data;
}

// ── Profile ──

export async function fetchProfile(userId: string) {
  const { data } = await api.get(`/api/profile/${userId}`);
  return data;
}

// ── Plan ──

export async function generatePlan(
  brainState: BrainState,
  tasks?: string[],
): Promise<PlanResponse> {
  const { data } = await api.post<PlanResponse>("/api/plan/generate", {
    brainState,
    tasks,
  });
  return data;
}

export async function triggerIntervention(
  planId: string,
  stuckTaskIndex: number,
  userMessage?: string,
): Promise<InterventionResponse> {
  const { data } = await api.post<InterventionResponse>("/api/plan/intervene", {
    planId,
    stuckTaskIndex,
    userMessage,
  });
  return data;
}

// ── Dashboard ──

export async function fetchDashboard(userId: string) {
  const { data } = await api.get(`/api/dashboard/${userId}`);
  return data;
}

// ── User Data (Privacy) ──

export async function exportUserData(userId: string) {
  const { data } = await api.get(`/api/user/${userId}/export`);
  return data;
}

export async function deleteUserData(userId: string) {
  const { data } = await api.delete(`/api/user/${userId}`);
  return data;
}

// ── Feedback ──

export async function submitInterventionFeedback(
  interventionId: string,
  rating: number,
  feedback?: string,
) {
  const { data } = await api.post("/api/feedback/intervention", {
    interventionId,
    rating,
    feedback,
  });
  return data;
}

// ── Analytics ──

export function trackAnalyticsEvent(
  eventType: string,
  eventData?: object,
  durationMs?: number,
) {
  // Fire-and-forget — don't block UI
  api.post("/api/analytics/event", {
    eventType,
    eventData: eventData ?? {},
    durationMs,
  }).catch(() => {
    // Silently ignore tracking failures
  });
}

export default api;
