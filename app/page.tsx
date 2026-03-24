"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CsvUpload } from "@/components/csv-upload";
import { MetricCards } from "@/components/metric-cards";
import { ProgressionChart, MultiClubChart } from "@/components/progression-chart";
import { ShotDispersion } from "@/components/shot-dispersion";
import { SessionTable } from "@/components/session-table";
import {
  parseCsvText,
  computeSessionSummaries,
  getUniqueClubs,
  SEED_FILES,
} from "@/lib/csv-parser";
import { ShotData, SessionSummary, MetricKey } from "@/lib/types";
import { Activity, Target, Gauge, Ruler, CalendarDays, Lock, Unlock } from "lucide-react";

const PRIMARY_METRICS: MetricKey[] = [
  "avgClubSpeed",
  "avgBallSpeed",
  "avgSmashFactor",
  "avgCarryDistance",
  "avgTotalDistance",
  "avgCarryDeviation",
  "avgClubPath",
  "maxClubSpeed",
  "maxCarryDistance",
  "maxTotalDistance",
];

const CHART_METRICS: MetricKey[] = [
  "avgCarryDistance",
  "avgTotalDistance",
  "avgClubSpeed",
  "avgBallSpeed",
  "avgSmashFactor",
  "avgSpinRate",
  "avgLaunchAngle",
  "avgAttackAngle",
  "avgClubPath",
  "avgCarryDeviation",
];

type ViewMode = "single" | "compare";

export default function Dashboard() {
  const [allShots, setAllShots] = useState<ShotData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClub, setSelectedClub] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("single");
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [manualSummaries, setManualSummaries] = useState<SessionSummary[]>([]);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [uploadUnlocked, setUploadUnlocked] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState(false);

  const STORAGE_KEY = "golf-dashboard-uploads";

  useEffect(() => {
    async function loadAllData() {
      const shots: ShotData[] = [];
      for (const file of SEED_FILES) {
        try {
          const res = await fetch(`/data/${encodeURIComponent(file)}`);
          if (res.ok) {
            const text = await res.text();
            shots.push(...parseCsvText(text));
          }
        } catch {}
      }
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const entries: { name: string; csv: string }[] = JSON.parse(stored);
          const names: string[] = [];
          for (const entry of entries) {
            const restored = parseCsvText(entry.csv);
            if (restored.length > 0) {
              shots.push(...restored);
              names.push(entry.name);
            }
          }
          if (names.length > 0) setUploadedFiles(names);
        }
      } catch {}
      setAllShots(shots);
      setLoading(false);
    }
    loadAllData();
  }, []);

  const clubs = useMemo(() => getUniqueClubs(allShots), [allShots]);

  const filteredShots = useMemo(() => {
    let shots = allShots;
    if (selectedClub !== "all") {
      shots = shots.filter((s) => s.clubType === selectedClub);
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      shots = shots.filter((s) => s.date >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      shots = shots.filter((s) => s.date <= to);
    }
    return shots;
  }, [allShots, selectedClub, dateFrom, dateTo]);

  const csvSummaries = useMemo(
    () => computeSessionSummaries(filteredShots),
    [filteredShots]
  );

  const summaries = useMemo(() => {
    let manual = manualSummaries;
    if (selectedClub !== "all") {
      manual = manual.filter((s) => s.clubType === selectedClub);
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      manual = manual.filter((s) => new Date(s.sessionDate) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      manual = manual.filter((s) => new Date(s.sessionDate) <= to);
    }
    return [...csvSummaries, ...manual].sort(
      (a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime()
    );
  }, [csvSummaries, manualSummaries, selectedClub, dateFrom, dateTo]);

  const allSummaries = useMemo(
    () => computeSessionSummaries(allShots),
    [allShots]
  );

  const handleUpload = useCallback(
    (shots: ShotData[], fileName: string, rawCsv?: string) => {
      setAllShots((prev) => [...prev, ...shots]);
      setUploadedFiles((prev) => {
        const next = [...prev, fileName];
        return next;
      });
      if (rawCsv) {
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          const entries: { name: string; csv: string }[] = stored ? JSON.parse(stored) : [];
          entries.push({ name: fileName, csv: rawCsv });
          localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
        } catch {}
      }
    },
    []
  );

  const handleAddSummary = useCallback((summary: SessionSummary) => {
    setManualSummaries((prev) => [...prev, summary]);
  }, []);

  const handleRemoveSummary = useCallback((index: number, isManual: boolean) => {
    if (isManual) {
      setManualSummaries((prev) => prev.filter((_, i) => i !== index));
    }
  }, []);

  const totalSessions = useMemo(() => {
    const dates = new Set(allShots.map((s) => s.sessionDate));
    return dates.size;
  }, [allShots]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading sessions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center">
                <Target className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight">Swing Tracker</h1>
                <p className="text-xs text-muted-foreground">
                  {totalSessions} sessions &middot; {allShots.length} shots
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {uploadedFiles.length > 0 && (
                <div className="flex items-center gap-1">
                  {uploadedFiles.map((f, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">
                      {f}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-ring"
                />
                <span className="text-xs text-muted-foreground">–</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-ring"
                />
                {(dateFrom || dateTo) && (
                  <button
                    onClick={() => { setDateFrom(""); setDateTo(""); }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1"
                  >
                    ×
                  </button>
                )}
              </div>
              <Select value={selectedClub} onValueChange={(v) => v && setSelectedClub(v)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All Clubs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clubs</SelectItem>
                  {clubs.map((club) => (
                    <SelectItem key={club} value={club}>
                      {club}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Tabs
                value={viewMode}
                onValueChange={(v) => setViewMode(v as ViewMode)}
              >
                <TabsList className="h-8">
                  <TabsTrigger value="single" className="text-xs px-3 h-7">
                    <Gauge className="h-3.5 w-3.5 mr-1" />
                    Single Club
                  </TabsTrigger>
                  <TabsTrigger value="compare" className="text-xs px-3 h-7">
                    <Activity className="h-3.5 w-3.5 mr-1" />
                    Compare
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">
        {!uploadUnlocked ? (
          <Card className="border-dashed border-2 border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-700">
            <CardContent className="flex items-center justify-center gap-3 py-4">
              <Lock className="h-5 w-5 text-amber-600" />
              <span className="text-sm text-muted-foreground">Upload locked — enter code to unlock</span>
              <input
                type="password"
                value={codeInput}
                onChange={(e) => { setCodeInput(e.target.value); setCodeError(false); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (codeInput === "0623") setUploadUnlocked(true);
                    else setCodeError(true);
                  }
                }}
                placeholder="Code"
                className={`h-8 w-24 rounded-md border bg-background px-2 text-xs text-center outline-none focus:ring-1 focus:ring-ring ${
                  codeError ? "border-red-400 ring-1 ring-red-400" : "border-input"
                }`}
              />
              <Button
                variant="outline"
                size="sm"
                className="border-amber-400 text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900"
                onClick={() => {
                  if (codeInput === "0623") setUploadUnlocked(true);
                  else setCodeError(true);
                }}
              >
                <Unlock className="h-3.5 w-3.5 mr-1" />
                Unlock
              </Button>
            </CardContent>
          </Card>
        ) : (
          <CsvUpload onDataLoaded={handleUpload} />
        )}

        <MetricCards summaries={summaries} selectedMetrics={PRIMARY_METRICS} />

        <Separator />

        {viewMode === "single" ? (
          <>
            <div className="flex items-center gap-2">
              <Ruler className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-medium">
                Progression Over Time
                {selectedClub !== "all" && (
                  <Badge variant="outline" className="ml-2 text-[10px]">
                    {selectedClub}
                  </Badge>
                )}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {CHART_METRICS.map((metric) => (
                <ProgressionChart
                  key={metric}
                  summaries={summaries}
                  metric={metric}
                />
              ))}
            </div>
            <ShotDispersion shots={filteredShots} clubs={clubs} />
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-medium">Club Comparison</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(["avgCarryDistance", "avgTotalDistance", "avgClubSpeed", "avgBallSpeed", "avgSmashFactor", "avgSpinRate"] as MetricKey[]).map(
                (metric) => (
                  <MultiClubChart
                    key={metric}
                    summaries={allSummaries}
                    metric={metric}
                    clubs={clubs}
                  />
                )
              )}
            </div>
          </>
        )}

        <Separator />

        <SessionTable
          summaries={summaries}
          csvSummaryCount={csvSummaries.length}
          onAddSummary={handleAddSummary}
          onRemoveSummary={handleRemoveSummary}
        />
      </main>
    </div>
  );
}
