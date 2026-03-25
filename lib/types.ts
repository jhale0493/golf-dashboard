export interface ShotData {
  date: Date;
  sessionDate: string;
  player: string;
  clubType: string;
  clubSpeed: number | null;
  attackAngle: number | null;
  clubPath: number | null;
  clubFace: number | null;
  faceToPath: number | null;
  ballSpeed: number | null;
  smashFactor: number | null;
  launchAngle: number | null;
  launchDirection: number | null;
  backspin: number | null;
  sidespin: number | null;
  spinRate: number | null;
  spinAxis: number | null;
  apexHeight: number | null;
  carryDistance: number | null;
  carryDeviationAngle: number | null;
  carryDeviationDistance: number | null;
  totalDistance: number | null;
  totalDeviationAngle: number | null;
  totalDeviationDistance: number | null;
}

export interface SessionSummary {
  sessionDate: string;
  clubType: string;
  shotCount: number;
  avgClubSpeed: number | null;
  avgBallSpeed: number | null;
  avgSmashFactor: number | null;
  avgCarryDistance: number | null;
  avgTotalDistance: number | null;
  avgLaunchAngle: number | null;
  avgSpinRate: number | null;
  avgAttackAngle: number | null;
  avgClubPath: number | null;
  avgClubFace: number | null;
  avgCarryDeviation: number | null;
  avgTotalDeviation: number | null;
  maxClubSpeed: number | null;
  maxCarryDistance: number | null;
  maxTotalDistance: number | null;
}

export type MetricKey = 
  | "maxClubSpeed"
  | "maxCarryDistance"
  | "maxTotalDistance"
  | "avgClubSpeed"
  | "avgBallSpeed"
  | "avgSmashFactor"
  | "avgCarryDistance"
  | "avgTotalDistance"
  | "avgLaunchAngle"
  | "avgSpinRate"
  | "avgAttackAngle"
  | "avgClubPath"
  | "avgClubFace"
  | "avgCarryDeviation"
  | "avgTotalDeviation";

export const METRIC_CONFIG: Record<MetricKey, { label: string; unit: string; decimals: number; higherIsBetter: boolean }> = {
  maxClubSpeed: { label: "Max Club Speed", unit: "mph", decimals: 1, higherIsBetter: true },
  maxCarryDistance: { label: "Max Carry", unit: "yds", decimals: 1, higherIsBetter: true },
  maxTotalDistance: { label: "Max Total", unit: "yds", decimals: 1, higherIsBetter: true },
  avgClubSpeed: { label: "Avg Club Speed", unit: "mph", decimals: 1, higherIsBetter: true },
  avgBallSpeed: { label: "Avg Ball Speed", unit: "mph", decimals: 1, higherIsBetter: true },
  avgSmashFactor: { label: "Avg Smash Factor", unit: "", decimals: 3, higherIsBetter: true },
  avgCarryDistance: { label: "Avg Carry Distance", unit: "yds", decimals: 1, higherIsBetter: true },
  avgTotalDistance: { label: "Avg Total Distance", unit: "yds", decimals: 1, higherIsBetter: true },
  avgLaunchAngle: { label: "Avg Launch Angle", unit: "°", decimals: 1, higherIsBetter: false },
  avgSpinRate: { label: "Avg Spin Rate", unit: "rpm", decimals: 0, higherIsBetter: false },
  avgAttackAngle: { label: "Avg Attack Angle", unit: "°", decimals: 1, higherIsBetter: false },
  avgClubPath: { label: "Avg Club Path", unit: "°", decimals: 1, higherIsBetter: false },
  avgClubFace: { label: "Avg Club Face", unit: "°", decimals: 1, higherIsBetter: false },
  avgCarryDeviation: { label: "Avg Carry Deviation", unit: "yds", decimals: 1, higherIsBetter: false },
  avgTotalDeviation: { label: "Avg Total Deviation", unit: "yds", decimals: 1, higherIsBetter: false },
};
