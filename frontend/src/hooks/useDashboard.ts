"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchDashboard as fetchDashboardApi } from "@/lib/api";
import { readTrend } from "@/lib/trendStore";
import type { DashboardData, FeedbackHistoryItem } from "@/types";

export interface UseDashboardReturn {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
  feedbackHistory: FeedbackHistoryItem[];
  refresh: () => void;
}

export function useDashboard(userId: string | null): UseDashboardReturn {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackHistory, setFeedbackHistory] = useState<FeedbackHistoryItem[]>([]);

  const loadDashboard = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);

    try {
      // Try backend API first
      const res = await fetchDashboardApi(userId);

      // Map backend response to frontend DashboardData shape
      const trend = (res.trendData || []).map((t: { date: string; moodScore: number; completionRate: number }) => ({
        date: t.date,
        moodScore: t.moodScore,
        completionRate: t.completionRate,
      }));

      const annotations = (res.agentAnnotations || []).map(
        (a: { dayNumber: number; text: string; type: string }) => ({
          date: trend[a.dayNumber - 1]?.date || "",
          label: a.text,
          type: a.type as "intervention" | "pattern",
        })
      );

      const hypotheses = (res.hypothesisCards || []).map(
        (h: { id: string; patternDetected: string; confidence: string; status: string; supportingEvidence: Array<{ detail: string }> }) => ({
          id: h.id,
          statement: h.patternDetected,
          confidence: h.confidence as "high" | "medium" | "low",
          status: h.status as "testing" | "confirmed" | "rejected",
          evidence: (h.supportingEvidence || []).map(
            (e: { detail: string }) => e.detail
          ),
        })
      );

      setData({
        momentumScore: res.momentumScore,
        momentumDelta: res.momentumDelta,
        trend,
        annotations,
        hypotheses,
      });

      setFeedbackHistory(res.feedbackHistory || []);
    } catch {
      // Fallback to localStorage if backend is unavailable
      const trend = readTrend(userId);

      if (trend.length === 0) {
        setData(null);
        setIsLoading(false);
        return;
      }

      const scores = trend.map((t) => t.moodScore);
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const momentumScore = Math.round(avg * 10);

      let momentumDelta = 0;
      if (trend.length >= 2) {
        const half = Math.floor(trend.length / 2);
        const recent = trend.slice(half);
        const earlier = trend.slice(0, half);
        const recentAvg =
          recent.reduce((a, b) => a + b.moodScore, 0) / recent.length;
        const earlierAvg =
          earlier.reduce((a, b) => a + b.moodScore, 0) / earlier.length;
        momentumDelta = Math.round((recentAvg - earlierAvg) * 10);
      }

      setData({
        momentumScore,
        momentumDelta,
        trend,
        annotations: [],
        hypotheses: [],
      });

      setFeedbackHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return { data, isLoading, error, feedbackHistory, refresh: loadDashboard };
}
