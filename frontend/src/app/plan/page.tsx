"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { useDailyPlan } from "@/hooks/useDailyPlan";
import PageContainer from "@/components/layout/PageContainer";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import type { BrainStateLevel, PlanTask, TaskType, UserTask } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const LEVEL_OPTIONS: { value: BrainStateLevel; emoji: string; label: string }[] = [
  { value: "low",    emoji: "🔴", label: "Low"    },
  { value: "medium", emoji: "🟡", label: "Medium" },
  { value: "high",   emoji: "🟢", label: "High"   },
];

const CATEGORIES: { type: TaskType; icon: string; label: string; description: string; color: string }[] = [
  { type: "deep-work", icon: "🧠", label: "Deep Work",  description: "Focused, cognitively demanding tasks",  color: "border-primary/40 bg-primary/5"     },
  { type: "admin",     icon: "📋", label: "Admin",      description: "Emails, forms, quick to-dos",           color: "border-secondary/40 bg-secondary/5" },
  { type: "social",    icon: "👥", label: "Social",     description: "Meetings, calls, collaboration",        color: "border-accent/40 bg-accent/5"       },
  { type: "routine",   icon: "🔄", label: "Routine",    description: "Daily habits & recurring tasks",        color: "border-border bg-muted/30"          },
];

const TASK_TYPE_COLOR: Record<TaskType, "primary" | "neutral" | "accent" | "secondary" | "warning"> = {
  "deep-work": "primary",
  "admin":     "neutral",
  "break":     "accent",
  "social":    "secondary",
  "routine":   "warning",
};

const TASK_TYPE_LABEL: Record<TaskType, string> = {
  "deep-work": "Deep Work",
  "admin":     "Admin",
  "break":     "Break",
  "social":    "Social",
  "routine":   "Routine",
};

function formatDuration(mins?: number) {
  if (!mins) return null;
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ─── Shared pill ──────────────────────────────────────────────────────────────

function LevelPill({
  option, selected, onClick,
}: {
  option: (typeof LEVEL_OPTIONS)[number];
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all",
        selected
          ? "border-primary bg-primary text-white shadow-sm"
          : "border-border bg-surface text-foreground hover:border-primary/50 hover:bg-primary/5",
      ].join(" ")}
    >
      <span>{option.emoji}</span>{option.label}
    </button>
  );
}

// ─── Phase 1: Brain State ─────────────────────────────────────────────────────

function BrainStateForm({ onNext }: { onNext: (bs: { focusLevel: BrainStateLevel; energyLevel: BrainStateLevel; moodLevel: BrainStateLevel; context?: string }) => void }) {
  const [focus,  setFocus]  = useState<BrainStateLevel | null>(null);
  const [energy, setEnergy] = useState<BrainStateLevel | null>(null);
  const [mood,   setMood]   = useState<BrainStateLevel | null>(null);
  const [context, setContext] = useState("");

  const isValid = focus !== null && energy !== null && mood !== null;

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      <div className="text-center">
        <h1 className="font-serif text-3xl font-bold text-foreground">How are you showing up today?</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Be honest — your plan is built around how you actually feel, not how you think you should feel.
        </p>
      </div>

      <Card padding="lg" className="w-full max-w-lg flex flex-col gap-7">
        {([ ["Focus", "How easily can you concentrate right now?", focus, setFocus],
             ["Energy", "How much physical and mental energy do you have?", energy, setEnergy],
             ["Mood",   "How are you feeling emotionally?", mood, setMood],
        ] as [string, string, BrainStateLevel | null, (v: BrainStateLevel) => void][]).map(([label, hint, val, setter]) => (
          <div key={label} className="flex flex-col gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">{hint}</p>
            </div>
            <div className="flex gap-2">
              {LEVEL_OPTIONS.map((opt) => (
                <LevelPill key={opt.value} option={opt} selected={val === opt.value} onClick={() => setter(opt.value)} />
              ))}
            </div>
          </div>
        ))}

        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-foreground">
            Anything else? <span className="font-normal text-muted-foreground">(optional)</span>
          </p>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="e.g. deadline at 3 pm, poor sleep…"
            rows={2}
            className="w-full resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        <button
          onClick={() => isValid && onNext({ focusLevel: focus!, energyLevel: energy!, moodLevel: mood!, context: context.trim() || undefined })}
          disabled={!isValid}
          className={["w-full rounded-xl py-3 text-base font-semibold text-white shadow-sm transition-all", isValid ? "bg-primary hover:bg-primary-600" : "cursor-not-allowed bg-primary/30"].join(" ")}
        >
          Next: Add Your Tasks →
        </button>
      </Card>
    </div>
  );
}

// ─── Phase 2: Task Input ──────────────────────────────────────────────────────

function TaskInput({
  category,
  tasks,
  onAdd,
  onRemove,
}: {
  category: (typeof CATEGORIES)[number];
  tasks: string[];
  onAdd: (title: string) => void;
  onRemove: (index: number) => void;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function commit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setValue("");
    inputRef.current?.focus();
  }

  return (
    <div className={["flex flex-col gap-3 rounded-2xl border p-5 transition-all", category.color].join(" ")}>
      <div className="flex items-center gap-2">
        <span className="text-xl">{category.icon}</span>
        <div>
          <p className="text-sm font-semibold text-foreground">{category.label}</p>
          <p className="text-xs text-muted-foreground">{category.description}</p>
        </div>
      </div>

      {/* Added tasks */}
      {tasks.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tasks.map((t, i) => (
            <span
              key={i}
              className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground"
            >
              {t}
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="text-faint-foreground hover:text-foreground transition-colors leading-none"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          placeholder={`Add a ${category.label.toLowerCase()} task…`}
          className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          type="button"
          onClick={commit}
          disabled={!value.trim()}
          className="rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-foreground transition-all hover:border-primary hover:bg-primary hover:text-white disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  );
}

function TaskInputForm({
  brainState,
  onBack,
  onGenerate,
}: {
  brainState: { focusLevel: BrainStateLevel; energyLevel: BrainStateLevel; moodLevel: BrainStateLevel };
  onBack: () => void;
  onGenerate: (tasks: UserTask[]) => void;
}) {
  const [taskMap, setTaskMap] = useState<Record<string, string[]>>({
    "deep-work": [],
    "admin":     [],
    "social":    [],
    "routine":   [],
  });

  const totalTasks = Object.values(taskMap).reduce((s, arr) => s + arr.length, 0);

  function addTask(category: string, title: string) {
    setTaskMap((m) => ({ ...m, [category]: [...(m[category] ?? []), title] }));
  }
  function removeTask(category: string, index: number) {
    setTaskMap((m) => ({ ...m, [category]: m[category].filter((_, i) => i !== index) }));
  }

  function handleGenerate() {
    const tasks: UserTask[] = [];
    for (const cat of CATEGORIES) {
      for (const title of taskMap[cat.type] ?? []) {
        tasks.push({ title, category: cat.type });
      }
    }
    onGenerate(tasks);
  }

  // Brain state summary pills
  const bsSummary = [
    { label: `Focus: ${brainState.focusLevel}`,  emoji: brainState.focusLevel === "high" ? "🟢" : brainState.focusLevel === "medium" ? "🟡" : "🔴" },
    { label: `Energy: ${brainState.energyLevel}`, emoji: brainState.energyLevel === "high" ? "🟢" : brainState.energyLevel === "medium" ? "🟡" : "🔴" },
    { label: `Mood: ${brainState.moodLevel}`,     emoji: brainState.moodLevel === "high" ? "🟢" : brainState.moodLevel === "medium" ? "🟡" : "🔴" },
  ];

  return (
    <div className="flex flex-col gap-6 py-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl font-bold text-foreground">What needs to get done today?</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add your tasks to each category. The plan will schedule them with smart breaks based on your brain state.
        </p>
        {/* Brain state recap */}
        <div className="mt-3 flex flex-wrap gap-2">
          {bsSummary.map((s) => (
            <span key={s.label} className="flex items-center gap-1 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground capitalize">
              <span>{s.emoji}</span>{s.label}
            </span>
          ))}
        </div>
      </div>

      {/* Category inputs */}
      <div className="flex flex-col gap-4">
        {CATEGORIES.map((cat) => (
          <TaskInput
            key={cat.type}
            category={cat}
            tasks={taskMap[cat.type] ?? []}
            onAdd={(title) => addTask(cat.type, title)}
            onRemove={(i)  => removeTask(cat.type, i)}
          />
        ))}
      </div>

      {totalTasks === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Add at least one task above to generate your plan.
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          className="text-sm font-medium text-muted-foreground underline-offset-2 hover:underline"
        >
          ← Back
        </button>
        <button
          onClick={handleGenerate}
          disabled={totalTasks === 0}
          className={[
            "rounded-xl px-8 py-3 text-base font-semibold text-white shadow-sm transition-all",
            totalTasks > 0 ? "bg-primary hover:bg-primary-600 active:scale-[0.99]" : "cursor-not-allowed bg-primary/30",
          ].join(" ")}
        >
          Generate My Plan ({totalTasks} task{totalTasks !== 1 ? "s" : ""}) →
        </button>
      </div>
    </div>
  );
}

// ─── Phase 3: Plan View ───────────────────────────────────────────────────────

function TaskRow({
  task, index, isCurrentTask, onToggle, onStuck, isIntervening,
}: {
  task: PlanTask; index: number; isCurrentTask: boolean;
  onToggle: () => void; onStuck: () => void; isIntervening: boolean;
}) {
  return (
    <div className={[
      "flex items-start gap-4 rounded-2xl border p-5 transition-all",
      task.type === "break"
        ? "border-accent/30 bg-accent/5"
        : task.completed
        ? "border-border/50 bg-muted/30 opacity-60"
        : isCurrentTask
        ? "border-primary/30 bg-primary/5"
        : "border-border bg-surface",
    ].join(" ")}>
      {task.type !== "break" && (
        <button
          onClick={onToggle}
          className={["mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
            task.completed ? "border-primary bg-primary text-white" : "border-border hover:border-primary",
          ].join(" ")}
        >
          {task.completed && (
            <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      )}
      {task.type === "break" && <span className="mt-0.5 text-lg shrink-0">☕</span>}

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <p className={["text-sm font-semibold", task.completed ? "line-through text-muted-foreground" : "text-foreground"].join(" ")}>
            {task.type !== "break" ? `${index + 1}. ` : ""}{task.title}
          </p>
          {task.type && (
            <Badge color={TASK_TYPE_COLOR[task.type]}>{TASK_TYPE_LABEL[task.type]}</Badge>
          )}
          {task.duration && (
            <span className="text-xs text-faint-foreground">{formatDuration(task.duration)}</span>
          )}
        </div>
        {task.description && (
          <p className="text-xs text-muted-foreground leading-relaxed">{task.description}</p>
        )}
      </div>

      {isCurrentTask && !task.completed && task.type !== "break" && (
        <button
          onClick={onStuck}
          disabled={isIntervening}
          className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors disabled:opacity-40"
        >
          {isIntervening ? "…" : "I'm stuck"}
        </button>
      )}
    </div>
  );
}

function InterventionBanner({ acknowledgment, suggestion, onDismiss }: {
  acknowledgment: string; suggestion?: string; onDismiss: () => void;
}) {
  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 flex gap-3">
      <span className="text-lg shrink-0">🤝</span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-foreground mb-1">From your support agent</p>
        <p className="text-sm leading-relaxed text-muted-foreground">{acknowledgment}</p>
        {suggestion && <p className="mt-2 text-xs font-medium text-primary">{suggestion}</p>}
      </div>
      <button onClick={onDismiss} className="shrink-0 text-xs text-faint-foreground hover:text-foreground">✕</button>
    </div>
  );
}

function PlanView({
  plan, intervention, isIntervening,
  onToggle, onStuck, onDismissIntervention, onReset,
}: {
  plan: NonNullable<ReturnType<typeof useDailyPlan>["plan"]>;
  intervention: ReturnType<typeof useDailyPlan>["intervention"];
  isIntervening: boolean;
  onToggle: (i: number) => void;
  onStuck: (i: number) => void;
  onDismissIntervention: () => void;
  onReset: () => void;
}) {
  const workTasks = plan.tasks.filter(t => t.type !== "break");
  const completed = workTasks.filter(t => t.completed).length;
  const allDone = completed === workTasks.length;
  const currentTaskIndex = plan.tasks.findIndex(t => !t.completed && t.type !== "break");
  const date = new Date(plan.createdAt).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">Today's Plan</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{date}</p>
        </div>
        <button onClick={onReset} className="shrink-0 mt-1 text-xs font-medium text-faint-foreground underline-offset-2 hover:text-foreground hover:underline">
          Start over
        </button>
      </div>

      {/* Progress */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{completed} of {workTasks.length} tasks done</span>
          <span>{workTasks.length > 0 ? Math.round((completed / workTasks.length) * 100) : 0}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${workTasks.length > 0 ? (completed / workTasks.length) * 100 : 0}%` }} />
        </div>
      </div>

      {/* Rationale */}
      {plan.rationale && (
        <div className="rounded-xl border border-border bg-muted/40 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-faint-foreground mb-1">How your day is structured</p>
          <p className="text-sm leading-relaxed text-muted-foreground">{plan.rationale}</p>
        </div>
      )}

      {intervention && (
        <InterventionBanner acknowledgment={intervention.acknowledgment} suggestion={intervention.suggestion} onDismiss={onDismissIntervention} />
      )}

      {allDone ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-accent-200 bg-accent/10 py-10 text-center">
          <p className="text-4xl">🎉</p>
          <p className="font-serif text-xl font-bold text-foreground">All done for today!</p>
          <p className="text-sm text-muted-foreground">You showed up and made it through. That matters.</p>
          <button onClick={onReset} className="mt-2 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary-600 transition-colors">
            Plan another session
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {plan.tasks.map((task, i) => (
            <TaskRow
              key={task.id}
              task={task}
              index={i}
              isCurrentTask={i === currentTaskIndex}
              onToggle={() => onToggle(i)}
              onStuck={() => onStuck(i)}
              isIntervening={isIntervening}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type PagePhase = "brain-state" | "tasks";

export default function PlanPage() {
  const { user, isLoading: userLoading } = useUser();
  const router = useRouter();
  const [pagePhase, setPagePhase] = useState<PagePhase>("brain-state");

  const {
    brainState, setBrainState,
    plan, isGenerating, generateDailyPlan,
    isIntervening, intervention, triggerStuck, clearIntervention,
    toggleTaskComplete, resetPlan, error,
  } = useDailyPlan();

  useEffect(() => {
    if (!userLoading && user === null) router.replace("/");
  }, [userLoading, user, router]);

  if (userLoading) return <div className="flex min-h-[60vh] items-center justify-center"><LoadingSpinner /></div>;
  if (!user) return null;

  if (isGenerating) {
    return (
      <PageContainer className="max-w-2xl">
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
          <LoadingSpinner label="Building your personalised plan…" size={28} />
          <p className="text-xs text-faint-foreground">Scheduling your tasks with smart breaks.</p>
        </div>
      </PageContainer>
    );
  }

  if (plan) {
    return (
      <PageContainer className="max-w-2xl">
        {error && <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}
        <PlanView
          plan={plan}
          intervention={intervention}
          isIntervening={isIntervening}
          onToggle={toggleTaskComplete}
          onStuck={(i) => triggerStuck(i)}
          onDismissIntervention={clearIntervention}
          onReset={() => { resetPlan(); setPagePhase("brain-state"); }}
        />
      </PageContainer>
    );
  }

  if (pagePhase === "tasks" && brainState) {
    return (
      <PageContainer className="max-w-2xl">
        <TaskInputForm
          brainState={brainState}
          onBack={() => setPagePhase("brain-state")}
          onGenerate={(tasks) => generateDailyPlan(tasks)}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="max-w-2xl">
      <BrainStateForm
        onNext={(bs) => {
          setBrainState(bs);
          setPagePhase("tasks");
        }}
      />
    </PageContainer>
  );
}
