"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SessionSummary } from "@/lib/types";
import { Brain, TrendingDown, TrendingUp, Minus, ChevronRight } from "lucide-react";

interface Issue {
  rank: number;
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  score: number;
  currentValue: string;
  targetRange: string;
  drill: string;
  drillDescription: string;
  focusMetric: string;
  direction: "too-high" | "too-low" | "off-target";
}

interface Props {
  summaries: SessionSummary[];
}

function avg(vals: (number | null)[]): number | null {
  const v = vals.filter((x): x is number => x !== null);
  if (!v.length) return null;
  return v.reduce((a, b) => a + b, 0) / v.length;
}

function avgAbs(vals: (number | null)[]): number | null {
  const v = vals.filter((x): x is number => x !== null);
  if (!v.length) return null;
  return v.reduce((a, b) => a + Math.abs(b), 0) / v.length;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function analyzeIssues(summaries: SessionSummary[]): Issue[] {
  if (!summaries.length) return [];

  const avgClubPath = avg(summaries.map((s) => s.avgClubPath));
  const avgSmashFactor = avg(summaries.map((s) => s.avgSmashFactor));
  const avgCarryDev = avg(summaries.map((s) => s.avgCarryDeviation));
  const avgAttack = avg(summaries.map((s) => s.avgAttackAngle));
  const avgLaunch = avg(summaries.map((s) => s.avgLaunchAngle));
  const avgSpin = avg(summaries.map((s) => s.avgSpinRate));
  const avgFaceToPath = avgAbs(summaries.map((s) => s.avgClubFace).map((f, i) => {
    const cp = summaries[i].avgClubPath;
    if (f === null || cp === null) return null;
    return f - cp;
  }));

  const rawClubPathVal = avg(summaries.map((s) => s.avgClubPath));
  const rawFaceVal = avg(summaries.map((s) => s.avgClubFace));
  const faceToPathActual = rawFaceVal !== null && rawClubPathVal !== null ? rawFaceVal - rawClubPathVal : null;

  const issues: Issue[] = [];

  if (avgClubPath !== null) {
    const deviation = Math.abs(avgClubPath);
    const score = clamp(deviation / 5, 0, 1);
    if (score > 0.1) {
      const isOut = avgClubPath < 0;
      issues.push({
        rank: 0,
        title: isOut ? "Out-to-In Swing Path" : "In-to-Out Swing Path",
        description: `Avg club path is ${avgClubPath > 0 ? "+" : ""}${avgClubPath.toFixed(1)}°. A neutral path (±2°) produces straighter shots with less side spin.`,
        severity: score > 0.6 ? "high" : score > 0.3 ? "medium" : "low",
        score,
        currentValue: `${avgClubPath > 0 ? "+" : ""}${avgClubPath.toFixed(1)}°`,
        targetRange: "−2° to +2°",
        drill: "Gate Drill",
        drillDescription: "Set two alignment sticks or tees on either side of the ball 6\" apart, angled slightly toward the target. Swing without hitting the gates. Promotes an on-plane path.",
        focusMetric: "Club Path",
        direction: avgClubPath < 0 ? "too-low" : "too-high",
      });
    }
  }

  if (faceToPathActual !== null) {
    const deviation = Math.abs(faceToPathActual);
    const score = clamp(deviation / 6, 0, 1);
    if (score > 0.1) {
      const isOpen = faceToPathActual > 0;
      issues.push({
        rank: 0,
        title: isOpen ? "Open Face at Impact" : "Closed Face at Impact",
        description: `Face is ${Math.abs(faceToPathActual).toFixed(1)}° ${isOpen ? "open" : "closed"} relative to your path. This creates ${isOpen ? "a fade/slice" : "a draw/hook"} bias.`,
        severity: score > 0.6 ? "high" : score > 0.3 ? "medium" : "low",
        score,
        currentValue: `${faceToPathActual > 0 ? "+" : ""}${faceToPathActual.toFixed(1)}°`,
        targetRange: "−1° to +1°",
        drill: isOpen ? "Grip Pressure Release Drill" : "Impact Bag Drill",
        drillDescription: isOpen
          ? "Soften grip pressure (3/10) in your trail hand through impact. Practice slow-motion swings focusing on rotating the forearms through the hitting zone. Check face angle at address."
          : "Hit slow, deliberate swings into an impact bag, concentrating on arriving at a square clubface. Feel your hands staying ahead of the clubhead through the strike.",
        focusMetric: "Club Face Angle",
        direction: isOpen ? "too-high" : "too-low",
      });
    }
  }

  if (avgSmashFactor !== null) {
    const deficit = 1.48 - avgSmashFactor;
    const score = clamp(deficit / 0.12, 0, 1);
    if (score > 0.1) {
      issues.push({
        rank: 0,
        title: "Low Smash Factor (Off-Center Contact)",
        description: `Avg smash factor is ${avgSmashFactor.toFixed(3)}. A higher smash factor means more ball speed per unit of club speed — the hallmark of center contact.`,
        severity: score > 0.6 ? "high" : score > 0.3 ? "medium" : "low",
        score,
        currentValue: avgSmashFactor.toFixed(3),
        targetRange: "≥ 1.48",
        drill: "Impact Tape / Foot Spray Drill",
        drillDescription: "Apply foot spray or impact tape to the clubface before each swing. Identify the miss pattern (toe, heel, high, low) and make a single adjustment — ball position or posture — before the next shot.",
        focusMetric: "Smash Factor",
        direction: "too-low",
      });
    }
  }

  if (avgCarryDev !== null) {
    const score = clamp(avgCarryDev / 25, 0, 1);
    if (score > 0.15) {
      issues.push({
        rank: 0,
        title: "High Shot Dispersion",
        description: `Avg carry deviation is ${avgCarryDev.toFixed(1)} yds. Reducing dispersion improves consistency and scoring — aim for < 10 yds deviation on approach clubs.`,
        severity: score > 0.6 ? "high" : score > 0.35 ? "medium" : "low",
        score,
        currentValue: `${avgCarryDev.toFixed(1)} yds`,
        targetRange: "< 10 yds",
        drill: "Corridor Drill",
        drillDescription: "Lay two alignment sticks parallel to your target line, ~15 yds apart at the target distance. Every shot must land between them. Start wide (20 yds) and tighten the corridor as you improve.",
        focusMetric: "Carry Deviation Distance",
        direction: "too-high",
      });
    }
  }

  if (avgAttack !== null) {
    const score = clamp(Math.abs(avgAttack + 1) / 6, 0, 1);
    if (score > 0.2) {
      const isTooSteep = avgAttack < -5;
      issues.push({
        rank: 0,
        title: isTooSteep ? "Too Steep Attack Angle" : "Too Shallow Attack Angle",
        description: `Avg attack angle is ${avgAttack > 0 ? "+" : ""}${avgAttack.toFixed(1)}°. ${isTooSteep ? "Steep descents increase spin and reduce carry. Aim for -2° to -4° on irons." : "A very shallow/ascending strike can cause thin contact and lower launch on irons."}`,
        severity: score > 0.6 ? "high" : score > 0.3 ? "medium" : "low",
        score,
        currentValue: `${avgAttack > 0 ? "+" : ""}${avgAttack.toFixed(1)}°`,
        targetRange: isTooSteep ? "−2° to −4°" : "−2° to −4°",
        drill: isTooSteep ? "Towel Behind Ball Drill" : "Brush the Grass Drill",
        drillDescription: isTooSteep
          ? "Place a folded towel 2\" behind the ball. Swing without hitting the towel — forces a shallower approach. Focus on the club shallowing in transition."
          : "Without a ball, swing and try to brush the grass for 6\" before impact. Feel the club staying low through the hitting zone rather than lifting early.",
        focusMetric: "Attack Angle",
        direction: isTooSteep ? "too-low" : "too-high",
      });
    }
  }

  if (avgLaunch !== null && avgSpin !== null) {
    const highSpin = avgSpin > 3200;
    const lowLaunch = avgLaunch < 10;
    if (highSpin) {
      const spinScore = clamp((avgSpin - 3200) / 2000, 0, 1);
      issues.push({
        rank: 0,
        title: "Excessive Spin Rate",
        description: `Avg spin rate is ${Math.round(avgSpin)} rpm. High spin balloons the shot and costs distance. Ideal driver range is 2000–2800 rpm.`,
        severity: spinScore > 0.5 ? "high" : "medium",
        score: spinScore,
        currentValue: `${Math.round(avgSpin)} rpm`,
        targetRange: "2000–2800 rpm",
        drill: "Ball Position Forward Drill",
        drillDescription: "Move the ball one ball-width forward in your stance. For the driver, tee the ball higher and feel like you are sweeping up at the ball. This promotes a positive attack angle and reduces spin loft.",
        focusMetric: "Spin Rate",
        direction: "too-high",
      });
    }
    if (lowLaunch) {
      const launchScore = clamp((10 - avgLaunch) / 8, 0, 1);
      issues.push({
        rank: 0,
        title: "Low Launch Angle",
        description: `Avg launch angle is ${avgLaunch.toFixed(1)}°. A low launch reduces carry and results in a low, running ball flight. Target 12–15° with the driver.`,
        severity: launchScore > 0.5 ? "high" : "medium",
        score: launchScore,
        currentValue: `${avgLaunch.toFixed(1)}°`,
        targetRange: "12–15°",
        drill: "Tee Height & Stance Width Drill",
        drillDescription: "Tee the ball so the equator of the ball sits at the top of the driver face. Widen your stance slightly and tilt your spine away from the target at address to promote an ascending strike.",
        focusMetric: "Launch Angle",
        direction: "too-low",
      });
    }
  }

  issues.sort((a, b) => b.score - a.score);
  return issues.slice(0, 3).map((issue, i) => ({ ...issue, rank: i + 1 }));
}

const severityColors = {
  high: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800",
  medium: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
  low: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-400 dark:border-sky-800",
};

const severityBorder = {
  high: "border-l-red-500",
  medium: "border-l-amber-500",
  low: "border-l-sky-500",
};

const rankColors = [
  "bg-red-500",
  "bg-amber-500",
  "bg-sky-500",
];

function DirectionIcon({ direction }: { direction: Issue["direction"] }) {
  if (direction === "too-high") return <TrendingUp className="h-3 w-3" />;
  if (direction === "too-low") return <TrendingDown className="h-3 w-3" />;
  return <Minus className="h-3 w-3" />;
}

export function SessionCoach({ summaries }: Props) {
  const issues = useMemo(() => analyzeIssues(summaries), [summaries]);

  if (!summaries.length) return null;

  if (!issues.length) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Brain className="h-4 w-4 text-emerald-600" />
            Coach&apos;s Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No significant issues detected — metrics are within target ranges. Keep it up!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Brain className="h-4 w-4 text-emerald-600" />
            Coach&apos;s Report
          </CardTitle>
          <span className="text-[10px] text-muted-foreground">Top {issues.length} issues to fix</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {issues.map((issue) => (
          <div
            key={issue.rank}
            className={`rounded-lg border border-l-4 ${severityBorder[issue.severity]} bg-card p-3 space-y-2`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`flex-shrink-0 w-5 h-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center ${rankColors[issue.rank - 1]}`}>
                  {issue.rank}
                </span>
                <span className="text-sm font-medium leading-snug">{issue.title}</span>
              </div>
              <Badge variant="outline" className={`flex-shrink-0 text-[10px] capitalize ${severityColors[issue.severity]}`}>
                {issue.severity}
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed pl-7">{issue.description}</p>

            <div className="pl-7 flex flex-wrap gap-2 text-[11px]">
              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5">
                <DirectionIcon direction={issue.direction} />
                Now: <strong>{issue.currentValue}</strong>
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 px-2 py-0.5">
                Target: <strong>{issue.targetRange}</strong>
              </span>
            </div>

            <div className="pl-7 mt-1 rounded-md bg-muted/60 p-2 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                <ChevronRight className="h-3 w-3 text-emerald-600" />
                Drill: {issue.drill}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{issue.drillDescription}</p>
              <div className="pt-0.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 text-white text-[10px] font-medium px-2 py-0.5">
                  Focus metric: {issue.focusMetric}
                </span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
