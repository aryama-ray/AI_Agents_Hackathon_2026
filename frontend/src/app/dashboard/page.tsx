"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/hooks/useUser";
import { useDashboard } from "@/hooks/useDashboard";
import { readLatestScreening } from "@/lib/screeningStore";
import PageContainer from "@/components/layout/PageContainer";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import MomentumScore from "@/components/dashboard/MomentumScore";
import TrendChart from "@/components/dashboard/TrendChart";
import HypothesisCard from "@/components/dashboard/HypothesisCard";
import type { ScreeningRecord } from "@/types";

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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function DashboardPage() {
  const { user, isLoading: userLoading } = useUser();
  const router = useRouter();
  const [latestScreening, setLatestScreening] = useState<ScreeningRecord | null>(null);

  useEffect(() => {
    if (!userLoading && user === null) router.replace("/");
  }, [userLoading, user, router]);

  useEffect(() => {
    if (user) setLatestScreening(readLatestScreening(user.id));
  }, [user]);

  const { data, isLoading: dashLoading, feedbackHistory } = useDashboard(user?.id ?? null);

  if (userLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) return null;

  if (dashLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner label="Loading your dashboard…" />
      </div>
    );
  }

  // No data yet — user hasn't completed background questionnaire or just started
  if (!data) {
    return (
      <PageContainer>
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
          <p className="text-4xl">📊</p>
          <h2 className="font-serif text-2xl font-bold text-foreground">
            No data yet
          </h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Your dashboard will populate after you complete the background
            questionnaire. Each day you check in, your trend will grow.
          </p>
          {!user.hasBackground && (
            <Link
              href="/background"
              className="mt-2 rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600"
            >
              Complete questionnaire
            </Link>
          )}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Page heading */}
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold text-foreground">
          Your Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data.trend.length === 1
            ? `Today's snapshot, ${user.name}. Check back tomorrow to see your trend grow.`
            : `${data.trend.length} days tracked, ${user.name}.`}
        </p>
      </div>

      {/* ── Latest Assessment Panel ──────────────────────────────────────── */}
      {latestScreening && (
        <div className="mb-8 rounded-2xl border border-border bg-surface p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-faint-foreground">
                Latest Assessment
              </p>
              <p className="mt-0.5 text-sm font-medium text-foreground">
                Taken on {formatDate(latestScreening.date)}
              </p>
            </div>
            <Link
              href="/profile"
              className="text-xs font-medium text-primary underline-offset-2 hover:underline"
            >
              Full report →
            </Link>
          </div>

          {/* Summary */}
          <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
            {latestScreening.summary}
          </p>

          {/* Tags */}
          {latestScreening.tags.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-2">
              {latestScreening.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Dimension bars */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Object.entries(latestScreening.dimensions).map(([dim, score]) => (
              <div key={dim} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{dim}</span>
                  <span className="text-muted-foreground">
                    {scoreLabel(score)} · {score}%
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${scoreColor(score)}`}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column (2/3 width) */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <MomentumScore score={data.momentumScore} delta={data.momentumDelta} />
          <TrendChart trend={data.trend} annotations={data.annotations} />
        </div>

        {/* Right column (1/3 width) */}
        <div className="flex flex-col gap-4">
          <p className="text-xs font-medium uppercase tracking-widest text-faint-foreground">
            Agent Hypotheses
          </p>
          {data.hypotheses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Patterns will appear here as more data is collected.
            </p>
          ) : (
            data.hypotheses.map((h) => (
              <HypothesisCard key={h.id} hypothesis={h} />
            ))
          )}

          {/* Intervention Feedback History */}
          <p className="mt-4 text-xs font-medium uppercase tracking-widest text-faint-foreground">
            Your Intervention Feedback
          </p>
          {feedbackHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No intervention feedback yet.
            </p>
          ) : (
            <div className="space-y-2">
              {feedbackHistory.map((f) => (
                <div
                  key={f.id}
                  className="rounded-lg border border-border bg-surface p-3"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-warning">
                      {"★".repeat(f.rating)}
                      {"☆".repeat(5 - f.rating)}
                    </span>
                    <span className="text-faint-foreground text-xs">
                      {formatDate(f.date)}
                    </span>
                  </div>
                  {f.feedback && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {f.feedback}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
