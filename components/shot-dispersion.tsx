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
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShotData } from "@/lib/types";

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

interface ShotDispersionProps {
  shots: ShotData[];
  clubs: string[];
}

export function ShotDispersion({ shots, clubs }: ShotDispersionProps) {
  const [activeClubs, setActiveClubs] = useState<Set<string> | null>(null);

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

  const usedClubs = useMemo(() => [...new Set(allData.map((d) => d.club))], [allData]);

  const visibleClubs = useMemo(() => activeClubs ?? new Set(usedClubs), [activeClubs, usedClubs]);

  const data = useMemo(
    () => allData.filter((d) => visibleClubs.has(d.club)),
    [allData, visibleClubs]
  );

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
          {activeClubs && (
            <button
              onClick={() => setActiveClubs(null)}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Show All
            </button>
          )}
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
                title={`Click to toggle, double-click to isolate`}
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
              <Scatter data={data}>
                {data.map((d, i) => (
                  <Cell
                    key={i}
                    fill={clubColorMap.get(d.club) || CLUB_COLORS[0]}
                    fillOpacity={0.7}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
