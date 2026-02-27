"use client";

import { useState, useEffect } from "react";
import type { InterventionResponse } from "@/types";
import TaskCard from "@/components/plan/TaskCard";
import Button from "@/components/ui/Button";
import { submitInterventionFeedback } from "@/lib/api";

interface InterventionPanelProps {
  intervention: InterventionResponse;
  onClose: () => void;
}

export default function InterventionPanel({ intervention, onClose }: InterventionPanelProps) {
  // Typewriter for acknowledgment
  const [visibleText, setVisibleText] = useState("");
  const [typewriterDone, setTypewriterDone] = useState(false);

  useEffect(() => {
    const fullText = intervention.acknowledgment;
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setVisibleText(fullText.slice(0, i));
      if (i >= fullText.length) {
        clearInterval(timer);
        setTypewriterDone(true);
      }
    }, 25);
    return () => clearInterval(timer);
  }, [intervention.acknowledgment]);

  // Staggered reveal for restructured plan (2s after mount)
  const [showPlan, setShowPlan] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShowPlan(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Collapsible reasoning
  const [showReasoning, setShowReasoning] = useState(false);

  // Feedback
  const [showFeedback, setShowFeedback] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);

  async function handleSubmitFeedback() {
    if (rating === 0 || !intervention.interventionId) return;
    try {
      await submitInterventionFeedback(
        intervention.interventionId,
        rating,
        feedbackText || undefined,
      );
      setFeedbackSent(true);
    } catch {
      // Silently fail — feedback is optional
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 max-h-[80vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-surface p-8 shadow-lg">
        {/* Heading */}
        <h2 className="mb-4 font-serif text-xl font-semibold text-primary">
          Attune hears you
        </h2>

        {/* Typewriter acknowledgment */}
        <p className={[
          "text-foreground leading-relaxed",
          !typewriterDone ? "typewriter-caret" : "",
        ].join(" ")}>
          {visibleText}
        </p>

        {/* Restructured plan */}
        {showPlan && (
          <div className="mt-6 opacity-0 fade-in" style={{ animationFillMode: "forwards" }}>
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              Restructured Plan
            </h3>
            <div className="flex flex-col gap-3">
              {intervention.restructuredTasks.map((task, i) => (
                <TaskCard key={task.index} task={task} index={i} isNew />
              ))}
            </div>
          </div>
        )}

        {/* Agent reasoning (collapsible) */}
        {showPlan && (
          <div className="mt-4">
            <button
              onClick={() => setShowReasoning(!showReasoning)}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {showReasoning ? "Hide reasoning" : "Why these changes?"}
            </button>
            {showReasoning && (
              <p className="mt-2 text-sm italic text-faint-foreground">
                {intervention.agentReasoning}
              </p>
            )}
          </div>
        )}

        {/* Followup hint */}
        {intervention.followupHint && showPlan && (
          <p className="mt-3 text-xs text-faint-foreground">
            {intervention.followupHint}
          </p>
        )}

        {/* Feedback section */}
        {showPlan && !showFeedback && !feedbackSent && (
          <div className="mt-6 flex gap-3">
            <Button variant="primary" size="lg" onClick={() => setShowFeedback(true)} className="flex-1">
              Got it, let&apos;s go
            </Button>
          </div>
        )}

        {showFeedback && !feedbackSent && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">Was this intervention helpful?</p>
            <div className="mt-2 flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`text-2xl transition-colors ${
                    rating >= star ? "text-warning" : "text-faint-foreground"
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              placeholder="What would you change? (optional)"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              className="mt-2 w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground placeholder:text-faint-foreground focus:border-primary focus:outline-none"
              rows={2}
            />
            <div className="mt-3 flex gap-3">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Skip
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={async () => { await handleSubmitFeedback(); onClose(); }}
                disabled={rating === 0}
              >
                Send & Continue
              </Button>
            </div>
          </div>
        )}

        {feedbackSent && (
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">Thanks for your feedback!</p>
            <Button variant="primary" size="lg" onClick={onClose} className="mt-3 w-full">
              Got it, let&apos;s go
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
