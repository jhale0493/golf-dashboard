import Papa from "papaparse";
import { ShotData, SessionSummary } from "./types";

function parseNum(val: string | undefined): number | null {
  if (!val || val.trim() === "") return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function parseDate(val: string): Date {
  return new Date(val);
}

function formatSessionDate(d: Date): string {
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function parseCsvText(csvText: string): ShotData[] {
  const result = Papa.parse(csvText, { header: false, skipEmptyLines: true });
  const rows = result.data as string[][];
  if (rows.length < 3) return [];

  const headers = rows[0].map((h) => h.replace(/^\uFEFF/, "").trim());
  const clubTypeIdx = headers.indexOf("Club Type");
  const dateIdx = headers.indexOf("Date");
  const playerIdx = headers.indexOf("Player");
  const clubSpeedIdx = headers.indexOf("Club Speed");
  const attackAngleIdx = headers.indexOf("Attack Angle");
  const clubPathIdx = headers.indexOf("Club Path");
  const clubFaceIdx = headers.indexOf("Club Face");
  const faceToPathIdx = headers.indexOf("Face to Path");
  const ballSpeedIdx = headers.indexOf("Ball Speed");
  const smashFactorIdx = headers.indexOf("Smash Factor");
  const launchAngleIdx = headers.indexOf("Launch Angle");
  const launchDirIdx = headers.indexOf("Launch Direction");
  const backspinIdx = headers.indexOf("Backspin");
  const sidespinIdx = headers.indexOf("Sidespin");
  const spinRateIdx = headers.indexOf("Spin Rate");
  const spinAxisIdx = headers.indexOf("Spin Axis");
  const apexIdx = headers.indexOf("Apex Height");
  const carryDistIdx = headers.indexOf("Carry Distance");
  const carryDevAngleIdx = headers.indexOf("Carry Deviation Angle");
  const carryDevDistIdx = headers.indexOf("Carry Deviation Distance");
  const totalDistIdx = headers.indexOf("Total Distance");
  const totalDevAngleIdx = headers.indexOf("Total Deviation Angle");
  const totalDevDistIdx = headers.indexOf("Total Deviation Distance");

  const shots: ShotData[] = [];

  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row[dateIdx] || row[dateIdx].trim() === "") continue;

    const date = parseDate(row[dateIdx]);
    if (isNaN(date.getTime())) continue;

    const clubType = row[clubTypeIdx]?.trim();
    if (!clubType) continue;

    shots.push({
      date,
      sessionDate: formatSessionDate(date),
      player: row[playerIdx]?.trim() || "",
      clubType,
      clubSpeed: parseNum(row[clubSpeedIdx]),
      attackAngle: parseNum(row[attackAngleIdx]),
      clubPath: parseNum(row[clubPathIdx]),
      clubFace: parseNum(row[clubFaceIdx]),
      faceToPath: parseNum(row[faceToPathIdx]),
      ballSpeed: parseNum(row[ballSpeedIdx]),
      smashFactor: parseNum(row[smashFactorIdx]),
      launchAngle: parseNum(row[launchAngleIdx]),
      launchDirection: parseNum(row[launchDirIdx]),
      backspin: parseNum(row[backspinIdx]),
      sidespin: parseNum(row[sidespinIdx]),
      spinRate: parseNum(row[spinRateIdx]),
      spinAxis: parseNum(row[spinAxisIdx]),
      apexHeight: parseNum(row[apexIdx]),
      carryDistance: parseNum(row[carryDistIdx]),
      carryDeviationAngle: parseNum(row[carryDevAngleIdx]),
      carryDeviationDistance: parseNum(row[carryDevDistIdx]),
      totalDistance: parseNum(row[totalDistIdx]),
      totalDeviationAngle: parseNum(row[totalDevAngleIdx]),
      totalDeviationDistance: parseNum(row[totalDevDistIdx]),
    });
  }

  return shots;
}

function maxVal(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length === 0) return null;
  return Math.max(...valid);
}

function avg(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function avgAbs(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + Math.abs(b), 0) / valid.length;
}

export function computeSessionSummaries(shots: ShotData[]): SessionSummary[] {
  const groups = new Map<string, ShotData[]>();

  for (const shot of shots) {
    const key = `${shot.sessionDate}|||${shot.clubType}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(shot);
  }

  const summaries: SessionSummary[] = [];

  for (const [key, groupShots] of groups) {
    const [sessionDate, clubType] = key.split("|||");
    summaries.push({
      sessionDate,
      clubType,
      shotCount: groupShots.length,
      avgClubSpeed: avg(groupShots.map((s) => s.clubSpeed)),
      avgBallSpeed: avg(groupShots.map((s) => s.ballSpeed)),
      avgSmashFactor: avg(groupShots.map((s) => s.smashFactor)),
      avgCarryDistance: avg(groupShots.map((s) => s.carryDistance)),
      avgTotalDistance: avg(groupShots.map((s) => s.totalDistance)),
      avgLaunchAngle: avg(groupShots.map((s) => s.launchAngle)),
      avgSpinRate: avg(groupShots.map((s) => s.spinRate)),
      avgAttackAngle: avg(groupShots.map((s) => s.attackAngle)),
      avgClubPath: avg(groupShots.map((s) => s.clubPath)),
      avgClubFace: avg(groupShots.map((s) => s.clubFace)),
      avgCarryDeviation: avgAbs(groupShots.map((s) => s.carryDeviationDistance)),
      avgTotalDeviation: avgAbs(groupShots.map((s) => s.totalDeviationDistance)),
      maxClubSpeed: maxVal(groupShots.map((s) => s.clubSpeed)),
      maxCarryDistance: maxVal(groupShots.map((s) => s.carryDistance)),
      maxTotalDistance: maxVal(groupShots.map((s) => s.totalDistance)),
    });
  }

  summaries.sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime());
  return summaries;
}

export function getUniqueClubs(shots: ShotData[]): string[] {
  const clubOrder = ["Driver", "3 Wood", "5 Wood", "2 Hybrid", "3 Hybrid", "4 Hybrid", "3 Iron", "4 Iron", "5 Iron", "6 Iron", "7 Iron", "8 Iron", "9 Iron", "PW", "SW", "LW"];
  const clubs = [...new Set(shots.map((s) => s.clubType))];
  clubs.sort((a, b) => {
    const ai = clubOrder.indexOf(a);
    const bi = clubOrder.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
  return clubs;
}

export const SEED_FILES = [
  "DrivingRange-2025-12-28 22_14_56 +0000.csv",
  "DrivingRange-2026-01-09 00_08_12 +0000.csv",
  "DrivingRange-2026-02-19 21_41_08 +0000.csv",
  "DrivingRange-2026-03-01 18_30_09 +0000.csv",
  "DrivingRange-2026-03-04 18_51_57 +0000.csv",
];
