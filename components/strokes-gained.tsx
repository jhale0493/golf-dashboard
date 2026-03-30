"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SessionSummary } from "@/lib/types";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const TOUR_BENCHMARKS: Record<string, { carry: number; deviation: number }> = {
  Driver: { carry: 275, deviation: 20 },
  "3 Wood": { carry: 243, deviation: 18 },
  "5 Wood": { carry: 230, deviation: 18 },
  "3 Hybrid": { carry: 220, deviation: 16 },
  "4 Hybrid": { carry: 210, deviation: 15 },
  "5 Iron": { carry: 200, deviation: 14 },
  "6 Iron": { carry: 190, deviation: 13 },
  "7 Iron": { carry: 175, deviation: 12 },
  "8 Iron": { carry: 163, deviation: 11 },
  "9 Iron": { carry: 150, deviation: 10 },
  PW: { carry: 137, deviation: 9 },
  "Sand Wedge": { carry: 115, deviation: 10 },
  SW: { carry: 115, deviation: 10 },
  LW: { carry: 100, deviation: 10 },
};

function computeSgScore(summary: SessionSummary): number | null {
  const benchmark = TOUR_BENCHMARKS[summary.clubType];
  if (!benchmark) return null;

  const carry = summary.avgCarryDistance;
  const deviation = summary.avgCarryDeviation;
  if (carry === null || deviation === null) return null;

  const distanceScore = ((carry / benchmark.carry) - 1) * 50;
  const accuracyScore = ((benchmark.deviation / Math.max(deviation, 1)) - 1) * 50;

  return Math.round((distanceScore + accuracyScore) * 10) / 10;
}

interface StrokesGainedProps {
  summaries: SessionSummary[];
}

export function StrokesGained({ summaries }: StrokesGainedProps) {
  if (summaries.length === 0) return null;

  const sessionScores = new Map<string, { total: number; count: number }>();
  for (const s of summaries) {
    const score = computeSgScore(s);
    if (score === null) continue;
    const existing = sessionScores.get(s.sessionDate) ?? { total: 0, count: 0 };
    existing.total += score;
    existing.count += 1;
    sessionScores.set(s.sessionDate, existing);
  }

  const sessions = [...sessionScores.entries()]
    .map(([date, { total, count }]) => ({ date, score: Math.round((total / count) * 10) / 10 }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (sessions.length === 0) return null;

  const latest = sessions[sessions.length - 1];
  const prev = sessions.length >= 2 ? sessions[sessions.length - 2] : null;
  const delta = prev ? Math.round((latest.score - prev.score) * 10) / 10 : null;
  const allScores = sessions.map((s) => s.score);
  const overallAvg = Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10;
  const best = Math.max(...allScores);
  const bestSession = sessions.find((s) => s.score === best);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Performance Index</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <p className="text-[10px] text-muted-foreground mb-3">
          Composite score based on distance vs. tour avg and accuracy. 0 = tour average.
        </p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Latest</div>
            <div className="flex items-end gap-2">
              <span className={`text-2xl font-bold tabular-nums ${latest.score >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {latest.score > 0 ? "+" : ""}{latest.score}
              </span>
            </div>
            {delta !== null && (
              <div className="flex items-center gap-1 mt-1">
                {delta > 0 ? <TrendingUp className="h-3 w-3 text-emerald-600" /> : delta < 0 ? <TrendingDown className="h-3 w-3 text-red-500" /> : <Minus className="h-3 w-3" />}
                <Badge
                  variant="secondary"
                  className={`text-[10px] px-1.5 py-0 ${delta > 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" : delta < 0 ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" : ""}`}
                >
                  {delta > 0 ? "+" : ""}{delta}
                </Badge>
              </div>
            )}
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Average</div>
            <span className={`text-2xl font-bold tabular-nums ${overallAvg >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {overallAvg > 0 ? "+" : ""}{overallAvg}
            </span>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Best</div>
            <span className="text-2xl font-bold tabular-nums text-emerald-600">
              {best > 0 ? "+" : ""}{best}
            </span>
            {bestSession && (
              <div className="text-[10px] text-muted-foreground mt-1">{bestSession.date}</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
