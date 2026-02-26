"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { readLatestScreening } from "@/lib/screeningStore";
import PageContainer from "@/components/layout/PageContainer";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import type { ScreeningRecord, Gender, AgeRange, Ethnicity } from "@/types";
import { ANSWER_OPTIONS } from "@/lib/screeningData";

// ─── Display helpers ──────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function scoreColor(score: number) {
  if (score >= 70) return "bg-red-400";
  if (score >= 50) return "bg-orange-400";
  if (score >= 30) return "bg-yellow-400";
  return "bg-teal-500";
}

function scoreLabel(score: number) {
  if (score >= 70) return "High";
  if (score >= 50) return "Moderate";
  if (score >= 30) return "Mild";
  return "Low";
}

const GENDER_LABELS: Record<string, string> = {
  male: "Male",
  female: "Female",
  "non-binary": "Non-binary / Two-spirit",
  "prefer-not-to-say": "Prefer not to say",
};

const ETHNICITY_LABELS: Record<string, string> = {
  white: "White",
  black: "Black or African American",
  "two-or-more": "Two or more races",
  "south-asian": "South Asian",
  "hispanic-latino": "Hispanic or Latino",
  asian: "Asian",
  "pacific-islander": "Pacific Islander",
  "prefer-not-to-say": "Prefer not to say",
};

const FOCUS_LABELS  = ["", "Very scattered", "Mostly drifting", "Getting there", "Fairly focused", "Laser sharp"];
const ENERGY_LABELS = ["", "Depleted",       "Low",             "Steady",         "Energised",      "Buzzing"];
const MOOD_LABELS   = ["", "Very low",       "Low",             "Neutral",        "Good",           "Great"];
const CALM_LABELS   = ["", "Very anxious",   "A bit tense",     "Neutral",        "Mostly calm",    "Deeply calm"];

// ─── Shared UI primitives ─────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function SelectPill({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
        selected
          ? "border-primary bg-primary text-white shadow-sm"
          : "border-border bg-surface text-foreground hover:border-primary/60 hover:bg-primary/5",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function YesNo({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex gap-2">
      <SelectPill label="Yes" selected={value === true} onClick={() => onChange(true)} />
      <SelectPill label="No" selected={value === false} onClick={() => onChange(false)} />
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

// ─── Screening result panel ───────────────────────────────────────────────────

function AnswerBadge({ label }: { label: string }) {
  const idx = ANSWER_OPTIONS.findIndex((o) => o.label === label);
  const colors = [
    "bg-teal-100 text-teal-800",
    "bg-lime-100 text-lime-800",
    "bg-yellow-100 text-yellow-800",
    "bg-orange-100 text-orange-800",
    "bg-red-100 text-red-800",
  ];
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${idx >= 0 ? colors[idx] : "bg-muted text-foreground"}`}>
      {label}
    </span>
  );
}

function ScreeningPanel({ record }: { record: ScreeningRecord }) {
  const [expanded, setExpanded] = useState(false);

  const byDimension = record.answers.reduce<Record<string, typeof record.answers>>(
    (acc, a) => {
      if (!acc[a.dimension]) acc[a.dimension] = [];
      acc[a.dimension].push(a);
      return acc;
    },
    {}
  );

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-border bg-surface p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-faint-foreground">
          Assessment taken on {formatDate(record.date)}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {record.summary}
        </p>
      </div>

      {record.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {record.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-faint-foreground">Dimension Scores</p>
        {Object.entries(record.dimensions).map(([dim, score]) => (
          <div key={dim} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">{dim}</span>
              <span className="text-muted-foreground">{scoreLabel(score)} · {score}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className={`h-full rounded-full transition-all duration-700 ${scoreColor(score)}`} style={{ width: `${score}%` }} />
            </div>
          </div>
        ))}
      </div>

      {record.answers.length > 0 && (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-faint-foreground hover:text-foreground transition-colors"
          >
            <span>{expanded ? "▲" : "▼"}</span>
            {expanded ? "Hide" : "Show"} all {record.answers.length} questions
          </button>

          {expanded && (
            <div className="flex flex-col gap-6 pt-1">
              {Object.entries(byDimension).map(([dim, qs]) => (
                <div key={dim} className="flex flex-col gap-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-primary/70">{dim}</p>
                  {qs.map((q) => (
                    <div key={q.questionId} className="flex items-start justify-between gap-4 rounded-xl bg-muted/50 px-4 py-3">
                      <p className="flex-1 text-sm leading-relaxed text-foreground">{q.questionText}</p>
                      <AnswerBadge label={q.answerLabel} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Editable background section ─────────────────────────────────────────────

function BackgroundSection() {
  const { user, updateDemographics } = useUser();
  const bg = user?.background;

  const [editing, setEditing] = useState(false);

  // Edit state (initialised from current bg)
  const [gender, setGender] = useState<Gender | null>(null);
  const [ageRange, setAgeRange] = useState<AgeRange | null>(null);
  const [ethnicity, setEthnicity] = useState<Ethnicity | null>(null);
  const [diagnosedADHD, setDiagnosedADHD] = useState<boolean | null>(null);
  const [diagnosedASD, setDiagnosedASD] = useState<boolean | null>(null);
  const [diagnosedDepAnx, setDiagnosedDepAnx] = useState<boolean | null>(null);
  const [takesMedication, setTakesMedication] = useState<boolean | null>(null);

  function openEdit() {
    if (!bg) return;
    setGender(bg.gender);
    setAgeRange(bg.ageRange);
    setEthnicity(bg.ethnicity);
    setDiagnosedADHD(bg.diagnosedADHD);
    setDiagnosedASD(bg.diagnosedASD);
    setDiagnosedDepAnx(bg.diagnosedDepressionAnxiety);
    setTakesMedication(bg.takesMedication);
    setEditing(true);
  }

  function handleSave() {
    if (!gender || !ageRange || !ethnicity || diagnosedADHD === null || diagnosedASD === null || diagnosedDepAnx === null) return;
    updateDemographics({
      gender,
      ageRange,
      ethnicity,
      diagnosedADHD,
      diagnosedASD,
      diagnosedDepressionAnxiety: diagnosedDepAnx,
      takesMedication: diagnosedDepAnx ? (takesMedication ?? false) : null,
    });
    setEditing(false);
  }

  if (!bg) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-muted-foreground">
        You haven't completed the background questionnaire yet.{" "}
        <a href="/background" className="font-medium text-primary underline-offset-2 hover:underline">Fill it in →</a>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-6 rounded-2xl border border-primary/30 bg-surface p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-faint-foreground">Editing Background</p>

        {/* Gender */}
        <FieldGroup label="Gender">
          {([ ["male","Male"], ["female","Female"], ["non-binary","Non-binary / Two-spirit"], ["prefer-not-to-say","Prefer not to say"] ] as [Gender,string][]).map(([v,l]) => (
            <SelectPill key={v} label={l} selected={gender === v} onClick={() => setGender(v)} />
          ))}
        </FieldGroup>

        {/* Age */}
        <FieldGroup label="Age range">
          {(["18-25","26-35","36-45","46-55","56-65","65+"] as AgeRange[]).map((v) => (
            <SelectPill key={v} label={v} selected={ageRange === v} onClick={() => setAgeRange(v)} />
          ))}
        </FieldGroup>

        {/* Ethnicity */}
        <FieldGroup label="Race / Ethnicity">
          {([ ["white","White"], ["black","Black or African American"], ["two-or-more","Two or more races"], ["south-asian","South Asian"], ["hispanic-latino","Hispanic or Latino"], ["asian","Asian"], ["pacific-islander","Pacific Islander"], ["prefer-not-to-say","Prefer not to say"] ] as [Ethnicity,string][]).map(([v,l]) => (
            <SelectPill key={v} label={l} selected={ethnicity === v} onClick={() => setEthnicity(v)} />
          ))}
        </FieldGroup>

        <div className="border-t border-border pt-4 flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-faint-foreground">Health History</p>

          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-foreground">Diagnosed with ADHD?</span>
            <YesNo value={diagnosedADHD} onChange={setDiagnosedADHD} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-foreground">Diagnosed with ASD?</span>
            <YesNo value={diagnosedASD} onChange={setDiagnosedASD} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-foreground">Diagnosed with depression / anxiety?</span>
            <YesNo value={diagnosedDepAnx} onChange={setDiagnosedDepAnx} />
          </div>
          {diagnosedDepAnx && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-foreground">Takes medication for it?</span>
              <YesNo value={takesMedication} onChange={setTakesMedication} />
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            className="rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-40"
          >
            Save Changes
          </button>
          <button
            onClick={() => setEditing(false)}
            className="rounded-xl border border-border px-6 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── View mode ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* Demographics */}
      <div className="rounded-2xl border border-border bg-surface p-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-faint-foreground">Demographics</p>
          <button onClick={openEdit} className="text-xs font-medium text-primary underline-offset-2 hover:underline">
            Edit
          </button>
        </div>
        <InfoRow label="Gender" value={GENDER_LABELS[bg.gender] ?? bg.gender} />
        <InfoRow label="Age range" value={bg.ageRange} />
        <InfoRow label="Race / Ethnicity" value={ETHNICITY_LABELS[bg.ethnicity] ?? bg.ethnicity} />
      </div>

      {/* Health history */}
      <div className="rounded-2xl border border-border bg-surface p-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-faint-foreground">Health History</p>
          <button onClick={openEdit} className="text-xs font-medium text-primary underline-offset-2 hover:underline">
            Edit
          </button>
        </div>
        <InfoRow label="Diagnosed with ADHD" value={bg.diagnosedADHD ? "Yes" : "No"} />
        <InfoRow label="Diagnosed with ASD" value={bg.diagnosedASD ? "Yes" : "No"} />
        <InfoRow label="Diagnosed with depression / anxiety" value={bg.diagnosedDepressionAnxiety ? "Yes" : "No"} />
        {bg.diagnosedDepressionAnxiety && bg.takesMedication !== null && (
          <InfoRow label="Takes medication for depression / anxiety" value={bg.takesMedication ? "Yes" : "No"} />
        )}
      </div>

      {/* Check-in (read-only) — only shown after first screening check-in */}
      {bg.todayFeeling && (
        <div className="rounded-2xl border border-border bg-surface p-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-faint-foreground">
            Last Check-in
          </p>
          <InfoRow label="Focus"        value={`${bg.todayFeeling.focusLevel}/5 — ${FOCUS_LABELS[bg.todayFeeling.focusLevel]}`} />
          <InfoRow label="Energy"       value={`${bg.todayFeeling.energyLevel}/5 — ${ENERGY_LABELS[bg.todayFeeling.energyLevel]}`} />
          <InfoRow label="Mood"         value={`${bg.todayFeeling.moodLevel}/5 — ${MOOD_LABELS[bg.todayFeeling.moodLevel]}`} />
          <InfoRow label="Calm"         value={`${bg.todayFeeling.calmLevel}/5 — ${CALM_LABELS[bg.todayFeeling.calmLevel]}`} />
          <InfoRow label="Well rested"  value={bg.todayFeeling.wellRested  ? "Yes" : "No"} />
          <InfoRow label="Had caffeine" value={bg.todayFeeling.hadCaffeine ? "Yes" : "No"} />
          <InfoRow label="Had alcohol"  value={bg.todayFeeling.hadAlcohol  ? "Yes" : "No"} />
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const [latestScreening, setLatestScreening] = useState<ScreeningRecord | null>(null);

  useEffect(() => {
    if (!isLoading && user === null) router.replace("/");
  }, [isLoading, user, router]);

  useEffect(() => {
    if (user) setLatestScreening(readLatestScreening(user.id));
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) return null;

  return (
    <PageContainer>
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-foreground">My Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your background information and latest assessment.
        </p>
      </div>

      <div className="flex flex-col gap-10">
        {/* ── Background ──────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <h2 className="font-serif text-2xl font-bold text-foreground">Background</h2>
          <BackgroundSection />
        </section>

        {/* ── Latest Assessment ────────────────────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl font-bold text-foreground">Latest Assessment</h2>
            <a href="/screening" className="text-xs font-medium text-primary underline-offset-2 hover:underline">
              Retake →
            </a>
          </div>

          {!latestScreening ? (
            <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-muted-foreground">
              No assessment completed yet.{" "}
              <a href="/screening" className="font-medium text-primary underline-offset-2 hover:underline">
                Take the screening →
              </a>
            </div>
          ) : (
            <ScreeningPanel record={latestScreening} />
          )}
        </section>
      </div>
    </PageContainer>
  );
}
