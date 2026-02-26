"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import PageContainer from "@/components/layout/PageContainer";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ScreeningChat from "@/components/screening/ScreeningChat";
import CognitiveRadarChart from "@/components/screening/CognitiveRadarChart";
import ProfileTagsReveal from "@/components/screening/ProfileTagsReveal";
import { useScreeningChat } from "@/hooks/useScreeningChat";
import type { TodayFeeling } from "@/types";

// ─── Scale options ────────────────────────────────────────────────────────────

const SCALES = {
  focus: {
    label: "How focused do you feel?",
    low: "Very scattered",
    high: "Laser sharp",
    options: [
      { value: 1, emoji: "🌀", label: "Very scattered" },
      { value: 2, emoji: "😶‍🌫️", label: "Mostly drifting" },
      { value: 3, emoji: "🙂", label: "Getting there" },
      { value: 4, emoji: "🎯", label: "Fairly focused" },
      { value: 5, emoji: "⚡", label: "Laser sharp" },
    ],
  },
  energy: {
    label: "How's your energy level?",
    low: "Depleted",
    high: "Buzzing",
    options: [
      { value: 1, emoji: "🪫", label: "Depleted" },
      { value: 2, emoji: "😴", label: "Low" },
      { value: 3, emoji: "🙂", label: "Steady" },
      { value: 4, emoji: "⚡", label: "Energised" },
      { value: 5, emoji: "🚀", label: "Buzzing" },
    ],
  },
  mood: {
    label: "How's your mood?",
    low: "Very low",
    high: "Great",
    options: [
      { value: 1, emoji: "😔", label: "Very low" },
      { value: 2, emoji: "😕", label: "Low" },
      { value: 3, emoji: "😐", label: "Neutral" },
      { value: 4, emoji: "🙂", label: "Good" },
      { value: 5, emoji: "😄", label: "Great" },
    ],
  },
  calm: {
    label: "How calm do you feel?",
    low: "Very anxious",
    high: "Deeply calm",
    options: [
      { value: 1, emoji: "😰", label: "Very anxious" },
      { value: 2, emoji: "😬", label: "A bit tense" },
      { value: 3, emoji: "😐", label: "Neutral" },
      { value: 4, emoji: "😌", label: "Mostly calm" },
      { value: 5, emoji: "🧘", label: "Deeply calm" },
    ],
  },
} as const;

// ─── Scale row ────────────────────────────────────────────────────────────────

const ACTIVE_COLORS = [
  "border-red-400 bg-red-400",
  "border-orange-400 bg-orange-400",
  "border-yellow-400 bg-yellow-400",
  "border-teal-500 bg-teal-500",
  "border-primary bg-primary",
];

function ScaleRow({
  options,
  value,
  onChange,
}: {
  options: readonly { value: number; emoji: string; label: string }[];
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          title={opt.label}
          className={[
            "flex flex-1 flex-col items-center gap-1 rounded-xl border-2 py-2.5 transition-all",
            value === opt.value
              ? `${ACTIVE_COLORS[opt.value - 1]} text-white scale-105 shadow-md`
              : "border-border bg-surface hover:border-primary/40 hover:bg-primary/5",
          ].join(" ")}
        >
          <span className="text-lg">{opt.emoji}</span>
          <span className="hidden text-[10px] font-semibold sm:block leading-tight text-center px-0.5">
            {opt.label}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── Yes / No pill ────────────────────────────────────────────────────────────

function YesNo({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex gap-2">
      {[true, false].map((v) => (
        <button
          key={String(v)}
          type="button"
          onClick={() => onChange(v)}
          className={[
            "rounded-full border px-4 py-2 text-sm font-medium transition-all",
            value === v
              ? "border-primary bg-primary text-white shadow-sm"
              : "border-border bg-surface text-foreground hover:border-primary/60 hover:bg-primary/5",
          ].join(" ")}
        >
          {v ? "Yes" : "No"}
        </button>
      ))}
    </div>
  );
}

// ─── How Are You Feeling — check-in form ─────────────────────────────────────

function CheckInForm({ onDone }: { onDone: () => void }) {
  const { updateTodayFeeling } = useUser();

  const [focusLevel,  setFocusLevel]  = useState<number | null>(null);
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [moodLevel,   setMoodLevel]   = useState<number | null>(null);
  const [calmLevel,   setCalmLevel]   = useState<number | null>(null);
  const [wellRested,  setWellRested]  = useState<boolean | null>(null);
  const [hadCaffeine, setHadCaffeine] = useState<boolean | null>(null);
  const [hadAlcohol,  setHadAlcohol]  = useState<boolean | null>(null);

  const isValid =
    focusLevel  !== null &&
    energyLevel !== null &&
    moodLevel   !== null &&
    calmLevel   !== null &&
    wellRested  !== null &&
    hadCaffeine !== null &&
    hadAlcohol  !== null;

  function handleSubmit() {
    if (!isValid) return;
    const feeling: TodayFeeling = {
      focusLevel:  focusLevel!,
      energyLevel: energyLevel!,
      moodLevel:   moodLevel!,
      calmLevel:   calmLevel!,
      wellRested:  wellRested!,
      hadCaffeine: hadCaffeine!,
      hadAlcohol:  hadAlcohol!,
    };
    updateTodayFeeling(feeling);
    onDone();
  }

  return (
    <div className="flex flex-col items-center gap-8 py-10">
      <div className="text-center">
        <h1 className="font-serif text-3xl font-bold text-foreground">
          How are you feeling?
        </h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          A quick check-in before the assessment — be honest, there are no right answers.
        </p>
      </div>

      <div className="w-full max-w-lg flex flex-col gap-7 rounded-2xl border border-border bg-surface p-6">
        {/* Four scale questions */}
        {(["focus", "energy", "mood", "calm"] as const).map((key) => {
          const scale = SCALES[key];
          const values = { focus: focusLevel, energy: energyLevel, mood: moodLevel, calm: calmLevel };
          const setters = { focus: setFocusLevel, energy: setEnergyLevel, mood: setMoodLevel, calm: setCalmLevel };
          return (
            <div key={key} className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-foreground">{scale.label}</p>
              <ScaleRow options={scale.options} value={values[key]} onChange={setters[key]} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{scale.low}</span>
                <span>{scale.high}</span>
              </div>
            </div>
          );
        })}

        {/* Binary questions */}
        <div className="flex flex-col gap-4 border-t border-border pt-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-foreground">😴 Are you well rested?</span>
            <YesNo value={wellRested} onChange={setWellRested} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-foreground">☕ Had caffeine today?</span>
            <YesNo value={hadCaffeine} onChange={setHadCaffeine} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-foreground">🍺 Had any alcohol today?</span>
            <YesNo value={hadAlcohol} onChange={setHadAlcohol} />
          </div>
        </div>
      </div>

      <Button onClick={handleSubmit} disabled={!isValid} size="lg">
        Continue to Assessment
      </Button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ScreeningPage() {
  const router = useRouter();
  const { user } = useUser();

  // Check-in is shown for every user on every visit to /screening
  const [checkinDone, setCheckinDone] = useState(false);

  const {
    phase,
    currentIndex,
    answers,
    result,
    error,
    totalQuestions,
    currentQuestion,
    startScreening,
    submitAnswer,
  } = useScreeningChat();

  // ── Loading: wait for user session ───────────────────────────────────────
  if (user === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // ── Check-in — shown before every assessment ──────────────────────────────
  if (!checkinDone) {
    return (
      <PageContainer className="max-w-2xl">
        <CheckInForm onDone={() => setCheckinDone(true)} />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="max-w-2xl">
      {/* ── Idle: intro ──────────────────────────────────────────────────── */}
      {phase === "idle" && (
        <div className="flex flex-col items-center gap-6 py-16 text-center">
          <h1 className="font-serif text-4xl font-bold text-foreground">
            Attention Screening
          </h1>
          <p className="max-w-md leading-relaxed text-muted-foreground">
            This short check-in — {totalQuestions} questions — helps us understand
            how you experience focus, organisation, and energy. It takes about
            3 minutes.
          </p>
          <p className="text-sm text-faint-foreground">
            There are no right or wrong answers. Be honest — this is just for you.
          </p>
          <Button onClick={startScreening} size="lg">
            Begin Screening
          </Button>
        </div>
      )}

      {/* ── Questioning / Evaluating ─────────────────────────────────────── */}
      {(phase === "questioning" || phase === "evaluating") && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h1 className="font-serif text-xl font-semibold text-foreground">Screening</h1>
            <span className="font-mono text-sm text-muted-foreground">
              {Math.min(currentIndex + 1, totalQuestions)} / {totalQuestions}
            </span>
          </div>

          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${(Math.min(currentIndex + 1, totalQuestions) / totalQuestions) * 100}%` }}
            />
          </div>

          <ScreeningChat
            answers={answers}
            currentQuestion={currentQuestion}
            isEvaluating={phase === "evaluating"}
            onAnswer={submitAnswer}
          />

          {phase === "evaluating" && (
            <div className="py-4">
              <LoadingSpinner label="Analysing your responses…" size={20} />
            </div>
          )}

          {error && (
            <p className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
          )}
        </div>
      )}

      {/* ── Complete: results ─────────────────────────────────────────────── */}
      {phase === "complete" && result && (
        <div className="flex flex-col gap-10 py-8">
          <h1 className="text-center font-serif text-3xl font-bold text-foreground">
            Screening Complete
          </h1>
          <CognitiveRadarChart dimensions={result.dimensions} />
          <ProfileTagsReveal
            tags={result.tags}
            summary={result.summary}
            onContinue={() => router.push("/plan")}
          />
          <div className="flex justify-center">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-sm font-medium text-primary underline-offset-2 hover:underline"
            >
              View your dashboard →
            </button>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
