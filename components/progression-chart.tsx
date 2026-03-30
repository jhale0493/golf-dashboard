"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SessionSummary, MetricKey, METRIC_CONFIG } from "@/lib/types";
import { Target } from "lucide-react";

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

const TARGET_ZONES: Record<string, { y1: number; y2?: number; label: string }> = {
  avgClubPath: { y1: -2, y2: 2, label: "-2\u00b0 to 2\u00b0" },
  avgLaunchAngle: { y1: 12, y2: 15, label: "12\u00b0 to 15\u00b0" },
  avgAttackAngle: { y1: 3, y2: 5, label: "3\u00b0 to 5\u00b0" },
  avgSmashFactor: { y1: 1.5, label: "1.50" },
};

export function ProgressionChart({ summaries, metric }: ProgressionChartProps) {
  const config = METRIC_CONFIG[metric];
  const [goalInput, setGoalInput] = useState("");
  const [goalValue, setGoalValue] = useState<number | null>(null);
  const [showGoalInput, setShowGoalInput] = useState(false);

  const data = summaries.map((s) => ({
    session: s.sessionDate,
    value: s[metric] as number | null,
    shots: s.shotCount,
  }));

  const values = data.map((d) => d.value).filter((v): v is number => v !== null);
  const avgValue = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;

  const target = TARGET_ZONES[metric];
  const isRange = target && "y2" in target && target.y2 !== undefined;
  let yDomain: [number | string, number | string] = ["auto", "auto"];
  if (target && values.length > 0) {
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const tLow = target.y1;
    const tHigh = isRange ? target.y2! : target.y1;
    const gLow = goalValue !== null ? goalValue : Infinity;
    const gHigh = goalValue !== null ? goalValue : -Infinity;
    yDomain = [
      Math.min(minVal - 1, tLow - 1, gLow - 1),
      Math.max(maxVal + 1, tHigh + 1, gHigh + 1),
    ];
  } else if (goalValue !== null && values.length > 0) {
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    yDomain = [
      Math.min(minVal - 1, goalValue - 1),
      Math.max(maxVal + 1, goalValue + 1),
    ];
  }

  const handleGoalSubmit = () => {
    const v = parseFloat(goalInput);
    if (!isNaN(v)) {
      setGoalValue(v);
    } else {
      setGoalValue(null);
    }
    setShowGoalInput(false);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            {config.label}
            {config.unit && <span className="text-muted-foreground ml-1">({config.unit})</span>}
            {target && <span className="text-emerald-600 ml-2 text-[10px] font-normal">Target: {target.label}</span>}
            {goalValue !== null && <span className="text-blue-500 ml-2 text-[10px] font-normal">Goal: {goalValue}</span>}
          </CardTitle>
          <button
            onClick={() => setShowGoalInput(!showGoalInput)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Set goal line"
          >
            <Target className="h-3.5 w-3.5" />
          </button>
        </div>
        {showGoalInput && (
          <div className="flex items-center gap-2 mt-1">
            <input
              type="number"
              step="any"
              placeholder={`Goal ${config.unit || ""}`}
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleGoalSubmit(); }}
              className="h-6 w-24 rounded border border-input bg-background px-2 text-[10px] outline-none focus:ring-1 focus:ring-ring"
              autoFocus
            />
            <button onClick={handleGoalSubmit} className="text-[10px] text-blue-500 hover:text-blue-700">Set</button>
            {goalValue !== null && (
              <button onClick={() => { setGoalValue(null); setGoalInput(""); setShowGoalInput(false); }} className="text-[10px] text-muted-foreground hover:text-foreground">Clear</button>
            )}
          </div>
        )}
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
                domain={yDomain as [number, number]}
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
              {target && isRange && (
                <ReferenceArea
                  y1={target.y1}
                  y2={target.y2!}
                  fill="hsl(152, 60%, 40%)"
                  fillOpacity={0.1}
                  stroke="hsl(152, 60%, 40%)"
                  strokeOpacity={0.3}
                  strokeDasharray="3 3"
                />
              )}
              {target && !isRange && (
                <ReferenceLine
                  y={target.y1}
                  stroke="hsl(152, 60%, 40%)"
                  strokeDasharray="6 3"
                  strokeOpacity={0.6}
                  label={{ value: target.label, position: "right", fontSize: 10, fill: "hsl(152, 60%, 40%)" }}
                />
              )}
              {target && isRange && metric === "avgClubPath" && (
                <ReferenceLine y={0} stroke="hsl(152, 60%, 40%)" strokeOpacity={0.4} />
              )}
              {goalValue !== null && (
                <ReferenceLine
                  y={goalValue}
                  stroke="hsl(210, 80%, 55%)"
                  strokeDasharray="8 4"
                  strokeWidth={2}
                  strokeOpacity={0.7}
                  label={{ value: `Goal: ${goalValue}`, position: "right", fontSize: 10, fill: "hsl(210, 80%, 55%)" }}
                />
              )}
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
