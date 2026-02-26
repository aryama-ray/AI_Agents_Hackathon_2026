"use client";

import { useState, useCallback, useRef } from "react";
import { useUser } from "@/hooks/useUser";
import { ASRS_QUESTIONS, ANSWER_OPTIONS, type Question } from "@/lib/screeningData";
import { saveScreeningRecord } from "@/lib/screeningStore";
import api from "@/lib/api";

export type Phase = "idle" | "questioning" | "evaluating" | "complete";

export interface ScreeningAnswer {
  questionId: string;
  questionText: string;
  score: number;
  answerLabel: string;
}

export interface ScreeningResult {
  dimensions: Record<string, number>;
  tags: string[];
  summary: string;
}

// ─── Local fallback scorer (used when backend is unavailable) ─────────────────

function computeLocally(answers: ScreeningAnswer[]): ScreeningResult {
  const buckets: Record<string, number[]> = {};

  answers.forEach((a, i) => {
    const dim = ASRS_QUESTIONS[i].dimension;
    buckets[dim] = [...(buckets[dim] ?? []), a.score];
  });

  const dimensions: Record<string, number> = {};
  for (const [dim, scores] of Object.entries(buckets)) {
    const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
    dimensions[dim] = Math.round((avg / 4) * 100);
  }

  const tags: string[] = [];
  if ((dimensions["Focus"] ?? 0) >= 50) tags.push("Focus Challenges");
  if ((dimensions["Organisation"] ?? 0) >= 50) tags.push("Needs Structure");
  if ((dimensions["Working Memory"] ?? 0) >= 50) tags.push("Memory Support");
  if ((dimensions["Hyperactivity"] ?? 0) >= 50) tags.push("High Energy");
  if ((dimensions["Impulsivity"] ?? 0) >= 50) tags.push("Acts Impulsively");
  if ((dimensions["Emotional Regulation"] ?? 0) >= 50) tags.push("Emotionally Sensitive");
  if (tags.length === 0) tags.push("Well-Balanced");

  const highDims = Object.entries(dimensions)
    .filter(([, v]) => v >= 50)
    .map(([k]) => k.toLowerCase());

  const summary =
    highDims.length === 0
      ? "Your responses suggest strong executive function across all areas. Your plan will focus on maintaining these strengths."
      : `Your responses highlight some challenges with ${highDims.join(", ")}. Your daily plan will gently support these areas — one clear step at a time.`;

  return { dimensions, tags, summary };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseScreeningChatReturn {
  phase: Phase;
  currentIndex: number;
  answers: ScreeningAnswer[];
  result: ScreeningResult | null;
  error: string | null;
  totalQuestions: number;
  currentQuestion: Question;
  startScreening: () => void;
  submitAnswer: (score: number) => void;
}

export function useScreeningChat(): UseScreeningChatReturn {
  const { user, markProfileComplete } = useUser();

  const [phase, setPhase] = useState<Phase>("idle");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<ScreeningAnswer[]>([]);
  const [result, setResult] = useState<ScreeningResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submittingRef = useRef(false);

  function startScreening() {
    setAnswers([]);
    setCurrentIndex(0);
    setError(null);
    setResult(null);
    setPhase("questioning");
    submittingRef.current = false;
  }

  const submitAnswer = useCallback(
    (score: number) => {
      if (submittingRef.current) return;
      submittingRef.current = true;

      const question = ASRS_QUESTIONS[currentIndex];
      const option =
        ANSWER_OPTIONS.find((o) => o.score === score) ?? ANSWER_OPTIONS[0];

      const newAnswer: ScreeningAnswer = {
        questionId: question.id,
        questionText: question.text,
        score,
        answerLabel: option.label,
      };

      const newAnswers = [...answers, newAnswer];
      setAnswers(newAnswers);

      const isLast = currentIndex === ASRS_QUESTIONS.length - 1;

      setTimeout(async () => {
        if (!isLast) {
          setCurrentIndex((i) => i + 1);
          submittingRef.current = false;
          return;
        }

        setPhase("evaluating");

        let evalResult: ScreeningResult;
        try {
          const res = await api.post<ScreeningResult>("/screening/evaluate", {
            userId: user?.id ?? "guest",
            answers: newAnswers,
          });
          evalResult = res.data;
        } catch {
          // Backend not available — compute client-side
          evalResult = computeLocally(newAnswers);
        }

        setResult(evalResult);

        // Persist result with per-question detail for the profile page
        saveScreeningRecord(user?.id ?? "guest", {
          dimensions: evalResult.dimensions,
          tags: evalResult.tags,
          summary: evalResult.summary,
          answers: newAnswers.map((a, i) => ({
            ...a,
            dimension: ASRS_QUESTIONS[i]?.dimension ?? "",
          })),
        });

        markProfileComplete();
        setPhase("complete");
      }, 500);
    },
    [currentIndex, answers, user, markProfileComplete]
  );

  return {
    phase,
    currentIndex,
    answers,
    result,
    error,
    totalQuestions: ASRS_QUESTIONS.length,
    currentQuestion: ASRS_QUESTIONS[currentIndex],
    startScreening,
    submitAnswer,
  };
}
