// ─── User Background ─────────────────────────────────────────────────────────

export type Gender = "male" | "female" | "non-binary" | "prefer-not-to-say";
export type AgeRange = "18-25" | "26-35" | "36-45" | "46-55" | "56-65" | "65+";
export type Ethnicity =
  | "white"
  | "black"
  | "two-or-more"
  | "south-asian"
  | "hispanic-latino"
  | "asian"
  | "pacific-islander"
  | "prefer-not-to-say";

// Captured fresh before each screening session (not part of background form)
export interface TodayFeeling {
  focusLevel: number;   // 1–5
  energyLevel: number;  // 1–5
  moodLevel: number;    // 1–5
  calmLevel: number;    // 1–5
  wellRested: boolean;
  hadCaffeine: boolean;
  hadAlcohol: boolean;
}

export interface UserBackground {
  gender: Gender;
  ageRange: AgeRange;
  ethnicity: Ethnicity;
  diagnosedADHD: boolean;
  diagnosedASD: boolean;
  diagnosedDepressionAnxiety: boolean;
  takesMedication: boolean | null; // null = not applicable
  todayFeeling?: TodayFeeling;     // updated before each assessment, not during onboarding
}

// ─── User ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email?: string;
  isGuest: boolean;
  hasConsented: boolean;
  hasBackground: boolean;
  hasProfile: boolean;
  background?: UserBackground;
  createdAt: string;
}

// ─── Chat / AI ───────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: string;
  isTyping?: boolean;
}

// ─── Screening ───────────────────────────────────────────────────────────────

export interface ScreeningQuestion {
  id: string;
  text: string;
  type: "text" | "scale" | "choice";
  options?: string[];
}

export interface ScreeningResponse {
  questionId: string;
  answer: string | number;
}

// ─── Goals & Plans ───────────────────────────────────────────────────────────

export type Priority = "low" | "medium" | "high";

export interface Goal {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: Priority;
}

export interface Plan {
  id: string;
  userId: string;
  goals: Goal[];
  recommendations: string[];
  summary: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface TrendPoint {
  date: string;         // ISO date string, used as x-axis label
  moodScore: number;    // 1–10
  completionRate: number; // 0–100
}

export interface AgentAnnotation {
  date: string;
  label: string;
  type: "intervention" | "pattern";
}

export type ConfidenceLevel = "high" | "medium" | "low";
export type HypothesisStatus = "testing" | "confirmed" | "rejected";

export interface Hypothesis {
  id: string;
  statement: string;
  confidence: ConfidenceLevel;
  status: HypothesisStatus;
  evidence: string[];
}

export interface DashboardData {
  momentumScore: number;     // 0–100
  momentumDelta: number;     // signed delta vs previous period
  trend: TrendPoint[];
  annotations: AgentAnnotation[];
  hypotheses: Hypothesis[];
}

// ─── Daily Plan ───────────────────────────────────────────────────────────────

export type BrainStateLevel = "low" | "medium" | "high";

export interface BrainState {
  focusLevel: BrainStateLevel;
  energyLevel: BrainStateLevel;
  moodLevel: BrainStateLevel;
  context?: string;
}

export type TaskType = "deep-work" | "admin" | "break" | "social" | "routine";

// A task the user typed in before generating their plan
export interface UserTask {
  title: string;
  category: TaskType;
}

export interface PlanTask {
  id: string;
  title: string;
  description?: string;
  duration?: number;   // minutes
  type?: TaskType;
  completed: boolean;
}

export interface PlanResponse {
  planId: string;
  tasks: PlanTask[];
  rationale?: string;
  createdAt: string;
}

export interface InterventionResponse {
  acknowledgment: string;
  restructuredTasks: PlanTask[];
  suggestion?: string;
}

// ─── Screening Record (persisted) ────────────────────────────────────────────

export interface ScreeningAnswer {
  questionId: string;
  questionText: string;
  dimension: string;
  score: number;
  answerLabel: string;
}

export interface ScreeningRecord {
  date: string;                          // ISO date (YYYY-MM-DD)
  dimensions: Record<string, number>;    // dimension → 0–100
  tags: string[];
  summary: string;
  answers: ScreeningAnswer[];
}

// ─── API ─────────────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  success: boolean;
}

export interface ApiError {
  detail: string;
  status: number;
}
