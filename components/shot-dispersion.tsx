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

interface ShotDispersionProps {
  shots: ShotData[];
}

export function ShotDispersion({ shots }: ShotDispersionProps) {
  const data = shots
    .filter((s) => s.carryDistance !== null && s.carryDeviationDistance !== null)
    .map((s) => ({
      x: s.carryDeviationDistance!,
      y: s.carryDistance!,
      club: s.clubType,
      date: s.sessionDate,
    }));

  if (data.length === 0) return null;

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
                formatter={(value: number, name: string) => [`${value.toFixed(1)} yds`, name]}
              />
              <Scatter data={data} fill="hsl(152, 60%, 40%)">
                {data.map((_, i) => (
                  <Cell key={i} fillOpacity={0.6} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
