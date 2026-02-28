# Attune

> AI-powered ADHD support platform — personalized daily planning, adaptive interventions, and behavioral pattern analysis.

[![Python](https://img.shields.io/badge/Python-3.11+-blue?logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-green?logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase)](https://supabase.com)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Status](#project-status)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Supabase Setup](#2-supabase-setup)
  - [3. Backend Setup](#3-backend-setup)
  - [4. Frontend Setup](#4-frontend-setup)
  - [5. Run the Application](#5-run-the-application)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [AI Agent System](#ai-agent-system)
- [Features](#features)
- [Development Guide](#development-guide)
- [Testing](#testing)
- [Contributing](#contributing)
- [Team](#team)

---

## Overview

**Attune** is a fullstack mental health support application designed specifically for individuals with ADHD. It combines a conversational onboarding flow (ASRS-based screening), an AI-driven daily planner that adapts to your current brain state, real-time intervention support when you're stuck, and a longitudinal dashboard that surfaces behavioral patterns over time.

The core AI engine is powered by [CrewAI](https://crewai.com) and Anthropic's Claude, running a hierarchical multi-agent orchestration system: a **Screening Agent**, **Planning Agent**, **Intervention Agent**, and **Pattern Agent** — each specialized for a distinct phase of the user journey.

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

**Data flow:** The frontend communicates with the FastAPI backend via authenticated HTTP (axios + JWT). Real-time plan generation streams over WebSocket. The backend persists all user data in Supabase (PostgreSQL) with Row-Level Security enforced at the database layer.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| **Backend** | Python 3.11+, FastAPI, Uvicorn |
| **AI Agents** | CrewAI (Hierarchical Process), Anthropic Claude |
| **Database** | Supabase (PostgreSQL + Auth + RLS) |
| **Auth** | Supabase Auth (JWT) |
| **Real-time** | WebSocket (FastAPI native) |
| **HTTP Client** | axios |

---

## Project Status

| Phase | Description | Status |
|-------|-------------|--------|
| **Phase 1** | Frontend foundation + Supabase + backend endpoints | ✅ Done |
| **Phase 2** | Screening, Dashboard, Planner, Intervention features | ✅ Done |
| **Phase 3** | Full integration testing | ✅ Done |
| **Phase 4** | Auth hardening, privacy controls, learning loops, agent orchestration | 🔨 In Progress |
| **Phase 5** | Bug fixes, input validation, WebSocket auth, time window presets | ✅ Done |

---

## Prerequisites

Ensure the following are installed before proceeding:

- **Python** 3.11 or higher
- **Node.js** 18 or higher + **npm**
- A **Supabase** account (free tier works)
- An **Anthropic** API key (Claude access required)

---

## Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/attune.git
cd attune
```

### 2. Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. From the project dashboard, note down:
   - **Project URL** (e.g. `https://xxxx.supabase.co`)
   - **anon public key**
   - **service_role secret key**
3. Open the **SQL Editor** in your Supabase dashboard.
4. Copy the contents of `backend/supabase/schema.sql` and run it.

This creates 7 tables: `users`, `asrs_responses`, `cognitive_profiles`, `daily_plans`, `checkins`, `interventions`, `hypothesis_cards`.

### 3. Backend Setup
```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # macOS/Linux
# venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# → Edit .env with your keys (see Environment Variables section)
```

### 4. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
# → Edit .env.local with your Supabase URL and anon key
```

### 5. Run the Application

Open two terminals:
```bash
# Terminal 1 — Backend
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```
```bash
# Terminal 2 — Frontend
cd frontend
npm run dev
```

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend API: [http://localhost:8000](http://localhost:8000)
- API Docs (Swagger): [http://localhost:8000/docs](http://localhost:8000/docs)

Verify the backend is running:
```bash
curl http://localhost:8000/
# → {"status":"ok"}
```

---

## Environment Variables

### Backend — `backend/.env`
```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
FRONTEND_URL=http://localhost:3000
```

> ⚠️ The application will **fail to start** if any required keys are missing. There are no silent empty-string fallbacks.

### Frontend — `frontend/.env.local`
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

> All client-side environment variables **must** be prefixed with `NEXT_PUBLIC_`.

---

## API Reference

All endpoints (except guest login) require a valid JWT in the `Authorization: Bearer <token>` header.

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/guest` | Create guest user "Alex" with 14-day seeded data |

**Example:**
```bash
curl -X POST http://localhost:8000/api/auth/guest \
  -H "Content-Type: application/json"
# → { "userId": "...", "name": "Alex", "isGuest": true, "hasProfile": true }
```

### Profile

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/profile/{user_id}` | Fetch cognitive profile (ASRS-derived dimensions) |

**Example:**
```bash
curl http://localhost:8000/api/profile/{user_id} \
  -H "Authorization: Bearer <token>"
# → { "dimensions": [...6 items], "profileTags": ["Deep-Diver", ...], "summary": "..." }
```

### Screening

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/screening/chat` | Send a message to the Screening Agent (ASRS flow) |

### Daily Plan

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/plan/generate` | Generate a personalized daily plan |
| `GET`  | `/api/plan/{user_id}` | Fetch the current active plan |

**`POST /api/plan/generate` request body:**
```json
{
  "userId": "string",
  "brainState": "foggy | focused | wired",
  "tasks": ["string"],
  "timeWindowMinutes": 120
}
```

`timeWindowMinutes` is optional (15–480). Omitting it disables the time constraint (backward compatible).

**Response:**
```json
{
  "planId": "uuid",
  "tasks": [{ "title": "string", "durationMinutes": 25, "order": 1 }],
  "overallRationale": "string"
}
```

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dashboard/{user_id}` | Fetch trend data, momentum score, and hypothesis cards |

**Example response:**
```json
{
  "trendData": [...14 items],
  "momentumScore": 71,
  "momentumDelta": 23,
  "hypothesisCards": [...2 items],
  "agentAnnotations": [...]
}
```

### Interventions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/interventions/trigger` | Trigger an intervention when a user is stuck |

### WebSocket — Real-time Plan Streaming
```
ws://localhost:8000/ws/plan/{user_id}?token=<jwt>
```

The WebSocket connection requires a valid JWT passed as a query parameter. Connections without a valid token are rejected. Tokens that don't match the `user_id` in the URL are also rejected.

---

## Project Structure
```
attune/
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   │   ├── orchestrator.py         # CrewAI hierarchical orchestrator
│   │   │   ├── screening_agent.py      # ASRS screening conversation
│   │   │   ├── planning_agent.py       # Daily plan generation
│   │   │   ├── intervention_agent.py   # Stuck-state support
│   │   │   ├── pattern_agent.py        # Behavioral pattern analysis
│   │   │   └── tools/
│   │   │       └── db_tools.py         # Supabase read/write tools
│   │   ├── routes/
│   │   │   ├── auth.py
│   │   │   ├── screening.py
│   │   │   ├── profile.py
│   │   │   ├── plan.py
│   │   │   ├── dashboard.py
│   │   │   └── websocket.py
│   │   ├── services/
│   │   │   └── seed_service.py         # Guest user data seeding
│   │   ├── config.py                   # Env vars + validation
│   │   └── models.py                   # Pydantic request/response models
│   ├── supabase/
│   │   └── schema.sql                  # Full DB schema (run once)
│   ├── knowledge/
│   │   ├── executive_function_strategies.md
│   │   └── brain_state_research.md
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── globals.css
    │   │   ├── layout.tsx
    │   │   ├── page.tsx                # Landing
    │   │   ├── screening/page.tsx
    │   │   ├── plan/page.tsx
    │   │   ├── dashboard/page.tsx
    │   │   └── settings/page.tsx
    │   ├── components/
    │   │   ├── ui/                     # Shared UI primitives
    │   │   ├── layout/                 # Nav, shell
    │   │   ├── auth/                   # Login/signup forms
    │   │   ├── screening/              # ASRS chat components
    │   │   ├── plan/                   # Brain state form, task input, plan view
    │   │   └── dashboard/              # Trend chart, momentum, hypothesis cards
    │   ├── hooks/
    │   │   ├── useUser.ts
    │   │   ├── useScreeningChat.ts
    │   │   ├── useDailyPlan.ts         # WebSocket + plan state
    │   │   └── useDashboard.ts
    │   ├── lib/
    │   │   ├── api.ts                  # axios instance + interceptors
    │   │   └── constants.ts
    │   └── types/
    │       └── index.ts                # Shared TypeScript interfaces
    ├── package.json
    └── .env.example
```

---

## AI Agent System

Attune uses a **CrewAI Hierarchical Process** where a manager agent delegates to specialized sub-agents. Each agent has access to Supabase-backed tools and an ADHD knowledge base.

### Agents

**Screening Agent**
Conducts an ASRS-aligned conversational intake. Produces a `cognitive_profile` with 6 dimensions (attention, impulsivity, hyperactivity, emotional regulation, working memory, time perception) and profile tags (e.g., "Deep-Diver", "Fast-Starter").

**Planning Agent**
Generates a time-aware daily plan based on the user's current brain state (`foggy`, `focused`, `wired`), task list, optional time window, and historical check-in data. Applies a 20% ADHD time-estimation buffer. Loads `executive_function_strategies.md` and `brain_state_research.md` from the knowledge base.

**Brain state strategies:**
- **Foggy + ≤60 min** → limit to 2–3 tasks max
- **Focused** → deep work block should be ~40% of total time
- **Wired** → aim for 15-min blocks even in longer windows

**Intervention Agent**
Triggered when a user clicks "I'm Stuck." Acknowledges the user's situation, then restructures the current plan into smaller micro-steps. `allow_delegation=False` prevents unnecessary sub-agent calls.

**Pattern Agent**
Runs on users with 7+ days of check-ins. Produces `hypothesis_cards` — testable behavioral insights (e.g., "You complete more tasks when you plan before 9 AM"). Uses `output_pydantic=PatternOutput` for structured output.

### Time Window Presets

To address ADHD time-blindness, the plan page uses brain-state-aware time presets instead of free-text duration input:

| Brain State | Presets |
|-------------|---------|
| **Foggy** (focus=low) | 30 min / 1 hr / 2 hr |
| **Focused** (default) | 1 hr / 2 hr / 4 hr |
| **Wired** (energy=high) | 45 min / 1.5 hr / 3 hr |

Presets update dynamically when the user changes their brain state sliders. Selecting a new brain state resets the time window selection. The "Next" button is disabled until a time window is chosen.

---

## Features

**Screening & Onboarding**
- Conversational ASRS-aligned intake via Screening Agent
- Derives cognitive profile with 6 dimensions and descriptive profile tags
- New users can also log in as guest "Alex" (14-day pre-seeded history)

**Daily Plan**
- Brain state check-in (focus / energy / mood sliders)
- Time window selection with brain-state-calibrated presets
- AI-generated task schedule with rationale
- Local fallback scheduler (used when backend is unavailable)

**Interventions**
- "I'm Stuck" button on the plan view
- Agent acknowledges blockers and restructures tasks into micro-steps
- Real-time streaming via WebSocket

**Dashboard**
- 14-day momentum trend chart
- Momentum score + delta (shows improvement vs. prior period)
- Hypothesis cards (generated after 7+ days of data)
- Agent annotations pinpointing significant behavioral events

**Privacy & Settings**
- Data export
- Account deletion

---

## Development Guide

### TypeScript/React Quick Reference for Python Developers

| Python | TypeScript / React Equivalent |
|--------|-------------------------------|
| `x = 5` | `const [x, setX] = useState(5)` — `setX(10)` triggers a re-render |
| `if __name__ == "__main__"` | `useEffect(() => { ... }, [])` — runs once on mount |
| `@app.route("/path")` | File-based routing: `app/screening/page.tsx` → `/screening` |
| `class MyModel(BaseModel)` | `export interface MyModel { ... }` |
| `os.getenv("KEY")` | `process.env.NEXT_PUBLIC_KEY` (client-side must use `NEXT_PUBLIC_` prefix) |
| `async def` | `async function` or `const fn = async () => {}` |
| `try / except` | `try { } catch (error) { }` |
| `f"string {var}"` | `` `string ${var}` `` (backtick template literals) |
| `dict` | `Record<string, any>` or a defined `interface` |
| `list[str]` | `string[]` |
| `None` | `null` |

> **Critical Next.js rule:** Add `"use client"` at the top of any file using `useState`, `useEffect`, `useContext`, or browser event handlers. Next.js defaults to server components and will throw an error otherwise.

### Branching Strategy

Work is split by **feature**, not by layer. Each team member owns their feature end-to-end (backend fixes + frontend + integration). This keeps file ownership non-overlapping and avoids merge conflicts.

| Feature Area | Owner |
|---|---|
| Screening + Dashboard (frontend & backend) | Person A |
| Planner + Intervention (frontend & backend) | Person B |
| Auth, WebSocket, privacy (Phase 4+) | Person A (frontend) / Person B (backend) |

---

## Testing

### Backend — Endpoint Smoke Tests

After starting the backend, verify all core endpoints manually:

**1. Guest login**
```bash
curl -X POST http://localhost:8000/api/auth/guest \
  -H "Content-Type: application/json"
```
Expected: `{ "userId": "...", "name": "Alex", "isGuest": true, "hasProfile": true }`

**2. Profile fetch**
```bash
curl http://localhost:8000/api/profile/{user_id} \
  -H "Authorization: Bearer <token>"
```
Expected: 6-dimensional profile with tags and summary.

**3. Dashboard fetch**
```bash
curl http://localhost:8000/api/dashboard/{user_id} \
  -H "Authorization: Bearer <token>"
```
Expected: 14-item trend data, momentum ~71, 2 hypothesis cards (Alex guest flow).

**4. Plan generation** *(requires valid Anthropic API key)*
```bash
curl -X POST http://localhost:8000/api/plan/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"userId": "...", "brainState": "focused", "tasks": ["Write tests"], "timeWindowMinutes": 120}'
```
Expected: `{ "planId": "...", "tasks": [...], "overallRationale": "..." }`

### Verification Checklist

**Data Integrity**
- [ ] Invalid brain state (e.g. `"sleepy"`) returns `422` (not `500`)
- [ ] Invalid ASRS score (e.g. `5`) returns `422` (not `500`)
- [ ] Only 1 active plan per user after generating multiple plans
- [ ] Hypothesis card `status` is `"active"` on INSERT (not `"testing"`)
- [ ] Intervention `followup_message` column is populated in DB

**Agent Quality**
- [ ] Intervention agent does not attempt to delegate (`allow_delegation=False`)
- [ ] Pattern agent uses structured output (`result.pydantic`) as primary path
- [ ] Planning agent knowledge base loads `executive_function_strategies.md` and `brain_state_research.md`
- [ ] New user's plan rationale does **not** hallucinate historical data

**Dashboard Accuracy**
- [ ] Annotation day numbers match actual intervention dates (not hardcoded values)
- [ ] `brainState` in trend data shows `foggy`/`focused`/`wired` (not `low`/`medium`/`high`)
- [ ] With 20+ check-ins, dashboard shows the most recent 14 (not the oldest 14)

**Security**
- [ ] WebSocket rejects connections without a valid `?token=` parameter
- [ ] WebSocket rejects tokens that don't match the `user_id` in the URL
- [ ] App fails to start if `.env` is missing required keys

**Backward Compatibility**
- [ ] Alex guest login still works end-to-end
- [ ] All Phase 1 curl commands still work (with appropriate JWT)
- [ ] 4-minute frontend demo walkthrough is unchanged

**Time Window Presets**
- [ ] All 3 brain state levels must be selected before time presets appear
- [ ] Presets update dynamically when brain state levels change
- [ ] Changing a brain state level resets the time window selection
- [ ] "Next" button disabled until a time window is selected
- [ ] `timeWindowMinutes` range validated at `15–480` on backend
- [ ] Planning agent `overallRationale` mentions the time window
- [ ] Omitting `timeWindowMinutes` from the request is backward compatible

### New User Flow (Manual E2E)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Visit `/` | Landing page with "Get Started" and "Continue as Guest" |
| 2 | Click "Get Started" | Redirect to `/screening` |
| 3 | Complete ASRS screening chat | Cognitive profile generated |
| 4 | Navigate to `/plan` | Brain state form with 3 sliders |
| 5 | Select focus / energy / mood | Time window presets appear |
| 6 | Select a time window | "Next: Add Your Tasks" becomes active |
| 7 | Add tasks, click Generate | Plan generated with rationale |
| 8 | Click "I'm Stuck" | Intervention agent restructures tasks |
| 9 | Navigate to `/dashboard` | Sparse data handled gracefully (no crash) |

---

## Contributing

1. Fork the repository and create a feature branch: `git checkout -b feature/your-feature`
2. Follow the file ownership map to avoid merge conflicts
3. Ensure all verification checklist items pass before opening a PR
4. Open a pull request with a clear description of the changes and any relevant test results

---

## Team

Built by a two-person team. Work is divided by feature (end-to-end ownership) rather than by layer, enabling parallel development with zero file-overlap conflicts.

| Name | Role | LinedIn |
|------|------|---------|
| **Aryama Ray** | AI Consultant | https://www.linkedin.com/in/aryamaray/ |
| **Debisree Ray** | Data Scientist | https://www.linkedin.com/in/debisree-ray-ph-d-82241355/ |

---

## License

© 2026 Attune. All rights reserved.
