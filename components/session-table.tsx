"use client";

import { useState, useMemo, useCallback, Fragment } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SessionSummary, ShotData } from "@/lib/types";
import { ArrowUp, ArrowDown, ArrowUpDown, Plus, Trash2, X, ChevronDown, ChevronRight, Trophy, StickyNote } from "lucide-react";

type SortKey = keyof SessionSummary;
type SortDir = "asc" | "desc";

interface Column {
  key: SortKey;
  label: string;
  align: "left" | "right";
  format: (v: unknown) => string;
}

const COLUMNS: Column[] = [
  { key: "sessionDate", label: "Date", align: "left", format: (v) => String(v) },
  { key: "clubType", label: "Club", align: "left", format: (v) => String(v) },
  { key: "shotCount", label: "Shots", align: "right", format: (v) => String(v) },
  { key: "avgClubSpeed", label: "Club Spd", align: "right", format: (v) => (v as number | null)?.toFixed(1) ?? "\u2014" },
  { key: "maxClubSpeed", label: "Max Spd", align: "right", format: (v) => (v as number | null)?.toFixed(1) ?? "\u2014" },
  { key: "avgBallSpeed", label: "Ball Spd", align: "right", format: (v) => (v as number | null)?.toFixed(1) ?? "\u2014" },
  { key: "avgSmashFactor", label: "Smash", align: "right", format: (v) => (v as number | null)?.toFixed(3) ?? "\u2014" },
  { key: "avgCarryDistance", label: "Carry", align: "right", format: (v) => (v as number | null)?.toFixed(1) ?? "\u2014" },
  { key: "maxCarryDistance", label: "Max Carry", align: "right", format: (v) => (v as number | null)?.toFixed(1) ?? "\u2014" },
  { key: "avgTotalDistance", label: "Total", align: "right", format: (v) => (v as number | null)?.toFixed(1) ?? "\u2014" },
  { key: "maxTotalDistance", label: "Max Total", align: "right", format: (v) => (v as number | null)?.toFixed(1) ?? "\u2014" },
  { key: "avgLaunchAngle", label: "Launch", align: "right", format: (v) => (v as number | null)?.toFixed(1) ?? "\u2014" },
  { key: "avgSpinRate", label: "Spin", align: "right", format: (v) => (v as number | null)?.toFixed(0) ?? "\u2014" },
  { key: "avgCarryDeviation", label: "Deviation", align: "right", format: (v) => (v as number | null)?.toFixed(1) ?? "\u2014" },
];

const SPARKLINE_METRICS: SortKey[] = ["avgCarryDistance", "avgClubSpeed", "avgSmashFactor"];

interface SessionTableProps {
  summaries: SessionSummary[];
  csvSummaryCount: number;
  onAddSummary: (summary: SessionSummary) => void;
  onRemoveSummary: (index: number, isManual: boolean) => void;
  onRemoveCsvSummary: (sessionDate: string) => void;
  bestSessions?: Record<string, { value: number; sessionDate: string; clubType: string }>;
  sessionNotes?: Record<string, string>;
  onNoteChange?: (sessionDate: string, clubType: string, note: string) => void;
  allShots?: ShotData[];
}

function emptySummary(): SessionSummary {
  return {
    sessionDate: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
    clubType: "Driver",
    shotCount: 0,
    avgClubSpeed: null,
    avgBallSpeed: null,
    avgSmashFactor: null,
    avgCarryDistance: null,
    avgTotalDistance: null,
    avgLaunchAngle: null,
    avgSpinRate: null,
    avgAttackAngle: null,
    avgClubPath: null,
    avgClubFace: null,
    avgCarryDeviation: null,
    avgTotalDeviation: null,
    maxClubSpeed: null,
    maxCarryDistance: null,
    maxTotalDistance: null,
  };
}

function MiniSparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 40;
  const h = 16;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="inline-block ml-1 align-middle">
      <polyline points={points} fill="none" stroke="hsl(152, 60%, 40%)" strokeWidth="1.5" />
    </svg>
  );
}

export function SessionTable({
  summaries,
  csvSummaryCount,
  onAddSummary,
  onRemoveSummary,
  onRemoveCsvSummary,
  bestSessions,
  sessionNotes,
  onNoteChange,
  allShots,
}: SessionTableProps) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [showAddRow, setShowAddRow] = useState(false);
  const [newRow, setNewRow] = useState<SessionSummary>(emptySummary);
  const [deleteTarget, setDeleteTarget] = useState<{ index: number; isManual: boolean; sessionDate: string; clubType: string } | null>(null);
  const [deleteCode, setDeleteCode] = useState("");
  const [deleteCodeError, setDeleteCodeError] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingNote, setEditingNote] = useState<string | null>(null);

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }, [sortKey]);

  const sorted = useMemo(() => {
    if (!sortKey) return summaries;
    return [...summaries].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      let cmp = 0;
      if (typeof av === "string" && typeof bv === "string") {
        cmp = av.localeCompare(bv);
      } else {
        cmp = (av as number) - (bv as number);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [summaries, sortKey, sortDir]);

  const sparklineData = useMemo(() => {
    const data = new Map<string, Map<SortKey, number[]>>();
    for (const s of summaries) {
      const key = `${s.sessionDate}|||${s.clubType}`;
      const priorSummaries = summaries.filter(
        (ps) => ps.clubType === s.clubType && new Date(ps.sessionDate).getTime() <= new Date(s.sessionDate).getTime()
      );
      const metricMap = new Map<SortKey, number[]>();
      for (const m of SPARKLINE_METRICS) {
        metricMap.set(m, priorSummaries.map((ps) => ps[m] as number).filter((v) => v !== null));
      }
      data.set(key, metricMap);
    }
    return data;
  }, [summaries]);

  const handleAddSubmit = useCallback(() => {
    onAddSummary(newRow);
    setNewRow(emptySummary());
    setShowAddRow(false);
  }, [newRow, onAddSummary]);

  const updateNewRow = useCallback((key: string, value: string) => {
    setNewRow((prev) => {
      if (key === "sessionDate" || key === "clubType") {
        return { ...prev, [key]: value };
      }
      const num = value === "" ? null : parseFloat(value);
      return { ...prev, [key]: isNaN(num as number) ? null : num };
    });
  }, []);

  const confirmDelete = () => {
    if (deleteCode !== "0623") {
      setDeleteCodeError(true);
      return;
    }
    if (!deleteTarget) return;
    if (deleteTarget.isManual) {
      onRemoveSummary(deleteTarget.index, true);
    } else {
      onRemoveCsvSummary(deleteTarget.sessionDate);
    }
    setDeleteTarget(null);
    setDeleteCode("");
    setDeleteCodeError(false);
  };

  const cancelDelete = () => {
    setDeleteTarget(null);
    setDeleteCode("");
    setDeleteCodeError(false);
  };

  const toggleExpand = (key: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isBestSession = (s: SessionSummary): string[] => {
    if (!bestSessions) return [];
    const awards: string[] = [];
    for (const [metric, best] of Object.entries(bestSessions)) {
      if (best.sessionDate === s.sessionDate && best.clubType === s.clubType) {
        const labels: Record<string, string> = {
          maxClubSpeed: "Fastest",
          maxCarryDistance: "Longest Carry",
          maxTotalDistance: "Longest Total",
        };
        awards.push(labels[metric] || metric);
      }
    }
    return awards;
  };

  if (summaries.length === 0 && !showAddRow) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>No session data available</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowAddRow(true)}>
            <Plus className="h-3 w-3 mr-1" /> Add Manual Entry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Session History</CardTitle>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setShowAddRow(!showAddRow)}
        >
          {showAddRow ? <X className="h-3 w-3 mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
          {showAddRow ? "Cancel" : "Add Row"}
        </Button>
      </CardHeader>
      <CardContent className="pb-4">
        {deleteTarget && (
          <div className="mb-3 flex items-center gap-2 rounded-md border border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-800 px-3 py-2">
            <span className="text-xs text-red-700 dark:text-red-400">
              Delete session <span className="font-medium">{deleteTarget.sessionDate}</span>? Enter code:
            </span>
            <input
              type="password"
              value={deleteCode}
              onChange={(e) => { setDeleteCode(e.target.value); setDeleteCodeError(false); }}
              onKeyDown={(e) => { if (e.key === "Enter") confirmDelete(); if (e.key === "Escape") cancelDelete(); }}
              placeholder="Code"
              autoFocus
              className={`h-7 w-20 rounded-md border bg-background px-2 text-xs text-center outline-none focus:ring-1 focus:ring-ring ${
                deleteCodeError ? "border-red-400 ring-1 ring-red-400" : "border-input"
              }`}
            />
            <Button variant="outline" size="sm" className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-100 dark:text-red-400" onClick={confirmDelete}>
              Confirm
            </Button>
            <button onClick={cancelDelete} className="text-xs text-muted-foreground hover:text-foreground px-1">
              &times;
            </button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="w-6" />
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className={`${col.align === "left" ? "text-left" : "text-right"} py-2 pr-4 font-medium cursor-pointer select-none hover:text-foreground transition-colors`}
                    onClick={() => handleSort(col.key)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {sortKey === col.key ? (
                        sortDir === "asc" ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )
                      ) : (
                        <ArrowUpDown className="h-2.5 w-2.5 opacity-30" />
                      )}
                    </span>
                  </th>
                ))}
                <th className="w-8" />
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {showAddRow && (
                <tr className="border-b border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
                  <td />
                  {COLUMNS.map((col) => (
                    <td key={col.key} className={`${col.align === "left" ? "text-left" : "text-right"} py-1.5 pr-2`}>
                      <input
                        type={col.key === "sessionDate" || col.key === "clubType" ? "text" : "number"}
                        step="any"
                        className="w-full bg-transparent border border-border rounded px-1.5 py-0.5 text-xs outline-none focus:border-emerald-500 tabular-nums"
                        placeholder={col.label}
                        value={
                          col.key === "sessionDate" || col.key === "clubType"
                            ? (newRow[col.key] as string)
                            : (newRow[col.key] ?? "")
                        }
                        onChange={(e) => updateNewRow(col.key, e.target.value)}
                        style={{ minWidth: col.key === "sessionDate" ? 100 : col.key === "clubType" ? 70 : 50 }}
                      />
                    </td>
                  ))}
                  <td className="py-1.5 pl-1" colSpan={2}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100"
                      onClick={handleAddSubmit}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              )}
              {sorted.map((s, i) => {
                const originalIndex = summaries.indexOf(s);
                const isManual = originalIndex >= csvSummaryCount;
                const manualIndex = originalIndex - csvSummaryCount;
                const rowKey = `${s.sessionDate}|||${s.clubType}`;
                const isExpanded = expandedRows.has(rowKey);
                const awards = isBestSession(s);
                const noteKey = `${s.sessionDate}|||${s.clubType}`;
                const note = sessionNotes?.[noteKey] || "";
                const rowShots = allShots?.filter(
                  (sh) => sh.sessionDate === s.sessionDate && sh.clubType === s.clubType
                ) || [];
                const sparkData = sparklineData.get(rowKey);

                return (
                  <Fragment key={rowKey + i}><tr className={`border-b border-border/50 hover:bg-muted/50 transition-colors group ${awards.length > 0 ? "bg-amber-50/30 dark:bg-amber-950/10" : ""}`}>
                    <td className="py-2 pl-1">
                      {rowShots.length > 0 && (
                        <button onClick={() => toggleExpand(rowKey)} className="text-muted-foreground hover:text-foreground">
                          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        </button>
                      )}
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      <span>{s.sessionDate}</span>
                      {awards.map((a) => (
                        <Badge key={a} className="ml-1.5 text-[9px] px-1 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 border-0">
                          <Trophy className="h-2.5 w-2.5 mr-0.5" />{a}
                        </Badge>
                      ))}
                    </td>
                    <td className="py-2 pr-4">
                      <Badge variant="secondary" className="text-[10px] font-normal">
                        {s.clubType}
                      </Badge>
                    </td>
                    <td className="text-right py-2 pr-4 tabular-nums">{s.shotCount}</td>
                    <td className="text-right py-2 pr-4 tabular-nums">
                      {s.avgClubSpeed?.toFixed(1) ?? "\u2014"}
                      {sparkData && <MiniSparkline values={sparkData.get("avgClubSpeed") || []} />}
                    </td>
                    <td className="text-right py-2 pr-4 tabular-nums font-medium">{s.maxClubSpeed?.toFixed(1) ?? "\u2014"}</td>
                    <td className="text-right py-2 pr-4 tabular-nums">{s.avgBallSpeed?.toFixed(1) ?? "\u2014"}</td>
                    <td className="text-right py-2 pr-4 tabular-nums">
                      {s.avgSmashFactor?.toFixed(3) ?? "\u2014"}
                      {sparkData && <MiniSparkline values={sparkData.get("avgSmashFactor") || []} />}
                    </td>
                    <td className="text-right py-2 pr-4 tabular-nums font-medium">
                      {s.avgCarryDistance?.toFixed(1) ?? "\u2014"}
                      {sparkData && <MiniSparkline values={sparkData.get("avgCarryDistance") || []} />}
                    </td>
                    <td className="text-right py-2 pr-4 tabular-nums font-medium">{s.maxCarryDistance?.toFixed(1) ?? "\u2014"}</td>
                    <td className="text-right py-2 pr-4 tabular-nums font-medium">{s.avgTotalDistance?.toFixed(1) ?? "\u2014"}</td>
                    <td className="text-right py-2 pr-4 tabular-nums font-medium">{s.maxTotalDistance?.toFixed(1) ?? "\u2014"}</td>
                    <td className="text-right py-2 pr-4 tabular-nums">{s.avgLaunchAngle?.toFixed(1) ?? "\u2014"}</td>
                    <td className="text-right py-2 pr-4 tabular-nums">{s.avgSpinRate?.toFixed(0) ?? "\u2014"}</td>
                    <td className="text-right py-2 pr-4 tabular-nums">{s.avgCarryDeviation?.toFixed(1) ?? "\u2014"}</td>
                    <td className="py-2 pl-1 w-8">
                      <button
                        onClick={() => setEditingNote(editingNote === noteKey ? null : noteKey)}
                        className={`opacity-0 group-hover:opacity-100 transition-opacity ${note ? "!opacity-100 text-amber-500" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        <StickyNote className="h-3 w-3" />
                      </button>
                    </td>
                    <td className="py-2 pl-1 w-8">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 hover:bg-red-50 transition-opacity"
                        onClick={() =>
                          setDeleteTarget({
                            index: isManual ? manualIndex : originalIndex,
                            isManual,
                            sessionDate: s.sessionDate,
                            clubType: s.clubType,
                          })
                        }
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                  {editingNote === noteKey && (
                    <tr className="border-b border-border/50">
                      <td colSpan={COLUMNS.length + 3} className="px-4 py-2">
                        <input
                          type="text"
                          placeholder="Add a note (e.g., 'worked on lag', 'windy day')..."
                          value={note}
                          onChange={(e) => onNoteChange?.(s.sessionDate, s.clubType, e.target.value)}
                          className="w-full bg-transparent border border-border rounded px-2 py-1 text-xs outline-none focus:border-emerald-500"
                          autoFocus
                        />
                      </td>
                    </tr>
                  )}
                  {isExpanded && rowShots.length > 0 && (
                    <tr className="border-b border-border/50">
                      <td colSpan={COLUMNS.length + 3} className="bg-muted/30 px-4 py-2">
                        <div className="overflow-x-auto">
                          <table className="w-full text-[10px]">
                            <thead>
                              <tr className="text-muted-foreground border-b border-border/30">
                                <th className="text-left py-1 pr-3 font-medium">#</th>
                                <th className="text-right py-1 pr-3 font-medium">Club Spd</th>
                                <th className="text-right py-1 pr-3 font-medium">Ball Spd</th>
                                <th className="text-right py-1 pr-3 font-medium">Smash</th>
                                <th className="text-right py-1 pr-3 font-medium">Launch</th>
                                <th className="text-right py-1 pr-3 font-medium">Spin</th>
                                <th className="text-right py-1 pr-3 font-medium">Carry</th>
                                <th className="text-right py-1 pr-3 font-medium">Total</th>
                                <th className="text-right py-1 pr-3 font-medium">Deviation</th>
                                <th className="text-right py-1 pr-3 font-medium">Club Path</th>
                                <th className="text-right py-1 pr-3 font-medium">Face</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rowShots.map((shot, si) => (
                                <tr key={si} className="border-b border-border/20 hover:bg-muted/50">
                                  <td className="py-1 pr-3 text-muted-foreground">{si + 1}</td>
                                  <td className="text-right py-1 pr-3 tabular-nums">{shot.clubSpeed?.toFixed(1) ?? "\u2014"}</td>
                                  <td className="text-right py-1 pr-3 tabular-nums">{shot.ballSpeed?.toFixed(1) ?? "\u2014"}</td>
                                  <td className="text-right py-1 pr-3 tabular-nums">{shot.smashFactor?.toFixed(3) ?? "\u2014"}</td>
                                  <td className="text-right py-1 pr-3 tabular-nums">{shot.launchAngle?.toFixed(1) ?? "\u2014"}</td>
                                  <td className="text-right py-1 pr-3 tabular-nums">{shot.spinRate?.toFixed(0) ?? "\u2014"}</td>
                                  <td className="text-right py-1 pr-3 tabular-nums font-medium">{shot.carryDistance?.toFixed(1) ?? "\u2014"}</td>
                                  <td className="text-right py-1 pr-3 tabular-nums font-medium">{shot.totalDistance?.toFixed(1) ?? "\u2014"}</td>
                                  <td className="text-right py-1 pr-3 tabular-nums">{shot.carryDeviationDistance?.toFixed(1) ?? "\u2014"}</td>
                                  <td className="text-right py-1 pr-3 tabular-nums">{shot.clubPath?.toFixed(1) ?? "\u2014"}</td>
                                  <td className="text-right py-1 pr-3 tabular-nums">{shot.clubFace?.toFixed(1) ?? "\u2014"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}</Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
