import { insideVanuatu, median } from "@/lib/fieldwork/metrics";
import type { Assignment, Interview } from "@/lib/fieldwork/types";
import { SUBMITTED_STATUSES } from "@/lib/suso/codes";

export const SURVEY_ROUNDS = 32;

export const PROVINCE_ORDER = ["Torba", "Sanma", "Penama", "Malampa", "Shefa", "Tafea"];

export type RoundComparison = {
  round: number;
  households: number;
  unopened: number;
  hqApproved: number;
  withHq: number;
  withSupervisor: number;
  inField: number;
  notStarted: number;
  other: number;
  submitted: number;
  responseRate: number | null;
  gpsCoverage: number | null;
  medianDuration: number | null;
  short: number;
  missingGps: number;
  complete: number;
  partial: number;
  refused: number;
  noncontact: number;
  vacant: number;
  otherResult: number;
};

export type HeatCell = {
  province: string;
  round: number;
  households: number;
  share: number | null;
};

export function roundComparison(interviews: Interview[], assignments: Assignment[]): RoundComparison[] {
  const byRound = new Map<number, Interview[]>();
  for (const interview of interviews) {
    if (interview.round == null || interview.round < 1) continue;
    const list = byRound.get(interview.round) ?? [];
    list.push(interview);
    byRound.set(interview.round, list);
  }

  const opened = new Set(interviews.map((interview) => interview.assignmentId).filter((id): id is string => Boolean(id)));
  const unopened = new Map<number, number>();
  for (const assignment of assignments) {
    if (assignment.deleted || assignment.archived || assignment.round == null) continue;
    if (opened.has(assignment.id)) continue;
    unopened.set(assignment.round, (unopened.get(assignment.round) ?? 0) + (assignment.quantity ?? 0));
  }

  const last = Math.max(SURVEY_ROUNDS, ...byRound.keys(), ...unopened.keys(), 0);
  const rows: RoundComparison[] = [];
  for (let round = 1; round <= last; round++) {
    rows.push(summariseRound(round, byRound.get(round) ?? [], unopened.get(round) ?? 0));
  }
  return rows;
}

export function provinceRoundHeatmap(interviews: Interview[], roundCount = SURVEY_ROUNDS): {
  provinces: string[];
  rounds: number[];
  cells: HeatCell[];
} {
  const seen = new Set(interviews.map((interview) => interview.province).filter((province) => province && province !== "Uncoded"));
  const provinces = [
    ...PROVINCE_ORDER.filter((province) => seen.has(province)),
    ...[...seen].filter((province) => !PROVINCE_ORDER.includes(province)).sort(),
  ];
  const list = provinces.length > 0 ? provinces : PROVINCE_ORDER;
  const maxRound = Math.max(roundCount, ...interviews.map((interview) => interview.round ?? 0));
  const counts = new Map<string, { households: number; hqApproved: number }>();
  for (const interview of interviews) {
    if (interview.round == null) continue;
    const key = `${interview.province}|${interview.round}`;
    const current = counts.get(key) ?? { households: 0, hqApproved: 0 };
    current.households += 1;
    if (interview.status === 130) current.hqApproved += 1;
    counts.set(key, current);
  }
  const rounds = Array.from({ length: maxRound }, (_, index) => index + 1);
  const cells: HeatCell[] = [];
  for (const province of list) {
    for (const round of rounds) {
      const current = counts.get(`${province}|${round}`);
      cells.push({
        province,
        round,
        households: current?.households ?? 0,
        share: current && current.households > 0 ? current.hqApproved / current.households : null,
      });
    }
  }
  return { provinces: list, rounds, cells };
}

export function assignmentsForView(assignments: Assignment[], province: string, island: string): Assignment[] {
  return assignments.filter((assignment) => {
    if (province && assignment.province && assignment.province !== province) return false;
    if (island && assignment.island && assignment.island !== island) return false;
    return true;
  });
}

function summariseRound(round: number, interviews: Interview[], unopened: number): RoundComparison {
  const row: RoundComparison = {
    round,
    households: interviews.length,
    unopened,
    hqApproved: 0,
    withHq: 0,
    withSupervisor: 0,
    inField: 0,
    notStarted: 0,
    other: 0,
    submitted: 0,
    responseRate: null,
    gpsCoverage: null,
    medianDuration: null,
    short: 0,
    missingGps: 0,
    complete: 0,
    partial: 0,
    refused: 0,
    noncontact: 0,
    vacant: 0,
    otherResult: 0,
  };
  const durations: number[] = [];
  let known = 0;
  let responded = 0;
  let gpsBase = 0;
  let gpsHit = 0;

  for (const interview of interviews) {
    if (interview.bucket === "hqApproved") row.hqApproved += 1;
    else if (interview.bucket === "awaitingHq") row.withHq += 1;
    else if (interview.bucket === "awaitingSupervisor" || interview.bucket === "hqRejected") row.withSupervisor += 1;
    else if (interview.bucket === "inProgress" || interview.bucket === "returned" || interview.bucket === "restarted") row.inField += 1;
    else if (interview.bucket === "notStarted" || interview.bucket === "notAssigned" || interview.bucket === "created") row.notStarted += 1;
    else row.other += 1;

    if (!SUBMITTED_STATUSES.has(interview.status)) continue;
    row.submitted += 1;
    if (interview.durationMinutes != null) durations.push(interview.durationMinutes);
    if (interview.flags.includes("short") || interview.flags.includes("very-short")) row.short += 1;

    if (interview.resultClass === "complete") row.complete += 1;
    else if (interview.resultClass === "partial") row.partial += 1;
    else if (interview.resultClass === "refused") row.refused += 1;
    else if (interview.resultClass === "noncontact") row.noncontact += 1;
    else if (interview.resultClass === "vacant") row.vacant += 1;
    else row.otherResult += 1;

    if (interview.resultClass !== "unknown") {
      known += 1;
      if (interview.resultClass === "complete" || interview.resultClass === "partial") responded += 1;
    }
    if (interview.resultClass === "complete" || interview.resultClass === "partial") {
      gpsBase += 1;
      if (interview.latitude != null && interview.longitude != null && insideVanuatu(interview)) gpsHit += 1;
      if (interview.flags.includes("missing-gps")) row.missingGps += 1;
    }
  }

  row.responseRate = known > 0 ? responded / known : null;
  row.gpsCoverage = gpsBase > 0 ? gpsHit / gpsBase : null;
  row.medianDuration = median(durations);
  return row;
}
