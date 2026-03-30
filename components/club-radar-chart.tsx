"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SessionSummary, MetricKey, METRIC_CONFIG } from "@/lib/types";

const RADAR_METRICS: MetricKey[] = [
  "avgClubSpeed",
  "avgBallSpeed",
  "avgSmashFactor",
  "avgCarryDistance",
  "avgTotalDistance",
  "avgCarryDeviation",
];

const COLORS = [
  "hsl(152, 60%, 40%)",
  "hsl(200, 70%, 50%)",
  "hsl(30, 80%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(350, 65%, 55%)",
  "hsl(170, 55%, 45%)",
];

interface ClubRadarChartProps {
  summaries: SessionSummary[];
  clubs: string[];
}

export function ClubRadarChart({ summaries, clubs }: ClubRadarChartProps) {
  const clubAverages = new Map<string, Map<MetricKey, number>>();

  for (const club of clubs) {
    const clubSummaries = summaries.filter((s) => s.clubType === club);
    if (clubSummaries.length === 0) continue;
    const avgs = new Map<MetricKey, number>();
    for (const metric of RADAR_METRICS) {
      const vals = clubSummaries
        .map((s) => s[metric] as number | null)
        .filter((v): v is number => v !== null);
      if (vals.length > 0) {
        avgs.set(metric, vals.reduce((a, b) => a + b, 0) / vals.length);
      }
    }
    clubAverages.set(club, avgs);
  }

  const ranges = new Map<MetricKey, { min: number; max: number }>();
  for (const metric of RADAR_METRICS) {
    let min = Infinity;
    let max = -Infinity;
    for (const avgs of clubAverages.values()) {
      const v = avgs.get(metric);
      if (v !== undefined) {
        min = Math.min(min, v);
        max = Math.max(max, v);
      }
    }
    if (min !== Infinity) ranges.set(metric, { min, max });
  }

  const data = RADAR_METRICS.map((metric) => {
    const config = METRIC_CONFIG[metric];
    const row: Record<string, string | number> = { metric: config.label.replace("Avg ", "") };
    const range = ranges.get(metric);
    for (const club of clubs) {
      const avgs = clubAverages.get(club);
      const raw = avgs?.get(metric);
      if (raw !== undefined && range && range.max !== range.min) {
        let normalized = ((raw - range.min) / (range.max - range.min)) * 100;
        if (metric === "avgCarryDeviation") normalized = 100 - normalized;
        row[club] = Math.round(normalized);
      } else if (raw !== undefined) {
        row[club] = 50;
      }
    }
    return row;
  });

  const activeClubs = clubs.filter((c) => clubAverages.has(c));

  if (activeClubs.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Club Comparison Radar</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} outerRadius="75%">
              <PolarGrid className="stroke-muted" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis tick={false} domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              {activeClubs.map((club, i) => (
                <Radar
                  key={club}
                  name={club}
                  dataKey={club}
                  stroke={COLORS[i % COLORS.length]}
                  fill={COLORS[i % COLORS.length]}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              ))}
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-3 mt-2 justify-center">
          {activeClubs.map((club, i) => (
            <div key={club} className="flex items-center gap-1.5 text-xs">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              {club}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
