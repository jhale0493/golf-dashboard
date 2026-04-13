"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
import { ThemeToggle } from "@/components/theme-toggle";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";
import { StrokesGained } from "@/components/strokes-gained";
import { ClubRadarChart } from "@/components/club-radar-chart";
import { ExportReport } from "@/components/export-report";
import { SessionCoach } from "@/components/session-coach";
import {
  parseCsvText,
  computeSessionSummaries,
  getUniqueClubs,
} from "@/lib/csv-parser";
import { ShotData, SessionSummary, MetricKey } from "@/lib/types";
import { Activity, Target, Gauge, Ruler, CalendarDays, Lock, Unlock, Menu, X } from "lucide-react";

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

const NOTES_KEY = "golf-dashboard-notes";

export default function Dashboard() {
  const [allShots, setAllShots] = useState<ShotData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClub, setSelectedClub] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("single");
  const [manualSummaries, setManualSummaries] = useState<SessionSummary[]>([]);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [uploadUnlocked, setUploadUnlocked] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [sessionNotes, setSessionNotes] = useState<Record<string, string>>({});
  const reportRef = useRef<HTMLElement>(null);

  const STORAGE_KEY = "golf-dashboard-uploads";
  const DELETED_KEY = "golf-dashboard-deleted";

  useEffect(() => {
    try {
      const stored = localStorage.getItem(NOTES_KEY);
      if (stored) setSessionNotes(JSON.parse(stored));
    } catch {}
  }, []);

  const handleNoteChange = useCallback((sessionDate: string, clubType: string, note: string) => {
    const key = `${sessionDate}|||${clubType}`;
    setSessionNotes((prev) => {
      const next = { ...prev };
      if (note.trim() === "") {
        delete next[key];
      } else {
        next[key] = note;
      }
      try { localStorage.setItem(NOTES_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    async function loadAllData() {
      const shots: ShotData[] = [];
      let seedFiles: string[] = [];
      try {
        const manifestRes = await fetch("/data/manifest.json");
        if (manifestRes.ok) {
          const manifest = await manifestRes.json();
          seedFiles = manifest.files ?? [];
        }
      } catch {}
      let deletedSet = new Set<string>();
      try {
        const deletedRaw = localStorage.getItem(DELETED_KEY);
        if (deletedRaw) deletedSet = new Set(JSON.parse(deletedRaw));
      } catch {}
      for (const file of seedFiles) {
        try {
          const res = await fetch(`/data/${encodeURIComponent(file)}`);
          if (res.ok) {
            const text = await res.text();
            const parsed = parseCsvText(text);
            shots.push(...parsed.filter((s) => !deletedSet.has(s.sessionDate)));
          }
        } catch {}
      }
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const entries: { name: string; csv: string }[] = JSON.parse(stored);
          for (const entry of entries) {
            const restored = parseCsvText(entry.csv);
            if (restored.length > 0) {
              shots.push(...restored);
            }
          }
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

  const bestSessions = useMemo(() => {
    const bests: Record<string, { value: number; sessionDate: string; clubType: string }> = {};
    const metrics: { key: keyof SessionSummary; label: string; higher: boolean }[] = [
      { key: "maxClubSpeed", label: "Fastest Swing", higher: true },
      { key: "maxCarryDistance", label: "Longest Carry", higher: true },
      { key: "maxTotalDistance", label: "Longest Total", higher: true },
    ];
    for (const m of metrics) {
      for (const s of summaries) {
        const v = s[m.key] as number | null;
        if (v === null) continue;
        if (!bests[m.key] || (m.higher ? v > bests[m.key].value : v < bests[m.key].value)) {
          bests[m.key] = { value: v, sessionDate: s.sessionDate, clubType: s.clubType };
        }
      }
    }
    return bests;
  }, [summaries]);

  const handleUpload = useCallback(
    (shots: ShotData[], fileName: string, rawCsv?: string) => {
      setAllShots((prev) => [...prev, ...shots]);
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

  const handleRemoveCsvSummary = useCallback((sessionDate: string) => {
    setAllShots((prev) => {
      const remaining = prev.filter((s) => s.sessionDate !== sessionDate);
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const entries: { name: string; csv: string }[] = JSON.parse(stored);
          const updated = entries.filter((entry) => {
            const shots = parseCsvText(entry.csv);
            return !shots.some((s) => s.sessionDate === sessionDate);
          });
          if (updated.length === 0) {
            localStorage.removeItem(STORAGE_KEY);
          } else {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          }
        }
      } catch {}
      try {
        const deletedRaw = localStorage.getItem(DELETED_KEY);
        const deleted: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
        deleted.push(sessionDate);
        localStorage.setItem(DELETED_KEY, JSON.stringify(deleted));
      } catch {}
      return remaining;
    });
  }, []);

  const totalSessions = useMemo(() => {
    const dates = new Set(allShots.map((s) => s.sessionDate));
    return dates.size;
  }, [allShots]);

  if (loading) return <DashboardSkeleton />;

  const filterControls = (
    <>
      <div className="flex items-center gap-1.5">
        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-ring"
        />
        <span className="text-xs text-muted-foreground">&ndash;</span>
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
            &times;
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
    </>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center">
                <Target className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight">Joseph&apos;s Swing Tracker</h1>
                <p className="text-xs text-muted-foreground">
                  {totalSessions} sessions &middot; {allShots.length} shots
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-3">
              {filterControls}
              <ExportReport targetRef={reportRef} />
              <ThemeToggle />
            </div>
            <div className="flex md:hidden items-center gap-2">
              <ThemeToggle />
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}>
                {mobileFiltersOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          {mobileFiltersOpen && (
            <div className="md:hidden flex flex-col gap-3 pt-3 border-t mt-3">
              {filterControls}
              <ExportReport targetRef={reportRef} />
            </div>
          )}
        </div>
      </header>

      <main ref={reportRef} className="max-w-[1400px] mx-auto px-6 py-6 space-y-6 flex-1">
        {!uploadUnlocked ? (
          <Card className="border-dashed border-2 border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-700">
            <CardContent className="flex items-center justify-center gap-3 py-4">
              <Lock className="h-5 w-5 text-amber-600" />
              <span className="text-sm text-muted-foreground">Upload locked &mdash; enter code to unlock</span>
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

        <MetricCards summaries={summaries} selectedMetrics={PRIMARY_METRICS} bestSessions={bestSessions} />

        <SessionCoach summaries={summaries} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StrokesGained summaries={summaries} />
        </div>

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
        ) : clubs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No club data available for comparison.</p>
              <p className="text-xs mt-1">Upload session CSVs to see club-by-club analysis.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-medium">Club Comparison</h2>
            </div>
            <ClubRadarChart summaries={allSummaries} clubs={clubs} />
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
          onRemoveCsvSummary={handleRemoveCsvSummary}
          bestSessions={bestSessions}
          sessionNotes={sessionNotes}
          onNoteChange={handleNoteChange}
          allShots={filteredShots}
        />
      </main>

      <footer className="border-t bg-card">
        <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Swing Tracker v0.2.0</span>
          <span>Data source: Rapsodo MLM2PRO</span>
        </div>
      </footer>
    </div>
  );
}
