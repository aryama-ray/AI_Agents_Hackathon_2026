"use client";

import { useState, useCallback } from "react";
import { useUser } from "@/hooks/useUser";
import api from "@/lib/api";
import type { BrainState, BrainStateLevel, PlanResponse, PlanTask, InterventionResponse, UserTask, TaskType } from "@/types";

// ─── Smart local scheduler ────────────────────────────────────────────────────

// How long each category gets per task based on focus level
const TASK_DURATIONS: Record<TaskType, Record<BrainStateLevel, number>> = {
  "deep-work": { high: 90, medium: 60, low: 45 },
  "admin":     { high: 25, medium: 25, low: 25 },
  "social":    { high: 30, medium: 30, low: 30 },
  "routine":   { high: 20, medium: 20, low: 20 },
  "break":     { high: 10, medium: 12, low: 15 },
};

// Break trigger: insert a break after this many minutes of work
const BREAK_AFTER: Record<BrainStateLevel, number> = {
  high:   90,
  medium: 60,
  low:    45,
};

// Category order — deep work goes early when focus is high, late when low
const CATEGORY_ORDER: Record<BrainStateLevel, TaskType[]> = {
  high:   ["deep-work", "routine", "admin", "social"],
  medium: ["routine",   "deep-work", "admin", "social"],
  low:    ["routine",   "admin",   "social", "deep-work"],
};

const BREAK_DESCRIPTIONS = [
  "Step away from your screen — stretch, take a short walk, or just breathe.",
  "Hydrate, rest your eyes for 30 seconds, and let your mind wander.",
  "A moment to recharge. Slow breathing: in for 4, hold for 4, out for 4.",
  "Quick body scan — roll your shoulders, unclench your jaw, shake it out.",
];

function pickBreakDescription(index: number) {
  return BREAK_DESCRIPTIONS[index % BREAK_DESCRIPTIONS.length];
}

function buildSchedule(brainState: BrainState, userTasks: UserTask[]): PlanResponse {
  const focus = brainState.focusLevel;
  const breakThreshold = BREAK_AFTER[focus];
  let breakCount = 0;

  // Group by category
  const grouped: Partial<Record<TaskType, UserTask[]>> = {};
  for (const t of userTasks) {
    (grouped[t.category] ??= []).push(t);
  }

  // Build ordered task list: categories sorted by brain-state suitability
  const ordered: UserTask[] = [];
  for (const cat of CATEGORY_ORDER[focus]) {
    if (grouped[cat]) ordered.push(...grouped[cat]!);
  }
  // Append any category not covered (shouldn't happen, but safety net)
  for (const [cat, tasks] of Object.entries(grouped) as [TaskType, UserTask[]][]) {
    if (!CATEGORY_ORDER[focus].includes(cat)) ordered.push(...tasks);
  }

  const result: PlanTask[] = [];
  let minutesSinceBreak = 0;

  for (const task of ordered) {
    const duration = TASK_DURATIONS[task.category][focus];

    // Insert a break if we've hit the threshold
    if (minutesSinceBreak >= breakThreshold) {
      result.push({
        id: crypto.randomUUID(),
        title: "Break",
        description: pickBreakDescription(breakCount++),
        duration: TASK_DURATIONS["break"][focus],
        type: "break",
        completed: false,
      });
      minutesSinceBreak = 0;
    }

    result.push({
      id: crypto.randomUUID(),
      title: task.title,
      duration,
      type: task.category,
      completed: false,
    });

    minutesSinceBreak += duration;
  }

  // Always close with a short wrap-up
  result.push({
    id: crypto.randomUUID(),
    title: "Wrap up & reflect",
    description:
      "Note what you finished, what's carrying over, and the one thing you're proud of today.",
    duration: 10,
    type: "routine",
    completed: false,
  });

  // Build a meaningful rationale
  const deepCount  = userTasks.filter(t => t.category === "deep-work").length;
  const totalMins  = result.reduce((s, t) => s + (t.duration ?? 0), 0);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  const timeStr = h > 0 ? `${h}h ${m > 0 ? `${m}m` : ""}`.trim() : `${m}m`;

  const rationale =
    focus === "high"
      ? `Focus is high — deep work is scheduled first to hit your peak state. ${deepCount > 0 ? `${deepCount} deep-work block${deepCount > 1 ? "s" : ""} front-loaded. ` : ""}Breaks every ${breakThreshold} min. Total: ~${timeStr}.`
      : focus === "medium"
      ? `Moderate focus — starting with lighter tasks to warm up before deeper work. Breaks every ${breakThreshold} min. Total: ~${timeStr}.`
      : `Focus is low today — gentle start with routine and admin, building up gradually. Plenty of breathing room. Total: ~${timeStr}.`;

  return {
    planId: crypto.randomUUID(),
    tasks: result,
    rationale,
    createdAt: new Date().toISOString(),
  };
}

// ─── Local fallback: intervention ────────────────────────────────────────────

function localIntervention(stuckTask: PlanTask, remainingTasks: PlanTask[]): InterventionResponse {
  return {
    acknowledgment:
      "Being stuck is completely valid — it happens when your brain is working hard. Let's not fight it. I've broken this down into smaller steps so you can ease back in.",
    restructuredTasks: [
      {
        id: crypto.randomUUID(),
        title: `Start tiny: just open "${stuckTask.title}"`,
        description: "You don't have to finish it — just open it and look at it for 2 minutes.",
        duration: 5,
        type: stuckTask.type,
        completed: false,
      },
      {
        id: crypto.randomUUID(),
        title: "Grounding break",
        description: "30 seconds of slow breathing — in for 4, hold for 4, out for 4.",
        duration: 5,
        type: "break",
        completed: false,
      },
      {
        id: crypto.randomUUID(),
        title: `Continue: ${stuckTask.title}`,
        description: stuckTask.description ?? "Pick back up where you left off.",
        duration: Math.max(10, (stuckTask.duration ?? 30) - 10),
        type: stuckTask.type,
        completed: false,
      },
      ...remainingTasks,
    ],
    suggestion:
      "Try the 2-minute rule: commit to starting for just 2 minutes. You can stop after that if needed — but often you won't want to.",
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseDailyPlanReturn {
  brainState: BrainState | null;
  setBrainState: (state: BrainState) => void;
  plan: PlanResponse | null;
  isGenerating: boolean;
  generateDailyPlan: (userTasks: UserTask[]) => Promise<void>;
  isIntervening: boolean;
  intervention: InterventionResponse | null;
  triggerStuck: (taskIndex: number, message?: string) => Promise<void>;
  clearIntervention: () => void;
  toggleTaskComplete: (taskIndex: number) => void;
  resetPlan: () => void;
  error: string | null;
}

export function useDailyPlan(): UseDailyPlanReturn {
  const { user } = useUser();

  const [brainState, setBrainState] = useState<BrainState | null>(null);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isIntervening, setIsIntervening] = useState(false);
  const [intervention, setIntervention] = useState<InterventionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateDailyPlan = useCallback(
    async (userTasks: UserTask[]) => {
      if (!brainState || userTasks.length === 0) return;
      setIsGenerating(true);
      setError(null);
      setIntervention(null);

      try {
        const res = await api.post<PlanResponse>("/plan/generate", {
          userId: user?.id ?? "guest",
          brainState,
          userTasks,
          profile: user?.background ?? null,
        });
        setPlan(res.data);
      } catch {
        // Backend unavailable — build locally from the user's real tasks
        setPlan(buildSchedule(brainState, userTasks));
      } finally {
        setIsGenerating(false);
      }
    },
    [brainState, user]
  );

  const triggerStuck = useCallback(
    async (taskIndex: number, message?: string) => {
      if (!plan) return;
      setIsIntervening(true);
      setError(null);

      const stuckTask = plan.tasks[taskIndex];
      const remainingTasks = plan.tasks.slice(taskIndex + 1);

      try {
        const res = await api.post<InterventionResponse>("/plan/intervene", {
          userId: user?.id ?? "guest",
          planId: plan.planId,
          taskIndex,
          message,
        });
        const result = res.data;
        setIntervention(result);
        setPlan((p) =>
          p ? { ...p, tasks: [...p.tasks.slice(0, taskIndex), ...result.restructuredTasks] } : p
        );
      } catch {
        const fallback = localIntervention(stuckTask, remainingTasks);
        setIntervention(fallback);
        setPlan((p) =>
          p ? { ...p, tasks: [...p.tasks.slice(0, taskIndex), ...fallback.restructuredTasks] } : p
        );
      } finally {
        setIsIntervening(false);
      }
    },
    [plan, user]
  );

  function clearIntervention() { setIntervention(null); }

  function toggleTaskComplete(taskIndex: number) {
    setPlan((p) => {
      if (!p) return p;
      return {
        ...p,
        tasks: p.tasks.map((t, i) =>
          i === taskIndex ? { ...t, completed: !t.completed } : t
        ),
      };
    });
  }

  function resetPlan() {
    setPlan(null);
    setIntervention(null);
    setError(null);
    setBrainState(null);
  }

  return {
    brainState, setBrainState,
    plan, isGenerating, generateDailyPlan,
    isIntervening, intervention, triggerStuck, clearIntervention,
    toggleTaskComplete, resetPlan, error,
  };
}
