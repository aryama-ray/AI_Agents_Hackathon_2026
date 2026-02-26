"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceDot,
  ResponsiveContainer,
} from "recharts";
import Card from "@/components/ui/Card";
import type { TrendPoint, AgentAnnotation } from "@/types";

interface TrendChartProps {
  trend: TrendPoint[];
  annotations: AgentAnnotation[];
}

interface ChartPoint extends TrendPoint {
  moodScaled: number;
  label?: string;
  annotationType?: AgentAnnotation["type"];
}

export default function TrendChart({ trend, annotations }: TrendChartProps) {
  const annotationMap = new Map(annotations.map((a) => [a.date, a]));

  const data: ChartPoint[] = trend.map((t) => {
    const ann = annotationMap.get(t.date);
    return {
      ...t,
      moodScaled: t.moodScore * 10,
      label: ann?.label,
      annotationType: ann?.type,
    };
  });

  // Format date labels as "Mon 12"
  function fmtDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" });
  }

  return (
    <Card padding="md" className="w-full">
      <p className="mb-4 text-xs font-medium uppercase tracking-widest text-faint-foreground">
        7-day Trend
      </p>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="date"
            tickFormatter={fmtDate}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any, name: any) => [
              `${value ?? 0}%`,
              name === "moodScaled" ? "Mood (scaled)" : "Completion",
            ]}
            labelFormatter={(label: unknown) => fmtDate(String(label))}
          />
          <Legend
            formatter={(value) =>
              value === "moodScaled" ? "Mood (scaled)" : "Completion %"
            }
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          />

          <Line
            type="monotone"
            dataKey="moodScaled"
            stroke="var(--color-primary)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive
          />
          <Line
            type="monotone"
            dataKey="completionRate"
            stroke="var(--color-secondary)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive
          />

          {/* Annotation dots */}
          {annotations.map((ann) => {
            const point = data.find((d) => d.date === ann.date);
            if (!point) return null;
            const fill =
              ann.type === "intervention"
                ? "#c94040"   // red
                : "#5f6ab4";  // violet
            return (
              <ReferenceDot
                key={ann.date + ann.type}
                x={ann.date}
                y={point.moodScaled}
                r={5}
                fill={fill}
                stroke="var(--color-surface)"
                strokeWidth={2}
                label={{
                  value: ann.label,
                  position: "top",
                  fontSize: 10,
                  fill,
                }}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>

      {/* Legend for annotations */}
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-error" />
          Intervention
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-secondary" />
          Pattern
        </span>
      </div>
    </Card>
  );
}
