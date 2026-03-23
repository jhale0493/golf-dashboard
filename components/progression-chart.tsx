"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SessionSummary, MetricKey, METRIC_CONFIG } from "@/lib/types";

interface ProgressionChartProps {
  summaries: SessionSummary[];
  metric: MetricKey;
}

const COLORS = [
  "hsl(152, 60%, 40%)",
  "hsl(200, 70%, 50%)",
  "hsl(30, 80%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(350, 65%, 55%)",
  "hsl(170, 55%, 45%)",
];

export function ProgressionChart({ summaries, metric }: ProgressionChartProps) {
  const config = METRIC_CONFIG[metric];

  const data = summaries.map((s) => ({
    session: s.sessionDate,
    value: s[metric] as number | null,
    shots: s.shotCount,
  }));

  const values = data.map((d) => d.value).filter((v): v is number => v !== null);
  const avgValue = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          {config.label}
          {config.unit && <span className="text-muted-foreground ml-1">({config.unit})</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="session"
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                domain={["auto", "auto"]}
                tickFormatter={(v) => v.toFixed(config.decimals > 1 ? 1 : 0)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number) => [
                  `${value.toFixed(config.decimals)} ${config.unit}`,
                  config.label,
                ]}
              />
              <ReferenceLine
                y={avgValue}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="4 4"
                strokeOpacity={0.5}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={COLORS[0]}
                strokeWidth={2.5}
                dot={{ r: 4, fill: COLORS[0], strokeWidth: 2, stroke: "white" }}
                activeDot={{ r: 6 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

interface MultiClubChartProps {
  summaries: SessionSummary[];
  metric: MetricKey;
  clubs: string[];
}

export function MultiClubChart({ summaries, metric, clubs }: MultiClubChartProps) {
  const config = METRIC_CONFIG[metric];

  const sessions = [...new Set(summaries.map((s) => s.sessionDate))];
  sessions.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  const data = sessions.map((session) => {
    const row: Record<string, string | number | null> = { session };
    for (const club of clubs) {
      const match = summaries.find((s) => s.sessionDate === session && s.clubType === club);
      row[club] = match ? (match[metric] as number | null) : null;
    }
    return row;
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          {config.label} by Club
          {config.unit && <span className="text-muted-foreground ml-1">({config.unit})</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="session" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                domain={["auto", "auto"]}
                tickFormatter={(v) => v.toFixed(config.decimals > 1 ? 1 : 0)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number, name: string) => [
                  `${value?.toFixed(config.decimals)} ${config.unit}`,
                  name,
                ]}
              />
              {clubs.map((club, i) => (
                <Line
                  key={club}
                  type="monotone"
                  dataKey={club}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3, fill: COLORS[i % COLORS.length], strokeWidth: 2, stroke: "white" }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-3 mt-2 justify-center">
          {clubs.map((club, i) => (
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
