"use client";

import { useState, useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceArea,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { ShotData } from "@/lib/types";
import { Grid2X2, CircleDot } from "lucide-react";

const CLUB_COLORS = [
  "hsl(152, 60%, 40%)",
  "hsl(200, 70%, 50%)",
  "hsl(30, 80%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(350, 65%, 55%)",
  "hsl(170, 55%, 45%)",
  "hsl(45, 85%, 50%)",
  "hsl(320, 60%, 50%)",
  "hsl(100, 50%, 45%)",
  "hsl(220, 65%, 55%)",
];

const GRAY = "hsl(0, 0%, 75%)";

const DENSITY_COLORS = [
  "hsl(210, 80%, 60%)",
  "hsl(160, 70%, 50%)",
  "hsl(80, 70%, 50%)",
  "hsl(45, 90%, 55%)",
  "hsl(20, 90%, 55%)",
  "hsl(0, 85%, 55%)",
];

interface ShotDispersionProps {
  shots: ShotData[];
  clubs: string[];
}

export function ShotDispersion({ shots, clubs }: ShotDispersionProps) {
  const [activeClubs, setActiveClubs] = useState<Set<string> | null>(null);
  const [selectedSessionIdx, setSelectedSessionIdx] = useState<number | null>(null);
  const [showDensity, setShowDensity] = useState(false);

  const clubColorMap = new Map<string, string>();
  clubs.forEach((club, i) => {
    clubColorMap.set(club, CLUB_COLORS[i % CLUB_COLORS.length]);
  });

  const allData = useMemo(
    () =>
      shots
        .filter((s) => s.carryDistance !== null && s.carryDeviationDistance !== null)
        .map((s) => ({
          x: s.carryDeviationDistance!,
          y: s.carryDistance!,
          club: s.clubType,
          date: s.sessionDate,
        })),
    [shots]
  );

  const sessions = useMemo(() => {
    const unique = [...new Set(allData.map((d) => d.date))];
    unique.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    return unique;
  }, [allData]);

  const usedClubs = useMemo(() => [...new Set(allData.map((d) => d.club))], [allData]);

  const visibleClubs = useMemo(() => activeClubs ?? new Set(usedClubs), [activeClubs, usedClubs]);

  const data = useMemo(
    () => allData.filter((d) => visibleClubs.has(d.club)),
    [allData, visibleClubs]
  );

  const activeSession = selectedSessionIdx !== null ? sessions[selectedSessionIdx] : null;

  const densityGrid = useMemo(() => {
    if (!showDensity || data.length < 3) return [];
    const xs = data.map((d) => d.x);
    const ys = data.map((d) => d.y);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const yMin = Math.min(...ys);
    const yMax = Math.max(...ys);
    const gridSize = 8;
    const xStep = (xMax - xMin) / gridSize || 1;
    const yStep = (yMax - yMin) / gridSize || 1;
    const cells: { x1: number; x2: number; y1: number; y2: number; count: number }[] = [];
    let maxCount = 0;

    for (let ix = 0; ix < gridSize; ix++) {
      for (let iy = 0; iy < gridSize; iy++) {
        const x1 = xMin + ix * xStep;
        const x2 = x1 + xStep;
        const y1 = yMin + iy * yStep;
        const y2 = y1 + yStep;
        const count = data.filter(
          (d) => d.x >= x1 && d.x < x2 && d.y >= y1 && d.y < y2
        ).length;
        if (count > 0) {
          cells.push({ x1, x2, y1, y2, count });
          maxCount = Math.max(maxCount, count);
        }
      }
    }
    return cells.map((c) => ({
      ...c,
      colorIdx: Math.min(Math.floor((c.count / maxCount) * DENSITY_COLORS.length), DENSITY_COLORS.length - 1),
    }));
  }, [showDensity, data]);

  if (allData.length === 0) return null;

  const toggleClub = (club: string) => {
    setActiveClubs((prev) => {
      const current = prev ?? new Set(usedClubs);
      const next = new Set(current);
      if (next.has(club)) {
        next.delete(club);
        if (next.size === 0) return new Set(usedClubs);
      } else {
        next.add(club);
      }
      if (next.size === usedClubs.length) return null;
      return next;
    });
  };

  const selectOnly = (club: string) => {
    setActiveClubs((prev) => {
      const current = prev ?? new Set(usedClubs);
      if (current.size === 1 && current.has(club)) return null;
      return new Set([club]);
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Shot Dispersion</CardTitle>
          <div className="flex items-center gap-3">
            <Button
              variant={showDensity ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setShowDensity(!showDensity)}
            >
              {showDensity ? <Grid2X2 className="h-3 w-3" /> : <CircleDot className="h-3 w-3" />}
              {showDensity ? "Density" : "Points"}
            </Button>
            {activeSession && (
              <span className="text-[10px] font-medium text-foreground">{activeSession}</span>
            )}
            {(activeClubs || activeSession) && (
              <button
                onClick={() => { setActiveClubs(null); setSelectedSessionIdx(null); }}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex flex-wrap gap-2 mb-3 justify-center">
          {usedClubs.map((club) => {
            const isActive = visibleClubs.has(club);
            const color = clubColorMap.get(club) || CLUB_COLORS[0];
            return (
              <button
                key={club}
                onClick={() => toggleClub(club)}
                onDoubleClick={() => selectOnly(club)}
                className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border transition-all ${
                  isActive
                    ? "border-current opacity-100"
                    : "border-transparent opacity-30"
                }`}
                style={{ color }}
                title="Click to toggle, double-click to isolate"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                {club}
              </button>
            );
          })}
        </div>
        {sessions.length > 1 && (
          <div className="mb-3 px-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground">{sessions[0]}</span>
              <span className="text-[10px] text-muted-foreground">{sessions[sessions.length - 1]}</span>
            </div>
            <Slider
              min={0}
              max={sessions.length - 1}
              step={1}
              value={selectedSessionIdx !== null ? [selectedSessionIdx] : [sessions.length - 1]}
              onValueChange={(val) => { const v = Array.isArray(val) ? val[0] : val; setSelectedSessionIdx(v); }}
            />
          </div>
        )}
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="x"
                type="number"
                name="Deviation"
                unit=" yds"
                tick={{ fontSize: 11 }}
                label={{ value: "Deviation (yds)", position: "insideBottom", offset: -5, fontSize: 11 }}
              />
              <YAxis
                dataKey="y"
                type="number"
                name="Carry"
                unit=" yds"
                tick={{ fontSize: 11 }}
                label={{ value: "Carry (yds)", angle: -90, position: "insideLeft", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-md">
                      <div className="font-medium">{d.club}</div>
                      <div className="text-muted-foreground">{d.date}</div>
                      <div>Carry: {d.y.toFixed(1)} yds</div>
                      <div>Deviation: {d.x.toFixed(1)} yds</div>
                    </div>
                  );
                }}
              />
              {showDensity && densityGrid.map((cell, i) => (
                <ReferenceArea
                  key={i}
                  x1={cell.x1}
                  x2={cell.x2}
                  y1={cell.y1}
                  y2={cell.y2}
                  fill={DENSITY_COLORS[cell.colorIdx]}
                  fillOpacity={0.2 + (cell.colorIdx / DENSITY_COLORS.length) * 0.3}
                  stroke="none"
                />
              ))}
              <Scatter data={data}>
                {data.map((d, i) => {
                  const isHighlighted = !activeSession || d.date === activeSession;
                  return (
                    <Cell
                      key={i}
                      fill={isHighlighted ? (clubColorMap.get(d.club) || CLUB_COLORS[0]) : GRAY}
                      fillOpacity={isHighlighted ? 0.7 : 0.25}
                    />
                  );
                })}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        {showDensity && (
          <div className="flex items-center justify-center gap-1 mt-2">
            <span className="text-[10px] text-muted-foreground mr-1">Low</span>
            {DENSITY_COLORS.map((c, i) => (
              <div key={i} className="w-4 h-3 rounded-sm" style={{ backgroundColor: c, opacity: 0.3 + (i / DENSITY_COLORS.length) * 0.5 }} />
            ))}
            <span className="text-[10px] text-muted-foreground ml-1">High</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
