# Attune — Fullstack Implementation Playbook

> **Two-person team guide.** Work is split by **feature**, not by layer. Each person owns their feature end-to-end: backend testing/fixes + frontend build + integration. Both team members are Python-primary; TypeScript/React instructions are detailed and copy-paste friendly.

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│  Next.js Frontend (localhost:3000)                │
│  Landing │ Screening │ Plan │ Dashboard │ Settings│
│  Supabase Auth (JWT) + WebSocket client           │
└────────────────┬─────────────────────────────────┘
                 │ axios + JWT → localhost:8000
┌────────────────▼─────────────────────────────────┐
│  FastAPI Backend (localhost:8000)                  │
│  Auth Middleware (JWT validation)                  │
│  ┌─────────────────────────────────────────────┐  │
│  │  CrewAI Orchestrator (Hierarchical Process) │  │
│  │  ┌───────────┐ ┌──────────┐ ┌────────────┐ │  │
│  │  │ Screening │ │ Planning │ │Intervention│ │  │
│  │  │   Agent   │ │  Agent   │ │   Agent    │ │  │
│  │  └───────────┘ └──────────┘ └────────────┘ │  │
│  │  ┌───────────┐                              │  │
│  │  │ Pattern   │  + Long-Term Memory          │  │
│  │  │  Agent    │  + ADHD Knowledge Base       │  │
│  │  └───────────┘  + Event Streaming           │  │
│  └─────────────────────────────────────────────┘  │
│  Supabase (PostgreSQL + Auth + RLS)               │
└───────────────────────────────────────────────────┘
```

**Backend:** Python, FastAPI, CrewAI, Supabase — **Phases 1-3 DONE**
**Frontend:** Next.js 16, React 19, Tailwind v4, TypeScript — **Phases 1-3 DONE**
**Phase 4:** Auth hardening, privacy, learning loops, agent orchestration — **TO BUILD**

---

## How to Run (both people, every session)

```bash
# Terminal 1: Backend
cd backend
source venv/bin/activate   # Windows: venv\Scripts\activate
uvicorn main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev
# → http://localhost:3000
```

Verify backend: `curl http://localhost:8000/` → `{"status":"ok"}`

---

## Team Assignment Summary

| Phase | Person A (You) | Person B (Teammate) |
|-------|---------------|---------------------|
| **Phase 1** | Build frontend foundation (16 files) | Set up Supabase + test all backend endpoints |
| **Phase 2** | Build Screening + Dashboard features | Build Planner + Intervention features |
| **Phase 3** | Integration testing (together) | Integration testing (together) |
| **Phase 4** | Frontend auth + privacy UI + feedback UI + WebSocket client | Backend auth + agents (memory, orchestrator, patterns) + privacy endpoints |

---

## File Ownership Map (zero overlap = zero merge conflicts in Phase 2)

```
frontend/src/
├── app/
│   ├── globals.css              ← Phase 1 (Person A)
│   ├── layout.tsx               ← Phase 1 (Person A)
│   ├── page.tsx                 ← Phase 1 (Person A)
│   ├── screening/page.tsx       ← Person A
│   ├── plan/page.tsx            ← Person B
│   └── dashboard/page.tsx       ← Person A
├── components/
│   ├── ui/*                     ← Phase 1 (Person A)
│   ├── layout/*                 ← Phase 1 (Person A)
│   ├── auth/*                   ← Phase 1 (Person A)
│   ├── screening/*              ← Person A (4 files)
│   ├── plan/*                   ← Person B (5 files)
│   └── dashboard/*              ← Person A (3 files)
├── hooks/
│   ├── useUser.ts               ← Phase 1 (Person A)
│   ├── useScreeningChat.ts      ← Person A
│   ├── useDailyPlan.ts          ← Person B
│   └── useDashboard.ts          ← Person A
├── lib/
│   ├── api.ts                   ← Phase 1 (Person A)
│   └── constants.ts             ← Phase 1 (Person A)
└── types/
    └── index.ts                 ← Phase 1 (Person A)

backend/                          ← Already built
├── app/routes/screening.py      ← Person A tests/fixes
├── app/routes/profile.py        ← Person A tests/fixes
├── app/routes/dashboard.py      ← Person A tests/fixes
├── app/routes/plan.py           ← Person B tests/fixes
├── app/routes/auth.py           ← Both test
└── ...
```

---

## TypeScript/React Quick Reference (for Python devs)

| Python | TypeScript/React Equivalent |
|--------|---------------------------|
| `x = 5` | `const [x, setX] = useState(5)` — calling `setX(10)` re-renders |
| `if __name__` | `useEffect(() => { ... }, [])` — runs once on mount |
| `@app.route` | Next.js file-based routing: `app/screening/page.tsx` = `/screening` |
| `class MyModel(BaseModel):` | `export interface MyModel { ... }` |
| `import os; os.getenv()` | `process.env.NEXT_PUBLIC_API_URL` (client-side must prefix `NEXT_PUBLIC_`) |
| `async def` | `async function` or `const fn = async () => {}` |
| `try/except` | `try { } catch (error) { }` |
| `f"string {var}"` | `` `string ${var}` `` (backtick template literals) |
| `dict` | `Record<string, any>` or defined `interface` |
| `list[str]` | `string[]` |
| `None` | `null` |

**Critical React rule:** Add `"use client"` at the top of any file using `useState`, `useEffect`, `useContext`, or event handlers. Next.js defaults to server components.

---

# PHASE 1 — FOUNDATION

> **Person A** builds all shared frontend files. **Person B** sets up Supabase and tests backend endpoints.

---

## Person B: Backend & Supabase Setup

### Task B1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com), create a free project
2. Note down: Project URL, anon key, service role key
3. Open SQL Editor in Supabase Dashboard

### Task B2: Run Database Schema

Copy the contents of `backend/supabase/schema.sql` into the Supabase SQL Editor and click "Run".

This creates 7 tables: `users`, `asrs_responses`, `cognitive_profiles`, `daily_plans`, `checkins`, `interventions`, `hypothesis_cards`.

### Task B3: Configure Backend Environment

Create `backend/.env` (copy from `.env.example`):
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
FRONTEND_URL=http://localhost:3000
```

### Task B4: Install and Start Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Task B5: Test All 6 Endpoints

Test each endpoint and document the response. Fix any issues.

**1. Guest login (creates Alex + seeds 14-day data):**
```bash
curl -X POST http://localhost:8000/api/auth/guest -H "Content-Type: application/json"
```
Expected: `{ "userId": "00000000-...-000000000001", "name": "Alex", "isGuest": true, "hasProfile": true }`

**2. Fetch profile:**
```bash
curl http://localhost:8000/api/profile/00000000-0000-0000-0000-000000000001
```
Expected: `{ "dimensions": [...6 items...], "profileTags": ["Deep-Diver", ...], "summary": "..." }`

**3. Fetch dashboard:**
```bash
curl http://localhost:8000/api/dashboard/00000000-0000-0000-0000-000000000001
```
Expected: `{ "trendData": [...14 items...], "momentumScore": ~71, "momentumDelta": ~23, "hypothesisCards": [...2 items...], "agentAnnotations": [...] }`

**4. Generate plan (requires Anthropic API key):**
```bash
curl -X POST http://localhost:8000/api/plan/generate \
  -H "Content-Type: application/json" \
  -d '{"userId": "00000000-0000-0000-0000-000000000001", "brainState": "focused"}'
```
Expected: `{ "planId": "...", "tasks": [...], "overallRationale": "..." }` (takes 3-10s)

**5. Trigger intervention:**
```bash
curl -X POST http://localhost:8000/api/plan/intervene \
  -H "Content-Type: application/json" \
  -d '{"userId": "00000000-0000-0000-0000-000000000001", "planId": "PLAN_ID_FROM_STEP_4", "stuckTaskIndex": 0, "userMessage": "I cannot focus"}'
```
Expected: `{ "interventionId": "...", "acknowledgment": "...", "restructuredTasks": [...], "agentReasoning": "..." }`

**6. Evaluate screening:**
```bash
curl -X POST http://localhost:8000/api/screening/evaluate \
  -H "Content-Type: application/json" \
  -d '{"userId": "00000000-0000-0000-0000-000000000001", "answers": [{"questionIndex": 0, "questionText": "...", "score": 3}, {"questionIndex": 1, "questionText": "...", "score": 2}, {"questionIndex": 2, "questionText": "...", "score": 3}, {"questionIndex": 3, "questionText": "...", "score": 4}, {"questionIndex": 4, "questionText": "...", "score": 2}, {"questionIndex": 5, "questionText": "...", "score": 1}]}'
```
Expected: `{ "profileId": "...", "dimensions": [...], "profileTags": [...], "summary": "...", "asrsTotalScore": 15, "isPositiveScreen": true }`

### Task B6: Document Field Name Mapping

Check if backend returns snake_case (`brain_state`) or camelCase (`brainState`). Document any mismatches so Person A can handle them in `api.ts`. Common issues:
- `user_id` vs `userId`
- `has_profile` vs `hasProfile`
- `is_guest` vs `isGuest`
- `plan_id` vs `planId`
- `stuck_task_index` vs `stuckTaskIndex`
- `duration_minutes` vs `durationMinutes`
- `time_slot` vs `timeSlot`

If snake_case, add `alias_generator` to backend Pydantic models in `app/models.py`:
```python
from pydantic import ConfigDict
from pydantic.alias_generators import to_camel

class GuestLoginResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    # ... fields
```

Or transform in frontend `api.ts` after receiving response.

---

## Person A: Frontend Foundation

### Task A1: Environment File

Create `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Task A2: Design System — `src/app/globals.css`

Replace the entire default file. This is the Attune design system with Tailwind v4 theme tokens.

```css
@import "tailwindcss";

:root {
  --bg: #faf9f6;
  --bg-card: #ffffff;
  --ink: #18160f;
  --ink-muted: #6b6560;
  --ink-faint: #a8a29e;
  --border: #e7e5e0;
  --border-focus: #1d6344;

  /* Brand colors */
  --green: #1d6344;
  --green-light: #e8f5ee;
  --green-dark: #145234;
  --red: #b83b10;
  --red-light: #fef2ed;
  --amber: #a05f10;
  --amber-light: #fef8ec;
  --blue: #1a40bf;
  --blue-light: #eef1fc;
  --violet: #5c2fa0;
  --violet-light: #f3eefb;

  /* Brain state colors */
  --foggy: #8b95a5;
  --foggy-light: #f0f2f5;
  --focused: #1d6344;
  --focused-light: #e8f5ee;
  --wired: #b83b10;
  --wired-light: #fef2ed;

  /* Category colors (for task cards) */
  --cat-deep-work: #1a40bf;
  --cat-admin: #6b6560;
  --cat-creative: #5c2fa0;
  --cat-physical: #1d6344;
  --cat-social: #a05f10;
  --cat-communication: #a05f10;
  --cat-planning: #5c2fa0;
  --cat-learning: #1a40bf;
  --cat-review: #6b6560;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(24, 22, 15, 0.05);
  --shadow-md: 0 4px 12px rgba(24, 22, 15, 0.08);
  --shadow-lg: 0 8px 24px rgba(24, 22, 15, 0.12);

  /* Radar chart colors */
  --radar-fill: rgba(29, 99, 68, 0.2);
  --radar-stroke: #1d6344;
}

@theme inline {
  --color-bg: var(--bg);
  --color-bg-card: var(--bg-card);
  --color-ink: var(--ink);
  --color-ink-muted: var(--ink-muted);
  --color-ink-faint: var(--ink-faint);
  --color-border: var(--border);
  --color-green: var(--green);
  --color-green-light: var(--green-light);
  --color-green-dark: var(--green-dark);
  --color-red: var(--red);
  --color-red-light: var(--red-light);
  --color-amber: var(--amber);
  --color-amber-light: var(--amber-light);
  --color-blue: var(--blue);
  --color-blue-light: var(--blue-light);
  --color-violet: var(--violet);
  --color-violet-light: var(--violet-light);
  --color-foggy: var(--foggy);
  --color-focused: var(--focused);
  --color-wired: var(--wired);
  --font-sans: var(--font-ibm-plex-sans);
  --font-serif: var(--font-playfair-display);
  --font-mono: var(--font-ibm-plex-mono);
}

body {
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font-sans), system-ui, sans-serif;
}

/* Typewriter animation (for intervention acknowledgment) */
@keyframes typewriter {
  from { width: 0; }
  to { width: 100%; }
}

@keyframes blink-caret {
  50% { border-color: transparent; }
}

.typewriter {
  overflow: hidden;
  white-space: nowrap;
  border-right: 2px solid var(--green);
  animation: typewriter 1.5s steps(60) forwards, blink-caret 0.75s step-end infinite;
}

/* Pulse animation for StuckButton */
@keyframes pulse-red {
  0%, 100% { box-shadow: 0 0 0 0 rgba(184, 59, 16, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(184, 59, 16, 0); }
}

.pulse-red {
  animation: pulse-red 2s ease-in-out infinite;
}

/* Fade in animation */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}

/* Stagger delay utilities */
.delay-100 { animation-delay: 100ms; }
.delay-200 { animation-delay: 200ms; }
.delay-300 { animation-delay: 300ms; }
.delay-400 { animation-delay: 400ms; }
.delay-500 { animation-delay: 500ms; }
.delay-600 { animation-delay: 600ms; }
.delay-700 { animation-delay: 700ms; }
.delay-800 { animation-delay: 800ms; }
.delay-1000 { animation-delay: 1000ms; }
.delay-1500 { animation-delay: 1500ms; }

/* Count-up number animation */
@keyframes countUp {
  from { opacity: 0; transform: scale(0.5); }
  to { opacity: 1; transform: scale(1); }
}

.count-up {
  animation: countUp 0.6s ease-out forwards;
}
```

### Task A3: TypeScript Interfaces — `src/types/index.ts`

These mirror the backend Pydantic models exactly. Copy-paste this file.

```ts
// ── Auth ──
export interface User {
  userId: string;
  name: string;
  isGuest: boolean;
  hasProfile: boolean;
}

// ── ASRS Screening ──
export interface ASRSAnswer {
  questionIndex: number;
  questionText: string;
  score: number; // 0-4
}

export interface RadarDimension {
  key: string;
  label: string;
  value: number;     // 0-100
  insight: string;
}

export interface ScreeningResponse {
  profileId: string;
  dimensions: RadarDimension[];
  profileTags: string[];
  summary: string;
  asrsTotalScore: number;
  isPositiveScreen: boolean;
}

export interface ProfileResponse {
  dimensions: RadarDimension[];
  profileTags: string[];
  summary: string;
}

// ── Daily Plan ──
export interface PlanTask {
  index: number;
  title: string;
  description: string;
  duration_minutes: number;
  time_slot: string;
  category: string;
  rationale: string;
  priority: string;
  status: string;
}

export interface PlanResponse {
  planId: string;
  tasks: PlanTask[];
  overallRationale: string;
}

// ── Intervention ──
export interface InterventionResponse {
  interventionId: string;
  acknowledgment: string;
  restructuredTasks: PlanTask[];
  agentReasoning: string;
  followupHint?: string;
}

// ── Dashboard ──
export interface TrendDataPoint {
  date: string;
  dayNumber: number;
  moodScore: number;
  completionRate: number;
  brainState: string;
  tasksCompleted: number;
  tasksTotal: number;
}

export interface HypothesisCard {
  id: string;
  patternDetected: string;
  prediction: string;
  confidence: string;
  status: string;
  supportingEvidence: Array<{ day: number; detail: string }>;
  createdAt: string;
}

export interface AgentAnnotation {
  dayNumber: number;
  text: string;
  type: string;
}

export interface DashboardResponse {
  trendData: TrendDataPoint[];
  momentumScore: number;
  momentumDelta: number;
  hypothesisCards: HypothesisCard[];
  agentAnnotations: AgentAnnotation[];
}

export type BrainState = "foggy" | "focused" | "wired";
```

### Task A4: Constants — `src/lib/constants.ts`

```ts
import type { BrainState } from "@/types";

export const ASRS_QUESTIONS = [
  "How often do you have trouble wrapping up the final details of a project, once the challenging parts have been done?",
  "How often do you have difficulty getting things in order when you have to do a task that requires organization?",
  "How often do you have problems remembering appointments or obligations?",
  "When you have a task that requires a lot of thought, how often do you avoid or delay getting started?",
  "How often do you fidget or squirm with your hands or feet when you have to sit down for a long time?",
  "How often do you feel overly active and compelled to do things, like you were driven by a motor?",
] as const;

export const ANSWER_OPTIONS = [
  { label: "Never", score: 0 },
  { label: "Rarely", score: 1 },
  { label: "Sometimes", score: 2 },
  { label: "Often", score: 3 },
  { label: "Very Often", score: 4 },
] as const;

export const RADAR_DIMENSIONS = [
  { key: "attention_regulation", label: "Attention Regulation" },
  { key: "time_perception", label: "Time Perception" },
  { key: "emotional_intensity", label: "Emotional Intensity" },
  { key: "working_memory", label: "Working Memory" },
  { key: "task_initiation", label: "Task Initiation" },
  { key: "hyperfocus_capacity", label: "Hyperfocus Capacity" },
] as const;

export const BRAIN_STATES: Record<BrainState, {
  label: string;
  description: string;
  icon: string;
  color: string;
  lightColor: string;
}> = {
  foggy: {
    label: "Foggy",
    description: "Low energy, hard to focus",
    icon: "Cloud",
    color: "var(--foggy)",
    lightColor: "var(--foggy-light)",
  },
  focused: {
    label: "Focused",
    description: "Clear mind, ready to work",
    icon: "Crosshair",
    color: "var(--focused)",
    lightColor: "var(--focused-light)",
  },
  wired: {
    label: "Wired",
    description: "High energy, restless",
    icon: "Zap",
    color: "var(--wired)",
    lightColor: "var(--wired-light)",
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
```

### Task A5: API Client — `src/lib/api.ts`

```ts
import axios from "axios";
import type {
  User, ASRSAnswer, ScreeningResponse, ProfileResponse,
  PlanResponse, InterventionResponse, DashboardResponse, BrainState,
} from "@/types";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

export async function createGuestSession(): Promise<User> {
  const { data } = await api.post<User>("/api/auth/guest");
  return data;
}

export async function evaluateScreening(userId: string, answers: ASRSAnswer[]): Promise<ScreeningResponse> {
  const { data } = await api.post<ScreeningResponse>("/api/screening/evaluate", { userId, answers });
  return data;
}

export async function fetchProfile(userId: string): Promise<ProfileResponse> {
  const { data } = await api.get<ProfileResponse>(`/api/profile/${userId}`);
  return data;
}

export async function generatePlan(userId: string, brainState: BrainState, tasks?: string[]): Promise<PlanResponse> {
  const { data } = await api.post<PlanResponse>("/api/plan/generate", { userId, brainState, tasks });
  return data;
}

export async function triggerIntervention(userId: string, planId: string, stuckTaskIndex: number, userMessage?: string): Promise<InterventionResponse> {
  const { data } = await api.post<InterventionResponse>("/api/plan/intervene", { userId, planId, stuckTaskIndex, userMessage });
  return data;
}

export async function fetchDashboard(userId: string): Promise<DashboardResponse> {
  const { data } = await api.get<DashboardResponse>(`/api/dashboard/${userId}`);
  return data;
}
```

### Task A6: Auth Hook — `src/hooks/useUser.ts`

```tsx
"use client";
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { createGuestSession } from "@/lib/api";
import type { User } from "@/types";

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  loginAsGuest: () => Promise<void>;
  logout: () => void;
}

const UserContext = createContext<UserContextType>({
  user: null, isLoading: true, loginAsGuest: async () => {}, logout: () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("attune_user");
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { localStorage.removeItem("attune_user"); }
    }
    setIsLoading(false);
  }, []);

  const loginAsGuest = useCallback(async () => {
    setIsLoading(true);
    try {
      const userData = await createGuestSession();
      setUser(userData);
      localStorage.setItem("attune_user", JSON.stringify(userData));
    } finally { setIsLoading(false); }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("attune_user");
  }, []);

  return (
    <UserContext.Provider value={{ user, isLoading, loginAsGuest, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() { return useContext(UserContext); }
```

### Task A7: UI Components — `src/components/ui/Button.tsx`

Props: `variant` (primary/secondary/ghost/danger), `size` (sm/md/lg), `isLoading` (boolean).

| Variant | Tailwind Classes |
|---------|-----------------|
| `primary` | `bg-green text-white hover:bg-green-dark` |
| `secondary` | `bg-bg-card text-ink border border-border hover:border-green` |
| `ghost` | `bg-transparent text-ink-muted hover:bg-green-light hover:text-green` |
| `danger` | `bg-red text-white hover:opacity-90` |

Sizes: `sm`=`px-3 py-1.5 text-sm`, `md`=`px-4 py-2 text-base`, `lg`=`px-6 py-3 text-lg`.
Base: `rounded-lg font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed`.
When `isLoading`, show `<Loader2 className="animate-spin" />` from lucide-react and disable.

### Task A8: UI Components — `src/components/ui/Card.tsx`

Props: `children`, `className?`, `padding` (sm/md/lg).
Base: `bg-bg-card rounded-xl border border-border shadow-[var(--shadow-sm)]`.
Padding: `sm`=`p-4`, `md`=`p-6`, `lg`=`p-8`. Default: `md`.

### Task A9: UI Components — `src/components/ui/Badge.tsx`

Props: `children`, `color` (green/red/amber/blue/violet/gray).
Render as `<span>`. Base: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium`.
Colors: green=`bg-green-light text-green`, red=`bg-red-light text-red`, amber=`bg-amber-light text-amber`, blue=`bg-blue-light text-blue`, violet=`bg-violet-light text-violet`, gray=`bg-[#f0f0ed] text-ink-muted`.

### Task A10: UI Components — `src/components/ui/ChatBubble.tsx`

Props: `children`, `variant` (agent/user), `isTyping?`.
Layout: `max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed`.
Agent: `self-start bg-green-light text-ink rounded-bl-sm`.
User: `self-end bg-bg-card text-ink border border-border rounded-br-sm`.
When `isTyping`: show 3 animated dots instead of children.

### Task A11: UI Components — `src/components/ui/LoadingSpinner.tsx`

Props: `size` (sm/md/lg), `label?`.
Use lucide-react `<Loader2 className="animate-spin" />`. Sizes: sm=`w-4 h-4`, md=`w-8 h-8`, lg=`w-12 h-12`. Color: `text-green`.
If `label`, show below in `text-ink-muted text-sm`.

### Task A12: Layout — `src/components/layout/Navbar.tsx`

No props — reads from `useUser()` context.
Container: `sticky top-0 z-50 bg-bg/80 backdrop-blur-md border-b border-border`.
Inner: `max-w-5xl mx-auto px-6 h-14 flex items-center justify-between`.
Left: "attune" logo in `font-serif text-xl font-semibold text-green`.
Center: 3 links ("Screening" → `/screening`, "Plan" → `/plan`, "Dashboard" → `/dashboard`). Active: `text-green font-medium`. Inactive: `text-ink-muted hover:text-ink`. Use `usePathname()` from `next/navigation`.
Right: If user, show pill `bg-green-light text-green px-3 py-1 rounded-full text-sm font-medium` with user name.

### Task A13: Layout — `src/components/layout/PageContainer.tsx`

Props: `children`, `className?`.
Wrapper: `max-w-5xl mx-auto px-6 py-8`. Merge className.

### Task A14: Auth — `src/components/auth/GuestLoginButton.tsx`

No props — uses `useUser()` context.
Renders `<Button variant="primary" size="lg">` text "Continue as Alex (Guest)".
On click: `loginAsGuest()`. While loading, show spinner.
After login: redirect to `/screening` if `!hasProfile`, or `/plan` if `hasProfile`. Use `useRouter()` from `next/navigation`.

### Task A15: Root Layout — `src/app/layout.tsx`

```tsx
import type { Metadata } from "next";
import { Playfair_Display, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { UserProvider } from "@/hooks/useUser";
import Navbar from "@/components/layout/Navbar";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair-display", subsets: ["latin"], weight: ["400", "600", "700"],
});
const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans", subsets: ["latin"], weight: ["400", "500", "600", "700"],
});
const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono", subsets: ["latin"], weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Attune — AI Executive Function Co-Pilot",
  description: "Multi-agent AI system for ADHD screening and adaptive daily planning",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${playfair.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} antialiased`}>
        <UserProvider>
          <Navbar />
          <main>{children}</main>
        </UserProvider>
      </body>
    </html>
  );
}
```

### Task A16: Landing Page — `src/app/page.tsx`

Replace default content entirely. Structure:
1. Hero: `max-w-2xl mx-auto text-center pt-24 pb-16`
   - `<Badge color="green">3 AI Agents</Badge>`
   - Headline: `font-serif text-5xl font-bold text-ink leading-tight` — "Your brain works differently. Your planner should too."
   - Subtitle: `text-ink-muted text-lg mt-4 max-w-lg mx-auto` — "Attune is a multi-agent AI executive function co-pilot. It screens, plans, and intervenes — so you don't have to self-manage the thing that makes self-management hard."
2. Stats: `flex justify-center gap-12 mt-12` — "366M" / "adults with ADHD globally", "$13B" / "lost productivity annually", "3" / "AI agents working for you". Numbers in `font-serif text-3xl font-bold text-green`.
3. CTAs: `flex justify-center gap-4 mt-12` — `<GuestLoginButton />` + `<Button variant="secondary" size="lg">` linking to `/screening` "Start Screening".

### Phase 1 Gate

Both people verify together:
- [ ] Backend returns data for all 6 endpoints
- [ ] Frontend landing page renders at localhost:3000
- [ ] "Continue as Guest" creates Alex in Supabase, shows name in Navbar
- [ ] Navigation links work (even if pages are empty)
- [ ] Merge Phase 1 branch, then create 2 feature branches

---

# PHASE 2 — PARALLEL FEATURE BUILD

> **Person A** builds Screening + Dashboard. **Person B** builds Planner + Intervention.
> Each person works on their own branch. Zero merge conflicts — all files are in separate directories.

---

## Person A: Feature 1 — ASRS Screening (`/screening`)

### Backend Endpoints Person A Owns

| Endpoint | What it does | Backend file to fix if broken |
|----------|-------------|------------------------------|
| `POST /api/screening/evaluate` | Sends 6 ASRS answers → CrewAI screening agent → returns cognitive profile | `app/routes/screening.py`, `app/agents/screening_agent.py` |
| `GET /api/profile/{userId}` | Returns stored cognitive profile | `app/routes/profile.py` |

### Task A-S1: Screening Hook — `src/hooks/useScreeningChat.ts`

State machine with 4 phases: `"idle"` → `"questioning"` → `"evaluating"` → `"complete"`.

```ts
interface UseScreeningChatReturn {
  phase: "idle" | "questioning" | "evaluating" | "complete";
  currentQuestionIndex: number;       // 0-5
  answers: ASRSAnswer[];
  profile: ScreeningResponse | null;
  isLoading: boolean;
  startScreening: () => void;
  submitAnswer: (score: number) => void;
  error: string | null;
}
```

Logic:
- `startScreening()`: phase → `"questioning"`, reset answers, index = 0
- `submitAnswer(score)`: push `{ questionIndex, questionText: ASRS_QUESTIONS[index], score }` to answers. If index < 5, increment with **500ms setTimeout delay** (chat UX feel). If index === 5 (last), phase → `"evaluating"`, call `evaluateScreening(userId, allAnswers)`, then set profile and phase → `"complete"`.
- Get `userId` from `useUser()` context.

### Task A-S2: Answer Selector — `src/components/screening/AnswerSelector.tsx`

Props: `onSelect: (score: number) => void`, `disabled?: boolean`.
Renders 5 buttons from `ANSWER_OPTIONS`. Layout: `flex gap-2 flex-wrap`.
Each button: `px-4 py-2 rounded-lg border border-border text-sm font-medium transition-all hover:border-green hover:bg-green-light hover:text-green`.

### Task A-S3: Screening Chat — `src/components/screening/ScreeningChat.tsx`

Props: `currentQuestionIndex`, `answers`, `phase`, `onAnswer`.
Container: `flex flex-col gap-3 overflow-y-auto max-h-[60vh] p-4`.
Rendering:
- Past questions: `<ChatBubble variant="agent">` question + `<ChatBubble variant="user">` answer label
- Current question: `<ChatBubble variant="agent">` + `<AnswerSelector>`
- Evaluating: `<ChatBubble variant="agent" isTyping />`
Auto-scroll: `useRef` on container, `useEffect` → `ref.current.scrollTop = ref.current.scrollHeight`.

### Task A-S4: Radar Chart — `src/components/screening/CognitiveRadarChart.tsx`

**Demo highlight. Staggered animation is critical.**

Props: `dimensions: RadarDimension[]`, `animate?: boolean`.
Import: `{ RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer }` from `"recharts"`.

Animation: `useState<number[]>([0,0,0,0,0,0])`. On mount/prop change, 200ms staggered `setTimeout` per dimension to set real value. Chart data:
```ts
const chartData = dimensions.map((d, i) => ({ dimension: d.label, value: animatedValues[i], fullMark: 100 }));
```
Recharts: `<RadarChart>` → `<PolarGrid stroke="var(--border)" />` → `<PolarAngleAxis>` → `<Radar dataKey="value" stroke="var(--radar-stroke)" fill="var(--radar-fill)" strokeWidth={2} />`.
Wrap in `<Card>` with title "Your Cognitive Portrait" in `font-serif text-2xl`.

### Task A-S5: Profile Tags Reveal — `src/components/screening/ProfileTagsReveal.tsx`

Props: `tags: string[]`, `summary: string`, `onContinue: () => void`.
3 `<Badge color="green">` tags in `flex gap-2 justify-center`, each with stagger: `opacity-0 fade-in delay-200/400/600`.
Summary: `text-ink-muted text-center max-w-lg mx-auto mt-4 fade-in delay-800`.
Button: `<Button variant="primary" size="lg" className="mt-6 fade-in delay-1000">` calls `onContinue`.

### Task A-S6: Screening Page — `src/app/screening/page.tsx`

```
<PageContainer>
  {phase === "idle" && (
    <div className="text-center max-w-xl mx-auto pt-12">
      <h1 className="font-serif text-3xl font-bold">Let's understand how your brain works</h1>
      <p className="text-ink-muted mt-4">6 quick questions from the WHO ASRS-6 scale...</p>
      <Button onClick={startScreening} className="mt-8">Begin Screening</Button>
    </div>
  )}
  {(phase === "questioning" || phase === "evaluating") && <ScreeningChat ... />}
  {phase === "complete" && profile && (
    <>
      <CognitiveRadarChart dimensions={profile.dimensions} />
      <ProfileTagsReveal tags={profile.profileTags} summary={profile.summary} onContinue={() => router.push("/plan")} />
    </>
  )}
</PageContainer>
```

### Task A-S7: Integration Test — Screening

1. Start backend + frontend
2. Navigate to `/screening`
3. Click "Begin Screening"
4. Answer all 6 questions
5. Verify: loading spinner appears during evaluation, radar chart animates with stagger, profile tags fade in
6. Click "Continue to Plan" → navigates to `/plan`

---

## Person A: Feature 2 — Dashboard (`/dashboard`)

### Backend Endpoint Person A Owns

| Endpoint | What it does | Backend file to fix if broken |
|----------|-------------|------------------------------|
| `GET /api/dashboard/{userId}` | Returns 14-day trends, momentum, hypotheses | `app/routes/dashboard.py`, `app/services/momentum_service.py` |

### Task A-D1: Dashboard Hook — `src/hooks/useDashboard.ts`

```ts
interface UseDashboardReturn {
  data: DashboardResponse | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}
```
On mount, call `fetchDashboard(userId)`. Store in `data`. `refresh()` re-fetches.

### Task A-D2: Momentum Score — `src/components/dashboard/MomentumScore.tsx`

Props: `score: number`, `delta: number`.
Layout: `<Card padding="lg">` centered.
Count-up: start from 0, animate to `score` over ~1s using `requestAnimationFrame` or `setInterval`. Display in `font-serif text-6xl font-bold text-green`.
Delta: `delta > 0` → `<TrendingUp />` from lucide in `text-green` + "+{delta}". `delta < 0` → `<TrendingDown />` in `text-red`.
Label: `text-ink-muted text-sm mt-2` — "14-day momentum".

### Task A-D3: Trend Chart — `src/components/dashboard/TrendChart.tsx`

Props: `data: TrendDataPoint[]`, `annotations: AgentAnnotation[]`.
Import: `{ LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot }` from `"recharts"`.

**Scale mood 1-10 → 0-100:** `data.map(d => ({ ...d, moodScaled: d.moodScore * 10 }))`.

Two lines: mood (green) + completion (blue). Annotation dots: red = intervention, violet = pattern.
Legend below: red dot + "Intervention triggered", violet dot + "Pattern detected".

### Task A-D4: Hypothesis Card — `src/components/dashboard/HypothesisCard.tsx`

Props: `card: HypothesisCard`.
Confidence dot: high=`bg-green`, medium=`bg-amber`, low=`bg-ink-faint`. Size: `w-3 h-3 rounded-full`.
Status badge: testing=blue, confirmed=green, rejected=red.
Pattern: `font-semibold text-base`. Prediction: `text-ink-muted text-sm mt-2`. Evidence: bulleted list `text-ink-faint text-xs`.

### Task A-D5: Dashboard Page — `src/app/dashboard/page.tsx`

Grid: `grid-cols-1 lg:grid-cols-3 gap-6`. Left 2/3: MomentumScore + TrendChart. Right 1/3: HypothesisCards.
If no user, redirect to landing. Show `<LoadingSpinner>` while loading.

### Task A-D6: Integration Test — Dashboard

1. Login as guest (Alex has seeded data)
2. Navigate to `/dashboard`
3. Verify: momentum counts up to ~71, delta shows +23, trend chart shows 14 days, 2 hypothesis cards render
4. Annotation dots appear at days 4 and 11

---

## Person B: Feature 3 — Daily Planner + Intervention (`/plan`)

### Design System Mapping (IMPORTANT)

The actual frontend uses a **cream/blue palette**, not the green palette originally planned. Use these actual Tailwind classes:

| Original Reference | Actual Class to Use | Hex |
|---|---|---|
| `bg-green` / `text-green` | `bg-primary` / `text-primary` | #4a6a8e |
| `bg-green-light` | `bg-primary-50` | #eef2f7 |
| `text-ink` | `text-foreground` | #3a5268 |
| `text-ink-muted` | `text-muted-foreground` | #6b85a0 |
| `text-ink-faint` | `text-faint-foreground` | #9bafc5 |
| `bg-bg` | `bg-background` | #f5f1ea |
| `bg-bg-card` | `bg-surface` | #fafaf7 |
| `bg-red` / danger | `bg-error` | #8b4a4a |
| `bg-amber` / warning | `bg-warning` | #8b7355 |
| `bg-violet` | `bg-secondary` | #5f6ab4 |

Brain state colors use CSS custom properties: `var(--brain-foggy)`, `var(--brain-focused)`, `var(--brain-wired)` — applied via inline `style` (not Tailwind classes).

Existing component APIs:
- `Button`: variants = `primary | secondary | outline | ghost | danger` (danger added by Person B)
- `Badge`: colors = `primary | secondary | accent | success | warning | error | neutral`
- `Card`: uses `bg-surface border-border shadow-sm`
- `LoadingSpinner`: takes `size: number` (not string), `label?: string`

### Backend Endpoints Person B Owns

| Endpoint | What it does | Backend file to fix if broken |
|----------|-------------|------------------------------|
| `POST /api/plan/generate` | Brain state + profile → CrewAI planning agent → task plan | `app/routes/plan.py`, `app/agents/planning_agent.py` |
| `POST /api/plan/intervene` | Stuck trigger → CrewAI intervention agent → acknowledgment + restructured plan | `app/routes/plan.py`, `app/agents/intervention_agent.py` |

### Task B-P0: Shared File Modifications (MUST DO FIRST)

Person B must add to these Phase 1 files before building components. All changes are purely additive (appending new types, new exports, new CSS rules).

**0a. `frontend/src/app/globals.css`** — Append after scrollbar section:
- Brain state CSS variables: `--brain-foggy`, `--brain-foggy-light`, `--brain-focused`, `--brain-focused-light`, `--brain-wired`, `--brain-wired-light`
- Category color variables: `--cat-deep-work`, `--cat-admin`, `--cat-creative`, etc. (mapped to existing `--color-primary`, `--color-secondary`, etc.)
- Animations: `pulse-red` (pulsing box-shadow), `fadeIn` (opacity+translateY), `typewriter-caret` (blinking cursor)
- Delay utilities: `.delay-100` through `.delay-2000`

**0b. `frontend/src/types/index.ts`** — Append after `ApiError`:
```ts
export type BrainState = "foggy" | "focused" | "wired";

export interface PlanTask {
  index: number;
  title: string;
  description: string;
  duration_minutes: number;  // snake_case matches backend
  time_slot: string;         // snake_case matches backend
  category: string;
  rationale: string;
  priority: string;
  status: string;
}

export interface PlanResponse {
  planId: string;
  tasks: PlanTask[];
  overallRationale: string;
}

export interface InterventionResponse {
  interventionId: string;
  acknowledgment: string;
  restructuredTasks: PlanTask[];
  agentReasoning: string;
  followupHint?: string;
}
```

**0c. `frontend/src/lib/api.ts`** — Add named exports (keep `export default api`):
- `createGuestSession()` → `POST /api/auth/guest` → returns `{ userId, name, isGuest, hasProfile }`
- `generatePlan(userId, brainState, tasks?)` → `POST /api/plan/generate` → returns `PlanResponse`
- `triggerIntervention(userId, planId, stuckTaskIndex, userMessage?)` → `POST /api/plan/intervene` → returns `InterventionResponse`

**0d. `frontend/src/lib/constants.ts`** — Append `BRAIN_STATES`, `CATEGORY_COLORS`, `CATEGORY_ICONS` (using `var(--brain-*)` and `var(--cat-*)` CSS variables).

**0e. `frontend/src/hooks/useUser.tsx`** — Replace `loginAsGuest()`:
- **Current**: creates local-only user with `crypto.randomUUID()` — backend never called
- **Updated**: calls `createGuestSession()` from api.ts, maps `response.userId` → `user.id`, adds `isLoading` to context
- This is **required** because plan/intervention API calls need a real Supabase userId

**0f. `frontend/src/components/auth/GuestLoginButton.tsx`** — Make `handleClick` async, `await loginAsGuest()`, redirect to `/plan` (Alex has `hasProfile: true`).

**0g. `frontend/src/components/ui/Button.tsx`** — Add `"danger"` variant: `"bg-error text-white hover:opacity-90 focus-visible:ring-error"`.

### Task B-P1: Daily Plan Hook — `src/hooks/useDailyPlan.ts`

```ts
interface UseDailyPlanReturn {
  brainState: BrainState | null;
  setBrainState: (state: BrainState) => void;
  plan: PlanResponse | null;
  isGenerating: boolean;
  generateDailyPlan: () => Promise<void>;
  isIntervening: boolean;
  intervention: InterventionResponse | null;
  triggerStuck: (taskIndex: number, message?: string) => Promise<void>;
  clearIntervention: () => void;
  error: string | null;
}
```

Logic:
- `generateDailyPlan()`: calls `generatePlan(user.id, brainState)`. Sets `plan`.
- `triggerStuck(taskIndex, message)`: calls `triggerIntervention(user.id, plan.planId, taskIndex, message)`. Sets `intervention`. Then updates `plan.tasks` to `intervention.restructuredTasks`.
- `clearIntervention()`: sets `intervention` to null.
- Get `user.id` from `useUser()` context (mapped from backend `userId`).

### Task B-P2: Brain State Selector — `src/components/plan/BrainStateSelector.tsx`

Props: `selected: BrainState | null`, `onSelect: (state: BrainState) => void`, `disabled?: boolean`.
Layout: `grid grid-cols-3 gap-4`.
Each button: `p-6 rounded-xl border-2 transition-all cursor-pointer text-center`.
Unselected: `border-border bg-surface`. Selected: inline `style={{ borderColor: state.color, backgroundColor: state.lightColor }}`.
Inside: lucide icon (`Cloud`/`Crosshair`/`Zap`) + label + description (`text-muted-foreground`).

```tsx
import { Cloud, Crosshair, Zap } from "lucide-react";
const ICONS = { foggy: Cloud, focused: Crosshair, wired: Zap };
```

### Task B-P3: Task Card — `src/components/plan/TaskCard.tsx`

Props: `task: PlanTask`, `index: number`, `onStuck?: (index: number) => void`, `isNew?: boolean`.

Layout: `<Card>` with `border-l-4` inline style `borderLeftColor: CATEGORY_COLORS[task.category]`.
Row 1: Category icon (lucide) + title (`font-semibold text-foreground`) + priority badge (`error`=high, `warning`=medium, `neutral`=low).
Row 2: `text-muted-foreground text-sm` — time_slot + " · " + duration_minutes + " min".
Row 3: Description `text-sm text-muted-foreground`.
Row 4: Separator `border-t border-border`, then rationale in `text-sm italic text-faint-foreground mt-2`.
If `task.status === "completed"`: `<CheckCircle2>` accent + strikethrough title + `opacity-60`.
If `isNew`: apply `fade-in` class with staggered `animationDelay: index * 100ms`.

### Task B-P4: Daily Plan View — `src/components/plan/DailyPlanView.tsx`

Props: `plan: PlanResponse`, `onStuck: (taskIndex: number) => void`.
Header: `<Badge color="accent">` with today's date + overall rationale `italic text-muted-foreground`.
Task list: `flex flex-col gap-4`, map tasks to `<TaskCard>`.

### Task B-P5: Stuck Button — `src/components/plan/StuckButton.tsx`

Props: `tasks: PlanTask[]`, `onStuck: (taskIndex: number, message?: string) => void`, `disabled?: boolean`.

**Two-stage interaction:**

Stage 1 (collapsed): `fixed bottom-6 right-6 z-40`. `bg-error text-white px-6 py-3 rounded-full font-semibold shadow-lg pulse-red`. Text: "I'm Stuck".

Stage 2 (expanded, on click): Panel `w-80 rounded-xl border border-border bg-surface p-5 shadow-lg`:
- Task picker: radio labels with `border-border` unselected / `border-primary bg-primary-50 text-primary` selected
- Textarea: `border-border bg-background text-foreground placeholder:text-faint-foreground focus:border-primary`
- `<Button variant="danger">` "Get Help"
- `<Button variant="ghost">` "Cancel"
On submit: `onStuck(selectedTaskIndex, messageText)`. On cancel: collapse back to Stage 1.

### Task B-P6: Intervention Panel — `src/components/plan/InterventionPanel.tsx`

**Demo climax. Must feel emotionally impactful.**

Props: `intervention: InterventionResponse`, `onClose: () => void`.

Overlay: `fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center`.
Panel: `bg-surface rounded-2xl max-w-xl w-full mx-4 p-8 shadow-lg max-h-[80vh] overflow-y-auto`.

Render sequence:
1. **Acknowledgment** (typewriter): "Attune hears you" heading (`font-serif text-xl font-semibold text-primary`). Text reveals character by character using `setInterval(25ms)` storing visible substring in `useState`. Blinking cursor via `typewriter-caret` class.
2. **Restructured Plan** (appears 2s later): `useState<boolean>(false)` + `setTimeout(2000)`. `fade-in` animation. Map `intervention.restructuredTasks` to `<TaskCard isNew />`.
3. **Agent Reasoning**: Collapsible "Why these changes?" button (`text-muted-foreground hover:text-foreground`). Content: `text-sm italic text-faint-foreground`.
4. **Close**: `<Button variant="primary" size="lg" className="w-full">` "Got it, let's go" → `onClose`.
5. **Followup hint**: If `intervention.followupHint`, show as `text-faint-foreground text-xs`.

### Task B-P7: Plan Page — `src/app/plan/page.tsx`

```
<PageContainer>
  {!user → redirect to landing}

  <h1 className="mb-6 font-serif text-3xl font-bold text-foreground">Your Daily Plan</h1>

  <p className="mb-3 text-sm text-muted-foreground">How is your brain feeling right now?</p>
  <BrainStateSelector selected={brainState} onSelect={setBrainState} disabled={isGenerating} />

  {brainState && !plan && !isGenerating && (
    <Button onClick={generateDailyPlan} variant="primary" size="lg">Generate My Plan</Button>
  )}

  {isGenerating && <LoadingSpinner size={32} label="AI agents are crafting your plan..." />}

  {error && <div className="rounded-lg border border-error bg-error/5 p-4 text-sm text-error">{error}</div>}

  {plan && !isGenerating && <DailyPlanView plan={plan} onStuck={triggerStuck} />}
  {plan && !isGenerating && <StuckButton tasks={plan.tasks} onStuck={triggerStuck} disabled={isIntervening} />}

  {isIntervening && !intervention && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="rounded-xl bg-surface p-8 shadow-lg">
        <LoadingSpinner size={32} label="Attune is thinking..." />
      </div>
    </div>
  )}

  {intervention && <InterventionPanel intervention={intervention} onClose={clearIntervention} />}
</PageContainer>
```

### Task B-P8: Integration Test — Planner + Intervention

1. Login as guest (Alex has profile — backend creates real user in Supabase)
2. Navigate to `/plan`
3. Select "Focused" brain state → card highlights with sage green border/bg
4. Click "Generate My Plan" → loading spinner → tasks appear with rationale (3-10s)
5. Click "I'm Stuck" → red pill expands to panel with task picker
6. Select a task, type "I can't focus on this", click "Get Help"
7. Verify: loading overlay, then typewriter acknowledgment appears, restructured plan fades in 2s later
8. Click "Got it, let's go" → overlay closes, plan shows updated tasks

---

# PHASE 3 — INTEGRATION & POLISH

> **Both people together.** Merge feature branches and test the full demo flow.

### Task 1: Merge Branches

```bash
git checkout main
git merge feature/screening-dashboard
git merge feature/planner-intervention
# Resolve any conflicts (should be zero if file ownership was respected)
```

### Task 2: Full Demo Flow Test

Walk through the 4-minute demo script:

| Step | What to do | What to check |
|------|-----------|---------------|
| 1 | Open localhost:3000 | Landing page hero renders |
| 2 | Click "Continue as Guest" | Alex created, Navbar shows "Alex", redirects to /plan |
| 3 | Navigate to Dashboard | Momentum counts up to ~71, trend chart has 14 points, 2 hypothesis cards |
| 4 | Navigate to Screening | Idle state shows intro |
| 5 | Click "Begin Screening" | Chat begins, question 1 appears |
| 6 | Answer all 6 questions | Chat auto-scrolls, 500ms delay between questions |
| 7 | Wait for evaluation | Loading spinner / typing dots during CrewAI call |
| 8 | See results | Radar chart animates with 200ms stagger, tags fade in |
| 9 | Click "Continue to Plan" | Navigates to /plan |
| 10 | Select brain state | Card highlights with color |
| 11 | Click "Generate My Plan" | Loading spinner 3-10s, then tasks with rationale |
| 12 | Click "I'm Stuck" | Red pill expands |
| 13 | Select task + message + "Get Help" | Typewriter acknowledgment, plan fades in |
| 14 | Close intervention | Plan updated with restructured tasks |

### Task 3: Fix Common Issues

| Issue | How to fix |
|-------|-----------|
| CORS error in browser console | Check backend `main.py` has `allow_origins=["http://localhost:3000"]`, `allow_methods=["*"]`, `allow_headers=["*"]` |
| `userId` returns as `user_id` from backend | Add camelCase aliases to backend Pydantic models (see Phase 1 Task B6) |
| Radar chart doesn't render | Make sure `recharts` components are in a `"use client"` file |
| `useUser()` returns null on page load | Check that `layout.tsx` wraps with `<UserProvider>` |
| Plan page shows blank | Check if `hasProfile` is returned by guest endpoint |
| Intervention timeout | CrewAI can be slow. Check loading spinner shows. Increase axios timeout if needed. |

### Task 4: Polish Animations

- Radar stagger: exactly 200ms per dimension
- Profile tags: fade in after radar completes (~2s)
- Momentum count-up: 0 → value over 1s
- Typewriter: ~25ms per character
- Restructured plan: fades in 2s after acknowledgment starts

---

## API Contracts Quick Reference

```
POST /api/auth/guest
  Request:  {} (empty body)
  Response: { userId, name, isGuest, hasProfile }

POST /api/screening/evaluate
  Request:  { userId, answers: [{ questionIndex, questionText, score }] }
  Response: { profileId, dimensions[], profileTags[], summary, asrsTotalScore, isPositiveScreen }

GET /api/profile/{userId}
  Response: { dimensions[], profileTags[], summary }

POST /api/plan/generate
  Request:  { userId, brainState: "foggy"|"focused"|"wired", tasks?: string[] }
  Response: { planId, tasks[], overallRationale }

POST /api/plan/intervene
  Request:  { userId, planId, stuckTaskIndex, userMessage? }
  Response: { interventionId, acknowledgment, restructuredTasks[], agentReasoning, followupHint? }

GET /api/dashboard/{userId}
  Response: { trendData[], momentumScore, momentumDelta, hypothesisCards[], agentAnnotations[] }
```

**Timeouts:** CrewAI endpoints take 3-10s. Axios timeout is 30s. Always show loading spinners.

---

## Alex Seed Data (Demo Account)

Guest login creates Alex with pre-seeded 14-day history:
- `hasProfile: true` — can go straight to /plan or /dashboard
- **Profile:** Attention:42, Time:35, Emotional:78, Memory:51, Initiation:30, Hyperfocus:88
- **Tags:** Deep-Diver, Momentum-Builder, Intensity-Engine
- **Dashboard:** momentum ~71, delta ~+23, 14 trend points, 2 hypothesis cards
- **Interventions:** Days 4 and 11

---

## Design Reference

| Element | Font | Weight |
|---------|------|--------|
| Page headings (h1) | Playfair Display (`font-serif`) | 700 (bold) |
| Section headings (h2) | IBM Plex Sans (`font-sans`) | 600 (semibold) |
| Body text | IBM Plex Sans | 400 (regular) |
| Buttons | IBM Plex Sans | 500 (medium) |

### Actual Color Palette (cream/blue — implemented in globals.css)

| Token | Hex | Tailwind Class | Usage |
|-------|-----|---------------|-------|
| Background | `#f5f1ea` | `bg-background` | Page bg |
| Surface | `#fafaf7` | `bg-surface` | Cards |
| Primary | `#4a6a8e` | `bg-primary` / `text-primary` | CTAs, links |
| Secondary | `#5f6ab4` | `bg-secondary` | Creative, patterns |
| Accent | `#3f8265` | `bg-accent` / `text-accent` | Success, sage green |
| Error | `#8b4a4a` | `bg-error` / `text-error` | Danger, stuck button |
| Warning | `#8b7355` | `text-warning` | Warnings |
| Foreground | `#3a5268` | `text-foreground` | Primary text |
| Muted fg | `#6b85a0` | `text-muted-foreground` | Secondary text |
| Faint fg | `#9bafc5` | `text-faint-foreground` | Tertiary text |
| Border | `#d9d3c7` | `border-border` | Borders |

### Brain State Colors (CSS custom properties)

| State | Color | Light | CSS Variable |
|-------|-------|-------|-------------|
| Foggy | `#8b95a5` | `#f0f2f5` | `var(--brain-foggy)` |
| Focused | `#3f8265` | `#f0f5f2` | `var(--brain-focused)` |
| Wired | `#8b4a4a` | `#f5efef` | `var(--brain-wired)` |

**No dark mode.** Light theme only.

---

## Git Strategy

```
main
 └── backend                          ← Phase 1 complete (backend + frontend-foundation merged)
      ├── feature/screening-dashboard  ← Person A Phase 2
      └── feature/planner-intervention ← Person B Phase 2 (current)
```

Phase 1 `deb/frontend-foundation` has been merged into `backend`. Both feature branches are created from `backend`.

---

## Deployment

**Backend (Railway):**
1. Push `backend/` to Railway
2. Set env vars: `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_URL`

**Frontend (Vercel):**
1. Import repo in Vercel, root = `frontend/`
2. Set env var: `NEXT_PUBLIC_API_URL` = Railway backend URL
3. Deploy

---

## Demo Flow (4 minutes)

| Time | Screen | Person who built it |
|------|--------|-------------------|
| 0:00-0:15 | Landing — hero, "Continue as Guest" | Phase 1 (Person A) |
| 0:15-1:00 | Dashboard — momentum 71, trends, hypotheses | Person A |
| 1:00-2:30 | Screening — 6 questions, radar chart, profile tags | Person A |
| 2:30-3:30 | Planner — brain state, generate plan, tasks with rationale | Person B |
| 3:30-4:00 | Intervention — "I'm Stuck", typewriter, restructured plan | Person B |

---

# END-TO-END TEST FLOWS

> 3 user journeys covering all features. All use the seeded Alex guest account (`UUID: 00000000-0000-0000-0000-000000000001`).

## Prerequisites (All Flows)

```bash
# Terminal 1: Backend
cd backend && source venv/bin/activate && uvicorn main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend && npm run dev
```

- Verify: `curl http://localhost:8000/` → `{"status":"ok"}`
- Verify: `http://localhost:3000` loads landing page
- Clear localStorage before each flow: DevTools > Application > Local Storage > Clear

---

## Flow 1: First-Time Guest — Plan + Intervention

**Persona:** Alex has never used Attune. Lands on homepage, logs in, generates a plan, gets stuck, receives intervention.

| # | Action | Expected Result | Verify |
|---|--------|-----------------|--------|
| 1 | Open `http://localhost:3000` | Landing page with hero headline, stats, CTAs | Page renders, no console errors |
| 2 | Click **"Continue as Guest"** | Loading spinner on button | `POST /api/auth/guest` fires in Network tab |
| 3 | Wait for redirect | Navigates to `/plan` (Alex has `hasProfile: true`) | URL is `/plan`, navbar shows "Alex" pill |
| 4 | Verify plan page idle state | "Your Daily Plan" heading, 3 brain state cards (Foggy/Focused/Wired), no generate button yet | All 3 cards visible with icons (Cloud/Crosshair/Zap) |
| 5 | Click **"Focused"** card | Card highlights with sage green border + light green bg | `border-color` matches `var(--brain-focused)` |
| 6 | Verify generate button appears | "Generate My Plan" primary button visible | Button not disabled |
| 7 | Click **"Generate My Plan"** | Spinner: "AI agents are crafting your plan..." | `POST /api/plan/generate` with `brainState: "focused"` |
| 8 | Wait 3-10s for CrewAI | Spinner persists, no timeout | No 500 error, no CORS error |
| 9 | Plan appears | 4-6 task cards with fade-in stagger animation | Each card: title, time_slot, duration, category color bar, priority badge, rationale |
| 10 | Verify overall rationale | Italic text above task list explaining plan logic | Text is non-empty, references "focused" state |
| 11 | Verify "I'm Stuck" button | Red pulsing pill in bottom-right corner | `pulse-red` animation visible |
| 12 | Click **"I'm Stuck"** | Panel expands: task picker radios + textarea + "Get Help" / "Cancel" | Only non-completed tasks shown as options |
| 13 | Select first task radio | Radio highlights with primary border/bg | One task selected |
| 14 | Type `"I can't focus on this"` in textarea | Text appears in input | Textarea not disabled |
| 15 | Click **"Get Help"** | Panel collapses, full-screen overlay: "Attune is thinking..." spinner | `POST /api/plan/intervene` fires |
| 16 | Wait 3-10s for CrewAI | Overlay persists with spinner | No timeout, no error |
| 17 | Intervention panel appears | **Typewriter effect**: "Attune hears you" heading, then acknowledgment text reveals char-by-char (~25ms/char) | Blinking cursor visible during typing |
| 18 | Wait 2s after typing starts | Restructured tasks fade in below acknowledgment | `fade-in` animation, tasks have `isNew` styling |
| 19 | Verify restructured tasks | Smaller micro-steps replacing the stuck task, momentum starter added | Task count may differ from original, durations shorter |
| 20 | Click **"Why these changes?"** | Reasoning section expands with agent logic | References Alex's cognitive profile |
| 21 | Verify followup hint (if present) | Small faint text at bottom | Optional — may or may not appear |
| 22 | Click **"Got it, let's go"** | Overlay closes | Plan view now shows restructured tasks |
| 23 | Verify plan updated | Original task list replaced with intervention's `restructuredTasks` | Task cards reflect new titles/durations |

**Critical assertions:**
- No 500 errors at any step
- Typewriter completes (not instant)
- Restructured tasks visibly different from original
- Plan persists after closing intervention

---

## Flow 2: Screening-First User — ASRS Assessment + Plan

**Persona:** Alex wants to understand their cognitive profile first, then generate a plan with "Foggy" brain state.

| # | Action | Expected Result | Verify |
|---|--------|-----------------|--------|
| 1 | Clear localStorage, open `http://localhost:3000` | Landing page loads fresh | No stored user |
| 2 | Click **"Continue as Guest"** | Redirects to `/plan` | Alex seeded with `hasProfile: true` |
| 3 | Navigate to **`/screening`** via navbar or URL | Screening page loads | "Let's understand how your brain works" heading |
| 4 | Click **"Begin Screening"** | Chat interface appears, question 1 in agent bubble | Phase transitions to "questioning" |
| 5 | Read Q1 | "How often do you have trouble wrapping up the final details..." | Matches `ASRS_QUESTIONS[0]` |
| 6 | Click **"Often"** (score=3) | User ChatBubble shows "Often", 500ms pause | Answer stored in state |
| 7 | Q2 appears after 500ms | "How often do you have difficulty getting things in order..." | Auto-scroll to new question |
| 8 | Answer Q2: **"Sometimes"** (score=2) | User bubble + 500ms delay | Index increments to 2 |
| 9 | Answer Q3: **"Often"** (score=3) | "problems remembering appointments" → "Often" | |
| 10 | Answer Q4: **"Very Often"** (score=4) | "task that requires a lot of thought" → "Very Often" | |
| 11 | Answer Q5: **"Rarely"** (score=1) | "fidget or squirm" → "Rarely" | |
| 12 | Answer Q6: **"Sometimes"** (score=2) | "feel overly active" → "Sometimes" | Last question |
| 13 | Phase transitions to "evaluating" | Typing dots animation in agent bubble | `POST /api/screening/evaluate` fires with 6 answers |
| 14 | Wait 3-10s for CrewAI | Typing dots persist | No timeout |
| 15 | Radar chart appears | CognitiveRadarChart with 6 dimensions | Chart rendered via recharts |
| 16 | Verify staggered animation | Each dimension fills in with 200ms delay (total ~1.2s) | Values animate from 0 to final score |
| 17 | Verify all 6 dimensions labeled | Attention Regulation, Time Perception, Emotional Intensity, Working Memory, Task Initiation, Hyperfocus Capacity | All axes visible |
| 18 | Profile tags fade in (~1.5s after radar) | 3 Badge components appear with stagger | Tags like "Deep-Diver", "Momentum-Builder" etc. |
| 19 | Summary text fades in | Paragraph describing cognitive profile | Non-empty, personalized text |
| 20 | Click **"Continue to Plan"** | Navigates to `/plan` | URL is `/plan` |
| 21 | Select **"Foggy"** brain state | Card highlights with gray/blue border | Different plan than "focused" |
| 22 | Click **"Generate My Plan"** | Spinner → CrewAI generates foggy-optimized plan | Tasks should have shorter durations, momentum starters |
| 23 | Verify foggy-appropriate tasks | Plan accounts for low energy: shorter blocks, easier tasks first | Rationale mentions "foggy" or "low energy" |

**Critical assertions:**
- All 6 questions appear in correct order
- 500ms delay between questions is perceptible
- Radar chart animates (not static)
- Profile tags are non-empty and relevant
- Screening agent produces valid 0-100 dimension scores
- "Foggy" plan differs meaningfully from "focused" plan

---

## Flow 3: Returning User — Dashboard Review + Re-Plan with "Wired" State

**Persona:** Alex has been using Attune for 14 days (seeded data). Reviews progress on dashboard, then plans with high energy and triggers multiple interventions.

| # | Action | Expected Result | Verify |
|---|--------|-----------------|--------|
| 1 | Open `http://localhost:3000`, login as guest if needed | Alex session active | Navbar shows "Alex" |
| 2 | Navigate to **`/dashboard`** | Dashboard page loads | `GET /api/dashboard/{userId}` returns 200 |
| 3 | Verify momentum score | Large number displays, counts up from 0 to ~71 over ~1s | `count-up` animation visible |
| 4 | Verify momentum delta | Shows **+23** with green up-arrow icon | `TrendingUp` icon in green |
| 5 | Verify trend chart | Line chart with 14 data points | Two lines: mood (green) + completion (blue) |
| 6 | Verify annotation dots | Red dots at **day 4** and **day 11** | Intervention markers visible on chart |
| 7 | Verify hypothesis card 1 | "Energy Crash Pattern" — high confidence, active status | Green confidence dot, "active" badge |
| 8 | Read card 1 prediction | "Low-energy days follow 2+ consecutive high-output days" | Evidence bullets reference specific days |
| 9 | Verify hypothesis card 2 | "Momentum Activation Pattern" — medium confidence, confirmed status | Amber confidence dot, "confirmed" badge |
| 10 | Read card 2 prediction | "First task completed within 30min → +1.5 mood" | Evidence references days 2, 8, 14 |
| 11 | Navigate to **`/plan`** | Plan page loads | Brain state selector visible |
| 12 | Select **"Wired"** brain state | Card highlights with red/warm border | Uses `var(--brain-wired)` color |
| 13 | Click **"Generate My Plan"** | Spinner → CrewAI generates wired-optimized plan | `POST /api/plan/generate` with `brainState: "wired"` |
| 14 | Verify wired-appropriate tasks | Plan channels high energy: physical tasks, complex work, shorter breaks | Rationale mentions "wired" or "high energy" or "restless" |
| 15 | Click **"I'm Stuck"** | Panel expands | Task options visible |
| 16 | Select a task, type **"too many things going on in my head"** | Task selected, message entered | |
| 17 | Click **"Get Help"** | Loading overlay → intervention agent runs | `POST /api/plan/intervene` fires |
| 18 | Verify acknowledgment tone | Typewriter text acknowledges the *wired* experience specifically | Should reference racing thoughts / overstimulation, not low energy |
| 19 | Verify restructured tasks | Tasks reorganized for wired brain: channel energy, reduce overwhelm | Different restructuring strategy than foggy/focused |
| 20 | Close intervention | Plan updates | New task list persists |
| 21 | Click **"I'm Stuck"** again on a different task | Second intervention triggers | System handles multiple interventions in one session |
| 22 | Verify second acknowledgment | Different text from first (not cached) | CrewAI generates fresh response |
| 23 | Close second intervention | Plan updates again | Tasks reflect both restructurings |

**Critical assertions:**
- Dashboard data matches seeded values (momentum ~71, delta ~23, 14 days, 2 cards)
- Momentum count-up animation is smooth (not instant jump)
- "Wired" plan meaningfully differs from "focused" and "foggy" plans
- Intervention acknowledgment is contextual to brain state and user message
- Multiple interventions in one session work without errors
- Each intervention produces unique acknowledgment text

---

## Error Scenarios (Verify Across All Flows)

| Scenario | How to Trigger | Expected Behavior |
|----------|---------------|-------------------|
| Backend down | Stop uvicorn, click "Generate My Plan" | Error banner (red box with message), no crash |
| Stale localStorage | Manually edit localStorage UUID to bogus value | 500 on API calls, should show error state |
| CrewAI slow response | Normal — agents take 3-10s | Spinner persists, no premature timeout |
| Double-click generate | Click "Generate" twice rapidly | Button disabled during `isGenerating`, only one request fires |
| Empty stuck message | Click "Get Help" without typing | Should still work (`userMessage` is optional) |
| Browser refresh mid-plan | Refresh page after plan generated | Plan state lost (React state only), user stays logged in, can regenerate |

---

## Backend Quick Verification (curl)

```bash
# Health check
curl http://localhost:8000/

# Guest login
curl -X POST http://localhost:8000/api/auth/guest -H "Content-Type: application/json"

# Profile
curl http://localhost:8000/api/profile/00000000-0000-0000-0000-000000000001

# Dashboard
curl http://localhost:8000/api/dashboard/00000000-0000-0000-0000-000000000001

# Generate plan
curl -X POST http://localhost:8000/api/plan/generate \
  -H "Content-Type: application/json" \
  -d '{"userId":"00000000-0000-0000-0000-000000000001","brainState":"focused"}'

# Intervention (replace PLAN_ID with real ID from generate step)
curl -X POST http://localhost:8000/api/plan/intervene \
  -H "Content-Type: application/json" \
  -d '{"userId":"00000000-0000-0000-0000-000000000001","planId":"PLAN_ID","stuckTaskIndex":0,"userMessage":"I cannot focus"}'

# Screening
curl -X POST http://localhost:8000/api/screening/evaluate \
  -H "Content-Type: application/json" \
  -d '{"userId":"00000000-0000-0000-0000-000000000001","answers":[{"questionIndex":0,"questionText":"...","score":3},{"questionIndex":1,"questionText":"...","score":2},{"questionIndex":2,"questionText":"...","score":3},{"questionIndex":3,"questionText":"...","score":4},{"questionIndex":4,"questionText":"...","score":2},{"questionIndex":5,"questionText":"...","score":1}]}'
```

---

# PHASE 4 — PRODUCTION HARDENING & AGENT ENHANCEMENT

> **Both people together.** This phase transforms the hackathon demo into a production-grade, funding-ready MVP. Work is split by sub-phase — auth must be completed first, then privacy/learning/validation can run in parallel, with orchestration last.

---

## Architecture Review — Why Phase 4 Exists

### Current AI Agent Architecture (Phases 1-3)

The 3 CrewAI agents operate as **independent, stateless, single-turn LLM calls**:

```
Frontend → FastAPI Route → CrewAI Agent (1 agent, 1 task) → Claude Sonnet 4 → JSON → Response
```

**What works well:**
- Clear agent specialization (screening / planning / intervention)
- Database-mediated context sharing (not agent chaining) — independently retryable
- Deterministic operations correctly handled in Python (scoring, momentum calculation)
- Intervention agent's "acknowledge → validate → restructure" sequence is genuinely valuable AI

**What needs improvement:**

| Gap | Problem | Impact |
|-----|---------|--------|
| **No auth** | Hardcoded Alex UUID, no JWT, RLS is "allow all" | Any client can access any user's data |
| **No privacy** | ADHD screening = sensitive health data, no delete/export | GDPR/HIPAA non-compliant |
| **No learning** | Agents are stateless, hypothesis cards pre-seeded | "Adaptive" positioning is hollow |
| **Underutilized CrewAI** | Single-agent sequential crews, no memory/knowledge | Missing 60% of CrewAI's value |
| **Fragile output** | JSON extracted via `raw.find("{")` | Breaks on malformed Claude output |
| **No streaming** | 3-10s spinner wait for agent calls | Poor UX, no progress visibility |

### Target Architecture (After Phase 4)

```
Frontend (Supabase Auth + JWT + WebSocket)
    ↓
FastAPI (Auth Middleware → validates JWT)
    ↓
CrewAI Orchestrator (Process.hierarchical)
    ├─ Manager Agent (routes to specialists)
    ├─ Screening Agent + Long-Term Memory
    ├─ Planning Agent + Knowledge Base + User History
    ├─ Intervention Agent + Memory + Feedback Loop
    └─ Pattern Agent (generates hypothesis cards from real data)
    ↓
Supabase (RLS enforced per user, encrypted at rest)
```

---

## Dependency Order

```
Phase 4A (Auth) ───────── MUST DO FIRST ──────────┐
  ↓                                                │
Phase 4B (Privacy)     ←── start after 4A-4        │ parallel
Phase 4C (Learning)    ←── start after 4A-4        │ after 4A
Phase 4E (Validation)  ←── start after 4A          │
  ↓                                                │
Phase 4D (Orchestration) ←── depends on 4A + 4C ──┘
```

---

## Phase 4 Team Assignment

| Sub-Phase | Person A | Person B |
|-----------|----------|----------|
| **4A: Auth** | 4A-5, 4A-6 (frontend auth + demo preservation) | 4A-1, 4A-2, 4A-3, 4A-4 (backend auth + middleware) |
| **4B: Privacy** | 4B-3 (frontend settings page) | 4B-1, 4B-2, 4B-4 (backend endpoints + env docs) |
| **4C: Learning** | 4C-4 (feedback UI) | 4C-1, 4C-2, 4C-3 (memory + history + pattern agent) |
| **4D: Orchestration** | 4D-4 frontend (WebSocket client) | 4D-1, 4D-2, 4D-3, 4D-4 backend, 4D-5 |
| **4E: Validation** | 4E-1 frontend, 4E-2 | 4E-1 backend, 4E-3 |

---

## Phase 4 File Ownership Map

```
backend/
├── app/
│   ├── middleware/
│   │   └── auth.py              ← NEW (Person B) — JWT validation
│   ├── routes/
│   │   ├── auth.py              ← Person B (update for Supabase Auth)
│   │   ├── screening.py         ← Person B (add auth dependency)
│   │   ├── profile.py           ← Person B (add auth dependency)
│   │   ├── plan.py              ← Person B (add auth dependency)
│   │   ├── dashboard.py         ← Person B (add auth dependency + pattern agent)
│   │   ├── user.py              ← NEW (Person B) — delete + export
│   │   ├── feedback.py          ← NEW (Person B) — intervention feedback
│   │   ├── analytics.py         ← NEW (Person B) — session tracking
│   │   └── websocket.py         ← NEW (Person B) — WebSocket streaming
│   ├── agents/
│   │   ├── screening_agent.py   ← Person B (add memory + structured output)
│   │   ├── planning_agent.py    ← Person B (add memory + history + knowledge)
│   │   ├── intervention_agent.py← Person B (add memory + feedback context)
│   │   ├── pattern_agent.py     ← NEW (Person B) — hypothesis generation
│   │   ├── orchestrator.py      ← NEW (Person B) — hierarchical manager
│   │   └── tools/
│   │       └── db_tools.py      ← Person B (add save_hypothesis, save_feedback)
│   ├── database.py              ← Person B (split anon + admin clients)
│   └── services/
│       └── seed_service.py      ← Person B (update for Supabase Auth)
├── knowledge/                    ← NEW (Person B)
│   ├── executive_function_strategies.md
│   ├── intervention_playbook.md
│   └── brain_state_research.md
├── supabase/
│   └── schema.sql               ← Person B (RLS + trigger + new columns)
└── .env.example                  ← Person B (document keys)

frontend/src/
├── app/
│   ├── page.tsx                 ← Person A (add "Try Demo" vs "Create Account")
│   └── settings/
│       └── page.tsx             ← NEW (Person A) — privacy controls
├── components/
│   ├── auth/
│   │   └── GuestLoginButton.tsx ← Person A (Supabase Auth flow)
│   └── plan/
│       └── InterventionPanel.tsx← Person A (add feedback UI)
├── hooks/
│   ├── useUser.tsx              ← Person A (Supabase Auth rewrite)
│   └── useDailyPlan.ts         ← Person A (WebSocket integration)
└── lib/
    └── api.ts                   ← Person A (JWT header attachment)
```

---

## Phase 4A — Authentication (Supabase Auth)

> **MUST COMPLETE FIRST.** Every other sub-phase depends on real user identity.

### Task 4A-1: Supabase Auth Database Setup

**Person B** — Update `backend/supabase/schema.sql`

Add a migration section at the end of schema.sql:

```sql
-- ============================================================
-- PHASE 4A: Authentication Migration
-- ============================================================

-- 1. Bridge auth.users → public.users automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, is_guest)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Guest'),
    COALESCE((NEW.raw_user_meta_data->>'is_guest')::boolean, false)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, users.name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: fires on every new Supabase Auth signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Replace "Allow all" RLS policies with user-scoped policies
-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all access" ON users;
DROP POLICY IF EXISTS "Allow all access" ON asrs_responses;
DROP POLICY IF EXISTS "Allow all access" ON cognitive_profiles;
DROP POLICY IF EXISTS "Allow all access" ON daily_plans;
DROP POLICY IF EXISTS "Allow all access" ON checkins;
DROP POLICY IF EXISTS "Allow all access" ON interventions;
DROP POLICY IF EXISTS "Allow all access" ON hypothesis_cards;

-- Users: can only read/update own row
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- All other tables: scoped to user_id = auth.uid()
CREATE POLICY "Own data only" ON asrs_responses
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own data only" ON cognitive_profiles
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own data only" ON daily_plans
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own data only" ON checkins
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own data only" ON interventions
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own data only" ON hypothesis_cards
  FOR ALL USING (auth.uid() = user_id);

-- 3. Service role bypass: agent tools use service_role key which bypasses RLS
-- No policy needed — service_role key inherently bypasses RLS in Supabase
```

Run this migration in Supabase SQL Editor after backing up existing data.

### Task 4A-2: Backend Auth Middleware

**Person B** — Create NEW file `backend/app/middleware/auth.py`

```python
from fastapi import Depends, HTTPException, Header
from supabase import Client
from app.database import get_supabase_anon
from typing import Optional

async def get_current_user(
    authorization: Optional[str] = Header(None),
    supabase: Client = Depends(get_supabase_anon),
) -> str:
    """
    FastAPI dependency: extracts and validates Supabase JWT.
    Returns the authenticated user_id.
    All protected routes should use: user_id: str = Depends(get_current_user)
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    token = authorization.removeprefix("Bearer ")

    try:
        response = supabase.auth.get_user(token)
        if response.user is None:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        return str(response.user.id)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")
```

### Task 4A-3: Split Supabase Clients

**Person B** — Update `backend/app/database.py`

```python
from functools import lru_cache
from supabase import create_client, Client
from app.config import get_settings

@lru_cache()
def get_supabase_anon() -> Client:
    """Client using anon key — respects RLS policies. Use in route handlers."""
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_key)

@lru_cache()
def get_supabase_admin() -> Client:
    """Client using service_role key — bypasses RLS. Use ONLY in agent tools."""
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_role_key)

# Backward compatibility: existing code uses get_supabase()
def get_supabase() -> Client:
    """Deprecated: use get_supabase_anon() or get_supabase_admin() instead."""
    return get_supabase_anon()
```

Update all agent tools in `app/agents/tools/db_tools.py` to use `get_supabase_admin()` instead of `get_supabase()`.

### Task 4A-4: Update All Route Handlers

**Person B** — Add `Depends(get_current_user)` to all route functions.

Pattern for each route file (`screening.py`, `profile.py`, `plan.py`, `dashboard.py`):

```python
from fastapi import Depends
from app.middleware.auth import get_current_user

# BEFORE:
@router.post("/evaluate")
async def evaluate_screening(request: ScreeningRequest):
    user_id = request.userId  # ← Trusts client, insecure
    ...

# AFTER:
@router.post("/evaluate")
async def evaluate_screening(
    request: ScreeningRequest,
    user_id: str = Depends(get_current_user),  # ← Validated from JWT
):
    # user_id comes from JWT, not request body
    ...
```

Update `auth.py` to support:
- `POST /api/auth/guest` — calls `supabase.auth.sign_in_anonymously()`, seeds Alex data, returns session token
- `POST /api/auth/signup` — calls `supabase.auth.sign_up(email, password, metadata)`, returns session token
- `POST /api/auth/login` — calls `supabase.auth.sign_in_with_password(email, password)`, returns session token
- `POST /api/auth/logout` — calls `supabase.auth.sign_out(token)`

### Task 4A-5: Frontend Auth Integration

**Person A** — Rewrite `frontend/src/hooks/useUser.tsx`

Install Supabase client:
```bash
cd frontend && npm install @supabase/supabase-js
```

Create `frontend/src/lib/supabase.ts`:
```ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

Add to `frontend/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Rewrite `useUser.tsx` key methods:

```tsx
const loginAsGuest = useCallback(async () => {
  setIsLoading(true);
  try {
    // 1. Create anonymous Supabase Auth session
    const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
    if (authError) throw authError;

    // 2. Call backend to seed Alex data (sends JWT automatically via api.ts)
    const userData = await createGuestSession();

    // 3. Store user state
    setUser({
      id: userData.userId,
      name: userData.name,
      isGuest: userData.isGuest,
      hasProfile: userData.hasProfile,
      // ... other fields
    });
  } finally {
    setIsLoading(false);
  }
}, []);

const signUp = useCallback(async (email: string, password: string, name: string) => {
  setIsLoading(true);
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw error;
    setUser({ id: data.user!.id, name, isGuest: false, hasProfile: false, ... });
  } finally {
    setIsLoading(false);
  }
}, []);

const signIn = useCallback(async (email: string, password: string) => {
  setIsLoading(true);
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // Fetch user profile from backend...
  } finally {
    setIsLoading(false);
  }
}, []);
```

Update `frontend/src/lib/api.ts` to attach JWT:

```ts
import { supabase } from "./supabase";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

// Interceptor: attach Supabase JWT to every request
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});
```

### Task 4A-6: Preserve Demo Flow

**Person A** — Ensure backward compatibility.

- `POST /api/auth/guest` still creates Alex with seeded 14-day history
- Alex is now created via `supabase.auth.sign_in_anonymously()` on the frontend, then backend seeds data for that auth.uid
- If the anonymous user already has seeded data, skip re-seeding (idempotent check)
- Landing page: "Continue as Guest" button still works identically to Phases 1-3
- All demo steps (screening → plan → intervention → dashboard) work unchanged
- The only visible change: JWT is now included in all API calls

### Task 4A Gate

Both people verify:
- [ ] `POST /api/auth/guest` returns session token + Alex data
- [ ] `POST /api/auth/signup` creates new Supabase Auth user + public.users row
- [ ] All API calls include `Authorization: Bearer <token>` header
- [ ] API calls without valid JWT return 401
- [ ] User A cannot access User B's data (RLS enforced)
- [ ] Full demo flow still works end-to-end with guest login

---

## Phase 4B — Privacy & Data Protection

> **Can run in PARALLEL with 4C/4D after 4A is complete.**

### Task 4B-1: Data Deletion Endpoint

**Person B** — Create NEW file `backend/app/routes/user.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from app.middleware.auth import get_current_user
from app.database import get_supabase_admin

router = APIRouter(prefix="/api/user", tags=["user"])

@router.delete("/{user_id}")
async def delete_user_data(
    user_id: str,
    current_user: str = Depends(get_current_user),
):
    """Delete all user data (cascading). GDPR Article 17: Right to Erasure."""
    if current_user != user_id:
        raise HTTPException(status_code=403, detail="Can only delete own data")

    db = get_supabase_admin()

    # Delete in dependency order (children first)
    tables = [
        "interventions",
        "hypothesis_cards",
        "checkins",
        "daily_plans",
        "cognitive_profiles",
        "asrs_responses",
        "users",
    ]

    for table in tables:
        db.table(table).delete().eq("user_id" if table != "users" else "id", user_id).execute()

    # Also delete from Supabase Auth
    db.auth.admin.delete_user(user_id)

    return {"status": "deleted", "userId": user_id}
```

Register router in `main.py`:
```python
from app.routes.user import router as user_router
app.include_router(user_router)
```

### Task 4B-2: Data Export Endpoint

**Person B** — Add to `backend/app/routes/user.py`

```python
@router.get("/{user_id}/export")
async def export_user_data(
    user_id: str,
    current_user: str = Depends(get_current_user),
):
    """Export all user data as JSON. GDPR Article 20: Data Portability."""
    if current_user != user_id:
        raise HTTPException(status_code=403, detail="Can only export own data")

    db = get_supabase_admin()

    export = {
        "exportDate": datetime.utcnow().isoformat(),
        "userId": user_id,
        "user": db.table("users").select("*").eq("id", user_id).execute().data,
        "screeningAnswers": db.table("asrs_responses").select("*").eq("user_id", user_id).execute().data,
        "cognitiveProfiles": db.table("cognitive_profiles").select("*").eq("user_id", user_id).execute().data,
        "dailyPlans": db.table("daily_plans").select("*").eq("user_id", user_id).execute().data,
        "checkins": db.table("checkins").select("*").eq("user_id", user_id).execute().data,
        "interventions": db.table("interventions").select("*").eq("user_id", user_id).execute().data,
        "hypothesisCards": db.table("hypothesis_cards").select("*").eq("user_id", user_id).execute().data,
    }

    return export
```

### Task 4B-3: Frontend Privacy Controls

**Person A** — Create NEW file `frontend/src/app/settings/page.tsx`

```
"use client"

<PageContainer>
  <h1 className="font-serif text-3xl font-bold text-foreground">Settings</h1>

  <Card>
    <h2 className="font-semibold text-lg">Your Data</h2>
    <p className="text-muted-foreground text-sm">
      Attune stores your screening results, daily plans, and intervention history.
      All data is encrypted and only accessible to you.
    </p>

    <div className="flex gap-4 mt-4">
      <Button variant="secondary" onClick={handleExport}>
        Export My Data (JSON)
      </Button>
      <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
        Delete All My Data
      </Button>
    </div>
  </Card>

  {/* Delete confirmation dialog */}
  {showDeleteConfirm && (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center">
      <Card padding="lg" className="max-w-md">
        <h3 className="font-semibold text-lg text-error">Delete All Data?</h3>
        <p className="text-muted-foreground text-sm mt-2">
          This will permanently delete your screening results, plans, interventions,
          and account. This action cannot be undone.
        </p>
        <div className="flex gap-4 mt-6">
          <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Yes, Delete Everything</Button>
        </div>
      </Card>
    </div>
  )}
</PageContainer>
```

Add "Settings" link to Navbar.

### Task 4B-4: Update Environment Documentation

**Person B** — Update `backend/.env.example`

```bash
# === Anthropic (Claude API for CrewAI agents) ===
ANTHROPIC_API_KEY=sk-ant-your-key-here

# === Supabase ===
# Project URL (public)
SUPABASE_URL=https://your-project.supabase.co

# Anon key (safe for client-side, respects RLS)
SUPABASE_KEY=your-anon-key

# Service role key (NEVER expose to client — bypasses RLS, used ONLY by agent tools)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# === Frontend ===
FRONTEND_URL=http://localhost:3000
```

### Task 4B Gate

Both verify:
- [ ] `DELETE /api/user/{userId}` removes all 7 tables + Supabase Auth user
- [ ] `GET /api/user/{userId}/export` returns complete JSON bundle
- [ ] Cannot delete/export another user's data (403)
- [ ] Settings page renders with export + delete buttons
- [ ] Delete confirmation dialog prevents accidental deletion
- [ ] Demo flow still works after privacy features added

---

## Phase 4C — Learning Loops (CrewAI Memory + Pattern Agent)

> **The highest-value agent enhancement.** Can run in PARALLEL with 4B after 4A.

### Task 4C-1: Enable CrewAI Long-Term Memory

**Person B** — Update all 3 agent files.

Install dependency:
```bash
cd backend && pip install chromadb && pip freeze > requirements.txt
```

Pattern for each agent file (`screening_agent.py`, `planning_agent.py`, `intervention_agent.py`):

```python
from crewai.memory.long_term.long_term_memory import LongTermMemory

# In the crew creation function:
crew = Crew(
    agents=[agent],
    tasks=[task],
    process=Process.sequential,
    memory=True,  # Enables all memory types (short-term + long-term + entity)
    verbose=False,
)
```

**What this enables:**
- **Screening Agent:** Remembers past screening results → can note changes ("Your attention regulation has improved since last screening")
- **Planning Agent:** Remembers what worked → "Last Tuesday's plan with 20-min blocks had 85% completion — reusing that structure"
- **Intervention Agent:** Remembers stuck patterns → "This is the third time you've gotten stuck on deep work after 2pm"

### Task 4C-2: Inject User History into Planning Agent

**Person B** — Update `backend/app/agents/planning_agent.py`

The `get_user_history` tool already exists in `db_tools.py` but is **never used**. Add it to the planning agent's tools:

```python
from app.agents.tools.db_tools import get_cognitive_profile, save_daily_plan, get_user_history

planning_agent = Agent(
    role="Executive Function Planning Strategist",
    tools=[get_cognitive_profile, save_daily_plan, get_user_history],  # ← Added
    # ... rest unchanged
)
```

Update the task description to include history-aware instructions:

```python
planning_task = Task(
    description=f"""
    Create a brain-state-adaptive daily plan for user {user_id} with brain state: {brain_state}.

    STEP 1: Fetch the user's cognitive profile using the get_cognitive_profile tool.
    STEP 2: Fetch the user's recent history using the get_user_history tool.
    STEP 3: Analyze patterns in the history:
      - Which task categories had highest completion rates?
      - What time slots worked best for deep work?
      - Were there recent interventions? What was the stuck pattern?
      - What brain states correlated with best outcomes?
    STEP 4: Generate the plan, using history to justify task placement:
      - "Based on your history, you complete creative tasks best in the morning"
      - "Your last 3 focused-state plans averaged 80% completion with 45-min blocks"
      - "You got stuck on admin tasks twice last week — scheduling earlier today"

    ... (existing brain state strategies remain unchanged) ...
    """,
    # ... rest unchanged
)
```

### Task 4C-3: Create Pattern Detection Agent

**Person B** — Create NEW file `backend/app/agents/pattern_agent.py`

```python
from crewai import Agent, Task, Crew, Process, LLM
from app.agents.tools.db_tools import get_user_history, save_hypothesis_card

_llm = LLM(model="anthropic/claude-sonnet-4-20250514")

pattern_agent = Agent(
    role="Behavioral Pattern Analyst",
    goal=(
        "Analyze longitudinal user data (checkins, plan completions, interventions) "
        "to detect meaningful behavioral patterns and generate testable hypotheses. "
        "Focus on patterns that are actionable — things that can improve the user's "
        "daily planning and intervention strategy."
    ),
    backstory=(
        "You are a behavioral data scientist specializing in ADHD executive function "
        "patterns. You look for correlations between brain states, task completion, "
        "mood, intervention triggers, and time-of-day effects. Your hypotheses must "
        "be specific, testable, and backed by evidence from the user's actual data."
    ),
    tools=[get_user_history, save_hypothesis_card],
    llm=_llm,
    allow_delegation=False,
    max_iter=10,
    verbose=False,
)

def run_pattern_detection(user_id: str) -> dict:
    """Analyze user history and generate hypothesis cards."""
    task = Task(
        description=f"""
        Analyze the behavioral data for user {user_id}.

        STEP 1: Fetch user history using the get_user_history tool.
        STEP 2: Look for these pattern types:
          - Energy patterns: Do low-energy days follow high-output days?
          - Time-of-day effects: When is the user most productive?
          - Task type preferences: Which categories have highest completion?
          - Intervention triggers: What conditions precede getting stuck?
          - Mood correlations: What predicts good vs bad mood days?
          - Brain state accuracy: Does self-reported brain state match outcomes?
        STEP 3: Generate 1-3 hypothesis cards. Each card must have:
          - patternDetected: Specific pattern description
          - prediction: Testable prediction for future behavior
          - confidence: "low" | "medium" | "high" (based on evidence strength)
          - supportingEvidence: Array of {{day: number, detail: string}}
          - status: "testing" (new) | "confirmed" | "rejected"
        STEP 4: Save each hypothesis card using the save_hypothesis_card tool.
        STEP 5: Return JSON array of all generated cards.

        IMPORTANT: Only generate hypotheses backed by real data patterns.
        Do NOT make up patterns. If insufficient data (<7 days), return empty array.
        """,
        expected_output="JSON array of hypothesis cards",
        agent=pattern_agent,
    )

    crew = Crew(
        agents=[pattern_agent],
        tasks=[task],
        process=Process.sequential,
        memory=True,
        verbose=False,
    )

    result = crew.kickoff()
    return _parse_result(result)
```

Add `save_hypothesis_card` tool to `db_tools.py`:

```python
@tool
def save_hypothesis_card(user_id: str, card_json: str) -> str:
    """Save a hypothesis card to the database."""
    db = get_supabase_admin()
    card = json.loads(card_json)

    result = db.table("hypothesis_cards").insert({
        "user_id": user_id,
        "pattern_detected": card["patternDetected"],
        "prediction": card["prediction"],
        "confidence": card["confidence"],
        "supporting_evidence": card.get("supportingEvidence", []),
        "status": card.get("status", "testing"),
    }).execute()

    return json.dumps({"cardId": result.data[0]["id"]})
```

Update `dashboard.py` to trigger pattern detection when fetching dashboard (or on a schedule):

```python
@router.get("/{user_id}")
async def get_dashboard(
    user_id: str,
    current_user: str = Depends(get_current_user),
):
    # ... existing trend data fetching ...

    # Check if hypothesis cards need refreshing (older than 24h or none exist)
    cards = db.table("hypothesis_cards").select("*").eq("user_id", user_id).execute().data

    if should_refresh_hypotheses(cards):
        # Run pattern detection in background (don't block dashboard response)
        import asyncio
        asyncio.create_task(asyncio.to_thread(run_pattern_detection, user_id))

    # Return existing cards (new ones appear on next dashboard load)
    # ... rest unchanged ...
```

### Task 4C-4: Feedback Loop After Interventions

**Person A (frontend) + Person B (backend)**

**Backend** — Add columns to interventions table:

```sql
-- Phase 4C migration: Add feedback columns
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS user_rating integer CHECK (user_rating BETWEEN 1 AND 5);
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS user_feedback text;
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS feedback_at timestamptz;
```

Create `backend/app/routes/feedback.py`:

```python
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.middleware.auth import get_current_user
from app.database import get_supabase_admin

router = APIRouter(prefix="/api/feedback", tags=["feedback"])

class FeedbackRequest(BaseModel):
    interventionId: str
    rating: int  # 1-5
    feedback: str | None = None

@router.post("/intervention")
async def submit_intervention_feedback(
    request: FeedbackRequest,
    user_id: str = Depends(get_current_user),
):
    db = get_supabase_admin()
    db.table("interventions").update({
        "user_rating": request.rating,
        "user_feedback": request.feedback,
        "feedback_at": "now()",
    }).eq("id", request.interventionId).eq("user_id", user_id).execute()

    return {"status": "saved"}
```

**Frontend** — Update `InterventionPanel.tsx`:

After the "Got it, let's go" button, add a feedback section:

```tsx
{showFeedback && (
  <div className="mt-4 border-t border-border pt-4">
    <p className="text-sm text-muted-foreground">Was this intervention helpful?</p>
    <div className="flex gap-2 mt-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => setRating(star)}
          className={`text-2xl ${rating >= star ? "text-warning" : "text-faint-foreground"}`}
        >
          ★
        </button>
      ))}
    </div>
    <textarea
      placeholder="What would you change? (optional)"
      value={feedbackText}
      onChange={(e) => setFeedbackText(e.target.value)}
      className="mt-2 w-full rounded-lg border border-border bg-background p-3 text-sm"
    />
    <Button variant="secondary" size="sm" onClick={submitFeedback} className="mt-2">
      Send Feedback
    </Button>
  </div>
)}
```

Update the intervention agent to reference past feedback:

```python
# In intervention_agent.py task description, add:
"""
STEP 0 (before acknowledgment): Check user's past intervention feedback.
If they rated previous interventions low and gave feedback like "too many tasks",
adjust your restructuring strategy accordingly.
"""
```

### Task 4C Gate

Both verify:
- [ ] Planning agent rationale references user history ("based on your past 3 plans...")
- [ ] Pattern agent generates real hypothesis cards from 14-day data (not pre-seeded)
- [ ] Hypothesis cards appear on dashboard after pattern detection runs
- [ ] Intervention feedback (stars + text) saves to database
- [ ] Intervention agent adapts based on past feedback
- [ ] Memory persists between sessions (plan a task, close browser, reopen — agent references prior plan)

---

## Phase 4D — Agent Orchestration Enhancement

> **Advanced CrewAI features.** Depends on 4A + 4C completion.

### Task 4D-1: Create Orchestrator Manager Agent

**Person B** — Create NEW file `backend/app/agents/orchestrator.py`

```python
from crewai import Agent, Task, Crew, Process, LLM
from app.agents.screening_agent import screening_agent, create_screening_task
from app.agents.planning_agent import planning_agent, create_planning_task
from app.agents.intervention_agent import intervention_agent, create_intervention_task
from app.agents.tools.db_tools import get_cognitive_profile, get_user_history

_llm = LLM(model="anthropic/claude-sonnet-4-20250514")

manager_agent = Agent(
    role="Attune Executive Function Manager",
    goal=(
        "Coordinate screening, planning, and intervention agents to provide "
        "comprehensive executive function support. Analyze user state — profile "
        "completeness, recent history, current brain state, intervention patterns — "
        "and delegate to the right specialist with the right context."
    ),
    backstory=(
        "You are an expert coordinator who understands ADHD executive function challenges "
        "holistically. You don't do the specialized work yourself — you ensure each "
        "specialist agent receives optimal context and instructions. You understand when "
        "a user needs re-screening (profile is stale), when a plan needs intervention "
        "history context, and when to proactively suggest changes."
    ),
    tools=[get_cognitive_profile, get_user_history],
    llm=_llm,
    allow_delegation=True,
    max_iter=10,
    verbose=False,
)

def run_orchestrated_planning(user_id: str, brain_state: str, tasks: list = None) -> dict:
    """
    Enhanced planning flow: manager analyzes context → delegates to planning agent.
    Falls back to direct planning if orchestration fails.
    """
    manager_task = Task(
        description=f"""
        Coordinate plan generation for user {user_id} with brain state: {brain_state}.

        1. Fetch user's cognitive profile and recent history.
        2. Analyze: How many days of data? Recent interventions? Completion trends?
        3. Provide context summary to the Planning Strategist agent.
        4. Delegate plan generation with enhanced context.
        5. Review the generated plan for quality:
           - Does every task have a profile-referenced rationale?
           - Are durations appropriate for the brain state?
           - Does it account for recent intervention patterns?
        6. Return the final plan.
        """,
        expected_output="Complete daily plan with tasks and rationale",
        agent=manager_agent,
    )

    planning_task = create_planning_task(user_id, brain_state, tasks)

    crew = Crew(
        agents=[manager_agent, planning_agent],
        tasks=[manager_task, planning_task],
        process=Process.hierarchical,
        manager_agent=manager_agent,
        memory=True,
        verbose=False,
    )

    result = crew.kickoff()
    return _parse_result(result)
```

Update `routes/plan.py` to use orchestrated flow:

```python
@router.post("/generate")
async def generate_plan(
    request: PlanRequest,
    user_id: str = Depends(get_current_user),
):
    try:
        # Try orchestrated flow first
        result = await asyncio.to_thread(
            run_orchestrated_planning, user_id, request.brainState, request.tasks
        )
    except Exception:
        # Fall back to direct planning agent
        result = await asyncio.to_thread(
            run_planning, user_id, request.brainState, request.tasks
        )

    return PlanResponse(**result)
```

### Task 4D-2: Add ADHD Knowledge Base

**Person B** — Create `backend/knowledge/` directory with 3 files.

`backend/knowledge/executive_function_strategies.md`:
```markdown
# Executive Function Strategies for ADHD

## Task Initiation
- "2-Minute Start" rule: commit to only 2 minutes, momentum often carries further
- Environmental manipulation: set up workspace BEFORE the task block
- Body doubling: presence of another person reduces initiation friction by ~40%
- Momentum starters: 5-min easy task immediately before the hard one

## Time Management
- Time blocking with buffer: 15-min gaps between focused blocks
- External timers visible in workspace (not phone-based)
- "Foggy day" schedule: max 4 tasks, 20-min blocks, start with easiest
- "Focused day" schedule: deep work in peak attention window (usually morning)
- "Wired day" schedule: channel energy into physical + creative tasks, 15-min blocks

## Emotional Regulation
- Acknowledge before action: name the feeling, normalize as brain-based
- Task-emotion mismatch: if emotional intensity is high, switch to kinesthetic tasks
- Shame interruption: "This is task initiation friction, not a character flaw"

## Working Memory Support
- Externalize everything: written plan = external working memory
- Single-task focus: close all unrelated tabs/apps during focused blocks
- Checkpoint system: mini-review every 30 minutes
```

`backend/knowledge/intervention_playbook.md`:
```markdown
# Intervention Playbook — When Users Get Stuck

## Clinical Sequence (MUST follow this order)
1. ACKNOWLEDGE: Name the specific feeling/experience (1-2 sentences)
2. NORMALIZE: Frame as brain-based, not character-based
3. RESTRUCTURE: Modify the plan to reduce friction

## Restructure Strategies by Stuck Type

### "I can't start" (Task Initiation)
- Break into 3 micro-steps: (1) set up, (2) do 5 min, (3) continue or stop
- Add momentum starter (5-min easy task) before the hard one
- Reduce first task to 10 minutes max

### "I can't focus" (Attention Regulation)
- Switch to a different category task (variety resets attention)
- Add a 5-min physical movement break
- Shorten remaining blocks to 15 minutes

### "I'm overwhelmed" (Working Memory Overload)
- Reduce total remaining tasks by 30-50%
- Remove lowest-priority tasks entirely
- Add explicit "wrap-up" task at the end

### "Too many things in my head" (Wired/Hyperstimulated)
- Add 2 physical movement breaks
- Front-load the most stimulating tasks
- End with a calming creative or review task

## Acknowledgment Examples (DO use)
- "That friction you're feeling when you try to start? That's your brain's initiation system — it's not laziness."
- "Racing between tasks without finishing any is what a wired brain does. Let's channel that energy."
- "Forgetting what you were working on after a brief interruption — that's working memory, not carelessness."

## Acknowledgment Anti-Patterns (DO NOT use)
- "I understand how you feel" (generic, dismissive)
- "Just try harder" (invalidating)
- "You should..." (prescriptive before acknowledgment)
- "Everyone gets stuck sometimes" (minimizing)
```

`backend/knowledge/brain_state_research.md`:
```markdown
# Brain State Research — Cognitive Performance by State

## Foggy State 
- Characterized by: slow processing, difficulty initiating, low motivation
- Optimal task types: routine, admin, review (low cognitive load)
- Duration limit: 20 minutes per block before break
- Recovery strategy: physical movement, bright light, hydration
- Planning rule: start with easiest task, build momentum gradually

## Focused State
- Characterized by: clear thinking, sustained attention, good working memory
- Optimal task types: deep work, complex problem-solving, learning
- Duration capacity: 45-60 minute blocks
- Protection strategy: minimize interruptions, batch communications
- Planning rule: schedule hardest/most important task in this window

## Wired State 
- Characterized by: restlessness, rapid task-switching, difficulty sitting still
- Optimal task types: physical tasks, short creative bursts, social interactions
- Duration limit: 15 minutes per block (attention shifts rapidly)
- Channeling strategy: use the energy productively, don't fight it
- Planning rule: more tasks with shorter durations, include 2+ movement breaks

## State Transitions
- Foggy → Focused: 30-60 min after wake + caffeine + movement
- Focused → Wired: often triggered by stimulating content or deadline pressure
- Wired → Foggy: energy crash after 2-3 hours of high output
- Pattern: post-lunch dip is universal — schedule easy tasks 1-2pm
```

Integrate knowledge into agents:

```python
from crewai.knowledge import Knowledge
from crewai.knowledge.source.text_file_knowledge_source import TextFileKnowledgeSource

adhd_knowledge = Knowledge(
    collection_name="attune_adhd",
    sources=[
        TextFileKnowledgeSource(file_path="./knowledge/executive_function_strategies.md"),
        TextFileKnowledgeSource(file_path="./knowledge/intervention_playbook.md"),
        TextFileKnowledgeSource(file_path="./knowledge/brain_state_research.md"),
    ],
)

# In planning_agent.py:
planning_agent = Agent(
    role="Executive Function Planning Strategist",
    knowledge=adhd_knowledge,  # ← Agent can now cite research
    # ... rest unchanged
)

# In intervention_agent.py:
intervention_agent = Agent(
    role="ADHD Crisis Response Specialist",
    knowledge=adhd_knowledge,  # ← Agent follows intervention playbook
    # ... rest unchanged
)
```

### Task 4D-3: Structured Output (Replace JSON Parsing)

**Person B** — Replace fragile `raw.find("{")` parsing with Pydantic models.

Define output models in `backend/app/models.py`:

```python
# Add these Pydantic models for CrewAI structured output:
class ScreeningOutput(BaseModel):
    dimensions: list[RadarDimension]
    profileTags: list[str]
    summary: str
    asrsTotalScore: int
    isPositiveScreen: bool
    profileId: str

class PlanOutput(BaseModel):
    planId: str
    tasks: list[Task]
    overallRationale: str

class InterventionOutput(BaseModel):
    interventionId: str
    acknowledgment: str
    restructuredTasks: list[Task]
    agentReasoning: str
    followupHint: str | None = None
```

Update each agent's Task to use `output_pydantic`:

```python
# In planning_agent.py:
planning_task = Task(
    description="...",
    expected_output="JSON plan with tasks and rationale",
    output_pydantic=PlanOutput,  # ← CrewAI validates output against this model
    agent=planning_agent,
)
```

Remove manual JSON parsing from route handlers:

```python
# BEFORE (fragile):
raw = str(result.raw)
start = raw.find("{")
end = raw.rfind("}") + 1
parsed = json.loads(raw[start:end])

# AFTER (structured):
result = crew.kickoff()
return result.pydantic  # ← Already validated Pydantic model
```

### Task 4D-4: Event Streaming via WebSocket

**Person B (backend) + Person A (frontend)**

**Backend** — Create NEW file `backend/app/routes/websocket.py`:

```python
from fastapi import WebSocket, WebSocketDisconnect
from crewai.utilities.events import crewai_event_bus
from crewai.utilities.events.base_events import (
    AgentExecutionStartedEvent,
    AgentExecutionCompletedEvent,
    TaskStartedEvent,
    TaskCompletedEvent,
)
import asyncio
import json

# Progress message mapping
PROGRESS_MESSAGES = {
    "Executive Function Planning Strategist": {
        "start": "Analyzing your cognitive profile...",
        "tools": "Checking your history and patterns...",
        "thinking": "Crafting your personalized plan...",
        "complete": "Plan ready!",
    },
    "ADHD Crisis Response Specialist": {
        "start": "Attune is listening...",
        "tools": "Understanding your situation...",
        "thinking": "Restructuring your plan...",
        "complete": "New plan ready!",
    },
}

@app.websocket("/ws/agent-progress/{user_id}")
async def agent_progress(websocket: WebSocket, user_id: str):
    await websocket.accept()

    queue = asyncio.Queue()

    def on_event(event):
        if isinstance(event, AgentExecutionStartedEvent):
            role = event.agent.role if hasattr(event, 'agent') else "Agent"
            messages = PROGRESS_MESSAGES.get(role, {})
            asyncio.create_task(queue.put({
                "type": "agent_started",
                "message": messages.get("start", f"{role} is working..."),
            }))
        elif isinstance(event, TaskCompletedEvent):
            asyncio.create_task(queue.put({
                "type": "task_completed",
                "message": "Processing complete",
            }))

    # Subscribe to CrewAI events
    crewai_event_bus.on("*", on_event)

    try:
        while True:
            message = await asyncio.wait_for(queue.get(), timeout=60)
            await websocket.send_json(message)
    except (WebSocketDisconnect, asyncio.TimeoutError):
        pass
    finally:
        crewai_event_bus.off("*", on_event)
```

**Frontend** — Update `frontend/src/hooks/useDailyPlan.ts`:

```ts
const [progressMessage, setProgressMessage] = useState<string | null>(null);

const generateDailyPlan = useCallback(async () => {
  setIsGenerating(true);
  setProgressMessage("Connecting to AI agents...");

  // Open WebSocket for progress updates
  const ws = new WebSocket(
    `${process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000"}/ws/agent-progress/${user.id}`
  );

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    setProgressMessage(data.message);
  };

  try {
    const result = await generatePlan(user.id, brainState!, userTasks);
    setPlan(result);
  } finally {
    ws.close();
    setIsGenerating(false);
    setProgressMessage(null);
  }
}, [user, brainState]);
```

In the plan page, replace static spinner with progress:

```tsx
{isGenerating && (
  <LoadingSpinner size={32} label={progressMessage || "AI agents are crafting your plan..."} />
)}
```

### Task 4D-5: Production Agent Configuration

**Person B** — Update all agent files.

```python
# Add to all Agent() constructors:
agent = Agent(
    role="...",
    max_rpm=20,        # Max 20 requests/minute to Claude API
    max_iter=10,       # Max 10 reasoning iterations per task
    verbose=False,     # No debug output in production
    # ... rest unchanged
)
```

Add retry logic to route handlers:

```python
import time

MAX_RETRIES = 3

async def run_with_retry(fn, *args):
    """Run agent function with exponential backoff retry."""
    for attempt in range(MAX_RETRIES):
        try:
            return await asyncio.to_thread(fn, *args)
        except Exception as e:
            if attempt == MAX_RETRIES - 1:
                raise
            wait = 2 ** attempt  # 1s, 2s, 4s
            await asyncio.sleep(wait)

# Usage in routes:
@router.post("/generate")
async def generate_plan(request: PlanRequest, user_id: str = Depends(get_current_user)):
    result = await run_with_retry(run_orchestrated_planning, user_id, request.brainState)
    return PlanResponse(**result)
```

### Task 4D Gate

Both verify:
- [ ] Orchestrated planning (hierarchical) produces plans with history-aware rationale
- [ ] Knowledge base cited in planning rationale ("Research shows...")
- [ ] Structured output produces valid Pydantic models (no JSON parsing errors)
- [ ] WebSocket sends progress messages during plan generation
- [ ] Frontend shows real-time progress instead of static spinner
- [ ] Retry logic handles transient failures (test by briefly stopping Claude API)
- [ ] Direct agent routes still work as fallback

---

## Phase 4E — Real User Validation

> **Requires 4A (auth).** Can run in parallel with 4C/4D.

### Task 4E-1: Multi-User Support

**Person A (frontend) + Person B (backend)**

**Backend** — Update `auth.py`:

```python
@router.post("/signup")
async def signup(request: SignupRequest):
    """Create a new user account via Supabase Auth."""
    db = get_supabase_anon()
    result = db.auth.sign_up({
        "email": request.email,
        "password": request.password,
        "options": {"data": {"name": request.name}},
    })

    if result.user is None:
        raise HTTPException(status_code=400, detail="Signup failed")

    return {
        "userId": str(result.user.id),
        "name": request.name,
        "isGuest": False,
        "hasProfile": False,
        "accessToken": result.session.access_token,
    }

@router.post("/login")
async def login(request: LoginRequest):
    """Sign in with email + password."""
    db = get_supabase_anon()
    result = db.auth.sign_in_with_password({
        "email": request.email,
        "password": request.password,
    })

    if result.user is None:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Check if user has a profile
    profile = get_supabase_admin().table("cognitive_profiles") \
        .select("id").eq("user_id", str(result.user.id)).limit(1).execute()

    return {
        "userId": str(result.user.id),
        "name": result.user.user_metadata.get("name", "User"),
        "isGuest": False,
        "hasProfile": len(profile.data) > 0,
        "accessToken": result.session.access_token,
    }
```

**Frontend** — Update landing page `page.tsx`:

```tsx
{/* Replace single CTA with two options */}
<div className="flex justify-center gap-4 mt-12">
  <Button variant="primary" size="lg" onClick={() => router.push("/signup")}>
    Create Account
  </Button>
  <GuestLoginButton />  {/* Stays as "Try Demo" */}
</div>
```

New users follow: signup → (auto-redirect to) screening → plan → dashboard.
Guest users follow: guest login → plan (Alex has profile) or screening.

### Task 4E-2: Post-Intervention Feedback Collection

**Person A** — Already covered in Task 4C-4. This task adds the dashboard visualization:

In `frontend/src/app/dashboard/page.tsx`, add a "Your Feedback" section:

```tsx
{/* Below hypothesis cards */}
<Card>
  <h3 className="font-semibold text-foreground">Your Intervention Feedback</h3>
  <div className="mt-3 space-y-2">
    {feedbackHistory.map((f) => (
      <div key={f.id} className="flex items-center gap-2 text-sm">
        <span className="text-warning">{"★".repeat(f.rating)}</span>
        <span className="text-muted-foreground">{f.feedback || "No comment"}</span>
        <span className="text-faint-foreground text-xs">{f.date}</span>
      </div>
    ))}
  </div>
</Card>
```

### Task 4E-3: Session Analytics

**Person B** — Create NEW file `backend/app/routes/analytics.py`

```sql
-- Schema migration: analytics table
CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  event_type text NOT NULL,  -- 'screening_started', 'plan_generated', 'intervention_triggered', etc.
  event_data jsonb DEFAULT '{}',
  duration_ms integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_analytics_user ON analytics_events(user_id);
CREATE INDEX idx_analytics_type ON analytics_events(event_type);

-- RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own events only" ON analytics_events FOR ALL USING (auth.uid() = user_id);
```

```python
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.middleware.auth import get_current_user
from app.database import get_supabase_admin

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

class AnalyticsEvent(BaseModel):
    eventType: str
    eventData: dict = {}
    durationMs: int | None = None

@router.post("/event")
async def track_event(
    event: AnalyticsEvent,
    user_id: str = Depends(get_current_user),
):
    db = get_supabase_admin()
    db.table("analytics_events").insert({
        "user_id": user_id,
        "event_type": event.eventType,
        "event_data": event.eventData,
        "duration_ms": event.durationMs,
    }).execute()
    return {"status": "tracked"}

@router.get("/summary/{user_id}")
async def get_analytics_summary(
    user_id: str,
    current_user: str = Depends(get_current_user),
):
    """Return aggregated analytics for a user."""
    if current_user != user_id:
        raise HTTPException(status_code=403)

    db = get_supabase_admin()
    events = db.table("analytics_events").select("*").eq("user_id", user_id).execute().data

    return {
        "totalScreenings": len([e for e in events if e["event_type"] == "screening_completed"]),
        "totalPlans": len([e for e in events if e["event_type"] == "plan_generated"]),
        "totalInterventions": len([e for e in events if e["event_type"] == "intervention_triggered"]),
        "avgPlanGenerationMs": _avg([e["duration_ms"] for e in events if e["event_type"] == "plan_generated" and e["duration_ms"]]),
        "events": events[-50],  # Last 50 events
    }
```

### Task 4E Gate

Both verify:
- [ ] New user can sign up with email/password → redirected to screening
- [ ] Existing user can sign in → sees their data (not Alex's)
- [ ] Guest login still works as "Try Demo"
- [ ] Intervention feedback shows on dashboard
- [ ] Analytics events tracked: screening, plan generation, interventions
- [ ] Two different users have completely separate data

---

## Phase 4 Full Integration Test

Walk through this 5-minute test after all sub-phases:

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open localhost:3000 | Landing page with "Create Account" + "Try Demo" |
| 2 | Click "Create Account" | Signup form → creates Supabase Auth user |
| 3 | Redirected to /screening | No profile yet → must screen first |
| 4 | Complete 6-question screening | Agent runs with memory + knowledge |
| 5 | Radar chart + profile | Profile saved, agent remembers for future |
| 6 | Navigate to /plan | Brain state selector visible |
| 7 | Select "Focused" → Generate | WebSocket progress: "Analyzing profile..." → "Checking history..." → "Crafting plan..." |
| 8 | Plan appears | Rationale cites cognitive profile + (empty) history |
| 9 | Click "I'm Stuck" | Intervention agent runs with knowledge base |
| 10 | Typewriter acknowledgment | Follows intervention playbook patterns |
| 11 | Rate intervention (4 stars) | Feedback saved to DB |
| 12 | Navigate to /dashboard | Momentum score, trend (1 day), no hypothesis cards yet (too few days) |
| 13 | Open /settings | "Export" and "Delete" buttons visible |
| 14 | Click "Export My Data" | JSON download with all user data |
| 15 | Open new incognito window | Cannot access first user's data (RLS enforced) |
| 16 | Click "Try Demo" (original window) | Alex loads with 14-day seeded data |
| 17 | Dashboard shows Alex's data | 2 hypothesis cards, momentum ~71, 14-day trend |

---

## New Dependencies (Phase 4)

**Backend** (`requirements.txt` additions):
```
chromadb>=0.4.0          # CrewAI long-term memory vector store
```

**Frontend** (`package.json` additions):
```
@supabase/supabase-js    # Supabase Auth client
```

---

## Updated API Contracts (Phase 4)

```
POST /api/auth/guest
  Request:  {} (empty)
  Response: { userId, name, isGuest, hasProfile, accessToken }
  Header:   None (public endpoint)

POST /api/auth/signup
  Request:  { email, password, name }
  Response: { userId, name, isGuest: false, hasProfile: false, accessToken }

POST /api/auth/login
  Request:  { email, password }
  Response: { userId, name, isGuest, hasProfile, accessToken }

POST /api/auth/logout
  Header:   Authorization: Bearer <token>
  Response: { status: "logged_out" }

DELETE /api/user/{userId}
  Header:   Authorization: Bearer <token>
  Response: { status: "deleted", userId }

GET /api/user/{userId}/export
  Header:   Authorization: Bearer <token>
  Response: { exportDate, userId, user, screeningAnswers, cognitiveProfiles, ... }

POST /api/feedback/intervention
  Header:   Authorization: Bearer <token>
  Request:  { interventionId, rating (1-5), feedback? }
  Response: { status: "saved" }

POST /api/analytics/event
  Header:   Authorization: Bearer <token>
  Request:  { eventType, eventData?, durationMs? }
  Response: { status: "tracked" }

WS /ws/agent-progress/{userId}
  Messages: { type: "agent_started"|"task_completed", message: string }

All existing endpoints (screening/evaluate, profile/{id}, plan/generate, plan/intervene, dashboard/{id})
  NOW REQUIRE: Authorization: Bearer <token> header
  userId is extracted from JWT, not from request body
```
