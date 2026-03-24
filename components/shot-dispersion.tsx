"use client";

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
  const clubColorMap = new Map<string, string>();
  clubs.forEach((club, i) => {
    clubColorMap.set(club, CLUB_COLORS[i % CLUB_COLORS.length]);
  });

  const data = shots
    .filter((s) => s.carryDistance !== null && s.carryDeviationDistance !== null)
    .map((s) => ({
      x: s.carryDeviationDistance!,
      y: s.carryDistance!,
      club: s.clubType,
      date: s.sessionDate,
    }));

  if (data.length === 0) return null;

  const usedClubs = [...new Set(data.map((d) => d.club))];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Shot Dispersion</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
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
        <div className="flex flex-wrap gap-3 mt-3 justify-center">
          {usedClubs.map((club) => (
            <div key={club} className="flex items-center gap-1.5 text-xs">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: clubColorMap.get(club) || CLUB_COLORS[0] }}
              />
              {club}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
