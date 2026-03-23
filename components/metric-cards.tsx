"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SessionSummary, MetricKey, METRIC_CONFIG } from "@/lib/types";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardsProps {
  summaries: SessionSummary[];
  selectedMetrics: MetricKey[];
}

function getTrend(summaries: SessionSummary[], metric: MetricKey): { delta: number | null; direction: "up" | "down" | "flat" } {
  if (summaries.length < 2) return { delta: null, direction: "flat" };
  const last = summaries[summaries.length - 1][metric] as number | null;
  const prev = summaries[summaries.length - 2][metric] as number | null;
  if (last === null || prev === null) return { delta: null, direction: "flat" };
  const delta = last - prev;
  if (Math.abs(delta) < 0.01) return { delta: 0, direction: "flat" };
  return { delta, direction: delta > 0 ? "up" : "down" };
}

function getLatestValue(summaries: SessionSummary[], metric: MetricKey): number | null {
  if (summaries.length === 0) return null;
  return summaries[summaries.length - 1][metric] as number | null;
}

export function MetricCards({ summaries, selectedMetrics }: MetricCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
      {selectedMetrics.map((metric) => {
        const config = METRIC_CONFIG[metric];
        const value = getLatestValue(summaries, metric);
        const trend = getTrend(summaries, metric);
        const isGood =
          trend.direction === "flat"
            ? null
            : config.higherIsBetter
              ? trend.direction === "up"
              : metric === "avgCarryDeviation" || metric === "avgTotalDeviation"
                ? trend.direction === "down"
                : null;

        return (
          <Card key={metric} className="relative overflow-hidden">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {config.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold tabular-nums">
                  {value !== null ? value.toFixed(config.decimals) : "—"}
                </span>
                {config.unit && (
                  <span className="text-xs text-muted-foreground mb-1">{config.unit}</span>
                )}
              </div>
              {trend.delta !== null && (
                <div className="flex items-center gap-1 mt-1">
                  {trend.direction === "up" && <TrendingUp className="h-3 w-3" />}
                  {trend.direction === "down" && <TrendingDown className="h-3 w-3" />}
                  {trend.direction === "flat" && <Minus className="h-3 w-3" />}
                  <Badge
                    variant="secondary"
                    className={`text-[10px] px-1.5 py-0 ${
                      isGood === true
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                        : isGood === false
                          ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                          : ""
                    }`}
                  >
                    {trend.delta > 0 ? "+" : ""}
                    {trend.delta.toFixed(config.decimals)}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
