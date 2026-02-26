"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import type { Gender, AgeRange, Ethnicity, UserBackground } from "@/types";

// ─── Pill (single-select) ─────────────────────────────────────────────────────

function Pill({
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
        "rounded-full border px-4 py-2 text-sm font-medium transition-all",
        selected
          ? "border-primary bg-primary text-white shadow-sm"
          : "border-border bg-surface text-foreground hover:border-primary/60 hover:bg-primary/5",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

// ─── Yes / No ─────────────────────────────────────────────────────────────────

function YesNo({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex gap-3">
      <Pill label="Yes" selected={value === true} onClick={() => onChange(true)} />
      <Pill label="No" selected={value === false} onClick={() => onChange(false)} />
    </div>
  );
}

// ─── Question wrapper ─────────────────────────────────────────────────────────

function Question({
  heading,
  subheading,
  children,
}: {
  heading: string;
  subheading?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-serif text-2xl font-bold leading-snug text-foreground">
          {heading}
        </h2>
        {subheading && (
          <p className="mt-1 text-sm text-muted-foreground">{subheading}</p>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// Steps: 1=gender 2=age 3=ethnicity 4=ADHD 5=ASD 6=depression 7=medication(conditional)
const TOTAL_STEPS_BASE = 6;

export default function BackgroundPage() {
  const { user, isLoading, saveBackground } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace("/"); return; }
    if (!user.hasConsented) { router.replace("/consent"); return; }
    if (user.hasBackground) { router.replace("/screening"); }
  }, [isLoading, user, router]);

  const [step, setStep] = useState(1);
  const [gender, setGender] = useState<Gender | null>(null);
  const [ageRange, setAgeRange] = useState<AgeRange | null>(null);
  const [ethnicity, setEthnicity] = useState<Ethnicity | null>(null);
  const [diagnosedADHD, setDiagnosedADHD] = useState<boolean | null>(null);
  const [diagnosedASD, setDiagnosedASD] = useState<boolean | null>(null);
  const [diagnosedDepAnx, setDiagnosedDepAnx] = useState<boolean | null>(null);
  const [takesMedication, setTakesMedication] = useState<boolean | null>(null);

  const hasMedStep = diagnosedDepAnx === true;
  const totalSteps = hasMedStep ? TOTAL_STEPS_BASE + 1 : TOTAL_STEPS_BASE;
  const isMedStep = hasMedStep && step === 7;
  const isLastStep = step === totalSteps;

  function stepValid() {
    if (step === 1) return gender !== null;
    if (step === 2) return ageRange !== null;
    if (step === 3) return ethnicity !== null;
    if (step === 4) return diagnosedADHD !== null;
    if (step === 5) return diagnosedASD !== null;
    if (step === 6) return diagnosedDepAnx !== null;
    if (isMedStep) return takesMedication !== null;
    return true;
  }

  function handleNext() {
    if (!stepValid()) return;
    if (step === 6 && !diagnosedDepAnx) {
      setTakesMedication(null);
      handleSubmit();
      return;
    }
    if (isLastStep) {
      handleSubmit();
      return;
    }
    setStep((s) => s + 1);
  }

  function handleBack() {
    if (step === 1) return;
    setStep((s) => s - 1);
  }

  function handleSubmit() {
    if (!gender || !ageRange || !ethnicity || diagnosedADHD === null || diagnosedASD === null || diagnosedDepAnx === null) return;
    const bg: UserBackground = {
      gender,
      ageRange,
      ethnicity,
      diagnosedADHD,
      diagnosedASD,
      diagnosedDepressionAnxiety: diagnosedDepAnx,
      takesMedication: diagnosedDepAnx ? (takesMedication ?? false) : null,
      // todayFeeling is captured separately before each screening session
    };
    saveBackground(bg);
    router.push("/screening");
  }

  if (isLoading || !user || !user.hasConsented || user.hasBackground) return null;

  const progress = Math.round((step / totalSteps) * 100);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-xl flex-col px-4 py-10">
      {/* Progress */}
      <div className="mb-8">
        <p className="mb-1 text-xs font-medium uppercase tracking-widest text-faint-foreground">
          Step {step} of {totalSteps}
        </p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Questions */}
      <div className="flex flex-1 flex-col gap-8">
        {step === 1 && (
          <Question heading="What is your gender?">
            <div className="flex flex-wrap gap-3">
              {([
                ["male", "Male"],
                ["female", "Female"],
                ["non-binary", "Non-binary / Two-spirit"],
                ["prefer-not-to-say", "Prefer not to say"],
              ] as [Gender, string][]).map(([val, label]) => (
                <Pill key={val} label={label} selected={gender === val} onClick={() => setGender(val)} />
              ))}
            </div>
          </Question>
        )}

        {step === 2 && (
          <Question heading="What is your age range?">
            <div className="flex flex-wrap gap-3">
              {(["18-25", "26-35", "36-45", "46-55", "56-65", "65+"] as AgeRange[]).map((val) => (
                <Pill key={val} label={val} selected={ageRange === val} onClick={() => setAgeRange(val)} />
              ))}
            </div>
          </Question>
        )}

        {step === 3 && (
          <Question heading="How would you describe your race or ethnicity?">
            <div className="flex flex-wrap gap-3">
              {([
                ["white", "White"],
                ["black", "Black or African American"],
                ["two-or-more", "Two or more races"],
                ["south-asian", "South Asian"],
                ["hispanic-latino", "Hispanic or Latino"],
                ["asian", "Asian"],
                ["pacific-islander", "Pacific Islander"],
                ["prefer-not-to-say", "Prefer not to say"],
              ] as [Ethnicity, string][]).map(([val, label]) => (
                <Pill key={val} label={label} selected={ethnicity === val} onClick={() => setEthnicity(val)} />
              ))}
            </div>
          </Question>
        )}

        {step === 4 && (
          <Question heading="Have you ever been diagnosed with ADHD?">
            <YesNo value={diagnosedADHD} onChange={setDiagnosedADHD} />
          </Question>
        )}

        {step === 5 && (
          <Question heading="Have you ever been diagnosed with Autism Spectrum Disorder (ASD)?">
            <YesNo value={diagnosedASD} onChange={setDiagnosedASD} />
          </Question>
        )}

        {step === 6 && (
          <Question heading="Have you been diagnosed with depression or anxiety?">
            <YesNo value={diagnosedDepAnx} onChange={setDiagnosedDepAnx} />
          </Question>
        )}

        {isMedStep && (
          <Question heading="Do you currently take medication for depression or anxiety?">
            <YesNo value={takesMedication} onChange={setTakesMedication} />
          </Question>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-10 flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          disabled={step === 1}
          className="text-sm font-medium text-muted-foreground underline-offset-2 hover:underline disabled:invisible"
        >
          Back
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={!stepValid()}
          className={[
            "rounded-xl px-8 py-3 text-base font-semibold text-white shadow-sm transition-all",
            stepValid()
              ? "bg-primary hover:bg-primary-600 active:scale-[0.98]"
              : "cursor-not-allowed bg-primary/30",
          ].join(" ")}
        >
          {isLastStep ? "Continue to Check-in" : "Next"}
        </button>
      </div>
    </div>
  );
}
