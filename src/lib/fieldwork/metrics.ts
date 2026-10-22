import { BUCKET_LABEL, FLAG_LABEL, SUBMITTED_STATUSES } from "@/lib/suso/codes";
import type { Assignment, FieldworkSnapshot, Filters, Interview } from "@/lib/fieldwork/types";

export type CollectionProgress = {
  collected: number;
  hqApproved: number;
  sample: number | null;
  rate: number | null;
  remaining: number | null;
};

export type CollectionScope = {
  province: string;
  island: string;
  round: string;
};

export type Kpis = {
  households: number;
  target: number | null;
  unopened: number;
  submitted: number;
  hqApproved: number;
  withSupervisor: number;
  withHq: number;
  inField: number;
  notStarted: number;
  responseRate: number | null;
  responded: number;
  finalizedKnown: number;
  medianDuration: number | null;
  gpsCoverage: number | null;
  gpsKnown: number;
  persons: number;
  openErrors: number;
  flagged: number;
};

export type GroupRow = {
  key: string;
  label: string;
  parent?: string;
  households: number;
  submitted: number;
  hqApproved: number;
  withSupervisor: number;
  withHq: number;
  inField: number;
  responseRate: number | null;
  medianDuration: number | null;
  gpsCoverage: number | null;
  openErrors: number;
  shortInterviews: number;
  persons: number;
};

export type InterviewerRow = {
  login: string;
  supervisor: string;
  province: string;
  households: number;
  inField: number;
  submitted: number;
  hqApproved: number;
  rejectionRate: number | null;
  medianDuration: number | null;
  veryShort: number;
  missingGps: number;
  lastActivity: string | null;
};

export type RoundRow = {
  round: number;
  households: number;
  hqApproved: number;
  submitted: number;
  inField: number;
  unopened: number;
};

export type DayRow = {
  date: string;
  completed: number;
  hqApproved: number;
  rejected: number;
};

export type Alert = {
  severity: "high" | "watch";
  title: string;
  detail: string;
};

export function applyFilters(interviews: Interview[], filters: Filters): Interview[] {
  const query = filters.query.trim().toLowerCase();
  return interviews.filter((interview) => {
    if (filters.province && interview.province !== filters.province) return false;
    if (filters.island && interview.island !== filters.island) return false;
    if (filters.round && String(interview.round ?? "") !== filters.round) return false;
    if (filters.bucket && interview.bucket !== filters.bucket) return false;
    if (filters.interviewer && interview.interviewer !== filters.interviewer) return false;
    if (filters.flag && !interview.flags.includes(filters.flag)) return false;
    if (!query) return true;
    const haystack = [
      interview.key,
      interview.ea,
      interview.interviewer,
      interview.supervisor,
      interview.island,
      interview.areaCouncil,
      interview.province,
      interview.locality,
      interview.assignmentId,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });
}

export function collectionProgress(
  interviews: Interview[],
  assignments: Assignment[],
  target: number | null,
): CollectionProgress {
  const collected = interviews.filter((interview) => SUBMITTED_STATUSES.has(interview.status)).length;
  const hqApproved = interviews.filter((interview) => interview.status === 130).length;
  const openedIds = new Set(interviews.map((interview) => interview.assignmentId).filter(Boolean));
  const unopened = assignments
    .filter((assignment) => !assignment.deleted && !assignment.archived && !openedIds.has(assignment.id))
    .reduce((sum, assignment) => sum + (assignment.quantity ?? 1), 0);
  const sample = target ?? interviews.length + unopened;
  return {
    collected,
    hqApproved,
    sample: sample > 0 ? sample : null,
    rate: sample > 0 ? collected / sample : null,
    remaining: sample > 0 ? Math.max(0, sample - collected) : null,
  };
}

export function collectionForScope(
  interviews: Interview[],
  assignments: Assignment[],
  scope: CollectionScope,
  target: number | null,
): CollectionProgress {
  if (!scope.province && !scope.island && !scope.round) {
    return collectionProgress(interviews, assignments, target);
  }
  const matchedInterviews = interviews.filter((interview) => matchesScope(interview, scope));
  const matchedAssignments = assignments.filter((assignment) => matchesScope(assignment, scope));
  return collectionProgress(matchedInterviews, matchedAssignments, null);
}

function matchesScope(
  row: { province: string | null; island: string | null; round: number | null },
  scope: CollectionScope,
): boolean {
  if (scope.province && row.province !== scope.province) return false;
  if (scope.island && row.island !== scope.island) return false;
  if (scope.round && String(row.round ?? "") !== scope.round) return false;
  return true;
}

export function kpis(interviews: Interview[], assignments: Assignment[], target: number | null): Kpis {
  const submitted = interviews.filter((interview) => SUBMITTED_STATUSES.has(interview.status));
  const known = submitted.filter((interview) => interview.resultClass !== "unknown");
  const responded = known.filter(
    (interview) => interview.resultClass === "complete" || interview.resultClass === "partial",
  );
  const gpsBase = submitted.filter(
    (interview) => interview.resultClass === "complete" || interview.resultClass === "partial",
  );
  const gpsKnown = gpsBase.filter((interview) => interview.latitude != null && interview.longitude != null && insideVanuatu(interview));
  const openedIds = new Set(interviews.map((interview) => interview.assignmentId).filter(Boolean));
  const unopened = assignments.filter(
    (assignment) => !assignment.deleted && !assignment.archived && !openedIds.has(assignment.id),
  );

  return {
    households: interviews.length,
    target,
    unopened: unopened.reduce((sum, assignment) => sum + (assignment.quantity ?? 1), 0),
    submitted: submitted.length,
    hqApproved: interviews.filter((interview) => interview.status === 130).length,
    withSupervisor: interviews.filter((interview) => interview.status === 100 || interview.status === 125).length,
    withHq: interviews.filter((interview) => interview.status === 120).length,
    inField: interviews.filter((interview) =>
      ["inProgress", "returned", "restarted", "notStarted"].includes(interview.bucket),
    ).length,
    notStarted: interviews.filter((interview) => interview.bucket === "notStarted" || interview.bucket === "notAssigned").length,
    responseRate: known.length ? responded.length / known.length : null,
    responded: responded.length,
    finalizedKnown: known.length,
    medianDuration: median(submitted.map((interview) => interview.durationMinutes).filter((value): value is number => value != null)),
    gpsCoverage: gpsBase.length ? gpsKnown.length / gpsBase.length : null,
    gpsKnown: gpsBase.length,
    persons: interviews.reduce((sum, interview) => sum + (interview.members ?? 0), 0),
    openErrors: interviews.reduce((sum, interview) => sum + interview.errors, 0),
    flagged: interviews.filter((interview) => interview.flags.length > 0).length,
  };
}

export function groupBy(
  interviews: Interview[],
  keyOf: (interview: Interview) => { key: string; label: string; parent?: string },
): GroupRow[] {
  const groups = new Map<string, Interview[]>();
  const labels = new Map<string, { label: string; parent?: string }>();
  for (const interview of interviews) {
    const key = keyOf(interview);
    const list = groups.get(key.key);
    if (list) list.push(interview);
    else groups.set(key.key, [interview]);
    labels.set(key.key, { label: key.label, parent: key.parent });
  }

  return [...groups.entries()]
    .map(([key, rows]) => {
      const submitted = rows.filter((interview) => SUBMITTED_STATUSES.has(interview.status));
      const known = submitted.filter((interview) => interview.resultClass !== "unknown");
      const responded = known.filter(
        (interview) => interview.resultClass === "complete" || interview.resultClass === "partial",
      );
      const gpsBase = submitted.filter(
        (interview) => interview.resultClass === "complete" || interview.resultClass === "partial",
      );
      const meta = labels.get(key)!;
      return {
        key,
        label: meta.label,
        parent: meta.parent,
        households: rows.length,
        submitted: submitted.length,
        hqApproved: rows.filter((interview) => interview.status === 130).length,
        withSupervisor: rows.filter((interview) => interview.status === 100 || interview.status === 125).length,
        withHq: rows.filter((interview) => interview.status === 120).length,
        inField: rows.filter((interview) =>
          ["inProgress", "returned", "restarted", "notStarted"].includes(interview.bucket),
        ).length,
        responseRate: known.length ? responded.length / known.length : null,
        medianDuration: median(
          submitted.map((interview) => interview.durationMinutes).filter((value): value is number => value != null),
        ),
        gpsCoverage: gpsBase.length
          ? gpsBase.filter((interview) => interview.latitude != null && insideVanuatu(interview)).length / gpsBase.length
          : null,
        openErrors: rows.reduce((sum, interview) => sum + interview.errors, 0),
        shortInterviews: rows.filter((interview) => interview.flags.includes("short") || interview.flags.includes("very-short")).length,
        persons: rows.reduce((sum, interview) => sum + (interview.members ?? 0), 0),
      };
    })
    .sort((a, b) => b.households - a.households);
}

export function interviewerRows(interviews: Interview[]): InterviewerRow[] {
  const groups = new Map<string, Interview[]>();
  for (const interview of interviews) {
    const login = interview.interviewer ?? "Unassigned";
    const list = groups.get(login);
    if (list) list.push(interview);
    else groups.set(login, [interview]);
  }

  return [...groups.entries()]
    .map(([login, rows]) => {
      const submitted = rows.filter((interview) => SUBMITTED_STATUSES.has(interview.status));
      const rejected = submitted.filter((interview) => interview.rejectionsSup + interview.rejectionsHq > 0);
      const province = mode(rows.map((interview) => interview.province));
      const supervisor = mode(rows.map((interview) => interview.supervisor ?? "—"));
      let last = "";
      for (const interview of rows) {
        for (const event of interview.events) {
          if (event.at > last) last = event.at;
        }
      }
      return {
        login,
        supervisor,
        province,
        households: rows.length,
        inField: rows.filter((interview) =>
          ["inProgress", "returned", "restarted", "notStarted"].includes(interview.bucket),
        ).length,
        submitted: submitted.length,
        hqApproved: rows.filter((interview) => interview.status === 130).length,
        rejectionRate: submitted.length ? rejected.length / submitted.length : null,
        medianDuration: median(
          submitted.map((interview) => interview.durationMinutes).filter((value): value is number => value != null),
        ),
        veryShort: rows.filter((interview) => interview.flags.includes("very-short")).length,
        missingGps: rows.filter((interview) => interview.flags.includes("missing-gps")).length,
        lastActivity: last || null,
      };
    })
    .sort((a, b) => b.households - a.households);
}

export function roundRows(interviews: Interview[], assignments: Assignment[]): RoundRow[] {
  const maxRound = Math.max(
    32,
    ...interviews.map((interview) => interview.round ?? 0),
    ...assignments.map((assignment) => assignment.round ?? 0),
  );
  const opened = new Set(interviews.map((interview) => interview.assignmentId).filter(Boolean));
  const rows: RoundRow[] = [];
  for (let round = 1; round <= maxRound; round++) {
    const inRound = interviews.filter((interview) => interview.round === round);
    const unopened = assignments.filter(
      (assignment) =>
        assignment.round === round &&
        !assignment.deleted &&
        !assignment.archived &&
        !opened.has(assignment.id),
    );
    rows.push({
      round,
      households: inRound.length,
      hqApproved: inRound.filter((interview) => interview.status === 130).length,
      submitted: inRound.filter((interview) => SUBMITTED_STATUSES.has(interview.status)).length,
      inField: inRound.filter((interview) =>
        ["inProgress", "returned", "restarted", "notStarted"].includes(interview.bucket),
      ).length,
      unopened: unopened.reduce((sum, assignment) => sum + (assignment.quantity ?? 0), 0),
    });
  }
  return rows;
}

export function dailyActivity(interviews: Interview[], asOf: string): DayRow[] {
  const counts = new Map<string, DayRow>();
  for (const interview of interviews) {
    for (const event of interview.events) {
      const date = event.at.slice(0, 10);
      if (!date) continue;
      const row = counts.get(date) ?? { date, completed: 0, hqApproved: 0, rejected: 0 };
      if (event.actionCode === 3) row.completed += 1;
      if (event.actionCode === 6) row.hqApproved += 1;
      if (event.actionCode === 7 || event.actionCode === 8) row.rejected += 1;
      counts.set(date, row);
    }
  }
  const end = asOf.slice(0, 10);
  const start = addDays(end, -83);
  const days: DayRow[] = [];
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
    days.push(counts.get(cursor) ?? { date: cursor, completed: 0, hqApproved: 0, rejected: 0 });
  }
  return days;
}

export function alerts(interviews: Interview[]): Alert[] {
  const items: Alert[] = [];
  const rows = interviewerRows(interviews);
  for (const row of rows) {
    if (row.submitted < 4) continue;
    const short = interviews.filter(
      (interview) =>
        interview.interviewer === row.login &&
        (interview.flags.includes("very-short") || interview.flags.includes("short")),
    ).length;
    if (short / row.submitted >= 0.45) {
      items.push({
        severity: "high",
        title: `${row.login} has short interviews`,
        detail: `${short} of ${row.submitted} submitted cases finished in under 90 minutes. A full HIES interview is usually much longer.`,
      });
    }
    if (row.missingGps / row.submitted >= 0.35) {
      items.push({
        severity: "high",
        title: `${row.login} is missing dwelling GPS`,
        detail: `${row.missingGps} submitted responding households have no coordinates.`,
      });
    }
    if (row.rejectionRate != null && row.rejectionRate >= 0.35) {
      items.push({
        severity: "watch",
        title: `${row.login} is being sent back often`,
        detail: `${Math.round(row.rejectionRate * 100)}% of submitted cases have at least one rejection.`,
      });
    }
  }

  const staleSupervisor = interviews.filter((interview) => interview.flags.includes("stale-supervisor")).length;
  if (staleSupervisor >= 8) {
    items.push({
      severity: "watch",
      title: `${staleSupervisor} cases are waiting on a supervisor`,
      detail: "Completed interviews still in the supervisor queue more than five days after submission.",
    });
  }
  const staleHq = interviews.filter((interview) => interview.flags.includes("stale-hq")).length;
  if (staleHq >= 8) {
    items.push({
      severity: "watch",
      title: `${staleHq} cases are waiting on headquarters`,
      detail: "Supervisor-approved interviews have not had an HQ decision for more than seven days.",
    });
  }

  const repeats = interviews.filter((interview) => interview.flags.includes("repeat-rejection")).length;
  if (repeats > 0) {
    items.push({
      severity: "watch",
      title: `${repeats} cases were rejected more than once`,
      detail: "Open the case register and filter on repeated rejection to see the comments.",
    });
  }

  const provinces = groupBy(interviews, (interview) => ({ key: interview.province, label: interview.province }));
  const overallApproved =
    interviews.length === 0
      ? 0
      : interviews.filter((interview) => interview.status === 130).length / interviews.length;
  for (const province of provinces) {
    if (province.households < 20) continue;
    const share = province.hqApproved / province.households;
    if (overallApproved - share >= 0.15) {
      items.push({
        severity: "watch",
        title: `${province.label} is behind on HQ approval`,
        detail: `${Math.round(share * 100)}% of households in this province are HQ approved, against ${Math.round(overallApproved * 100)}% overall.`,
      });
    }
  }

  const rank = { high: 0, watch: 1 };
  return items.sort((a, b) => rank[a.severity] - rank[b.severity]).slice(0, 8);
}

export function workflowSteps(interviews: Interview[]) {
  const count = (buckets: string[]) =>
    interviews.filter((interview) => buckets.includes(interview.bucket)).length;
  return [
    { id: "notStarted", label: "Not started", count: count(["notStarted", "notAssigned", "created"]) },
    { id: "inProgress", label: "Underway", count: count(["inProgress", "returned", "restarted"]) },
    { id: "awaitingSupervisor", label: "Supervisor", count: count(["awaitingSupervisor", "hqRejected"]) },
    { id: "awaitingHq", label: "Headquarters", count: count(["awaitingHq"]) },
    { id: "hqApproved", label: "HQ approved", count: count(["hqApproved"]) },
  ];
}

export function resultMix(interviews: Interview[]) {
  const submitted = interviews.filter((interview) => SUBMITTED_STATUSES.has(interview.status));
  const order = ["complete", "partial", "refused", "noncontact", "vacant", "other", "unknown"] as const;
  const labels: Record<string, string> = {
    complete: "Complete",
    partial: "Partial",
    refused: "Refused",
    noncontact: "No contact",
    vacant: "Vacant",
    other: "Other",
    unknown: "Result not coded",
  };
  return order
    .map((key) => ({
      key,
      label: labels[key],
      count: submitted.filter((interview) => interview.resultClass === key).length,
    }))
    .filter((row) => row.count > 0);
}

export function insideVanuatu(interview: Interview): boolean {
  if (interview.latitude == null || interview.longitude == null) return false;
  return (
    interview.latitude <= -12.5 &&
    interview.latitude >= -21.5 &&
    interview.longitude >= 166 &&
    interview.longitude <= 171.2
  );
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

export function bucketOptions(interviews: Interview[]): string[] {
  const present = new Set(interviews.map((interview) => interview.bucket));
  return Object.keys(BUCKET_LABEL).filter((bucket) => present.has(bucket));
}

export function flagOptions(interviews: Interview[]): string[] {
  const present = new Set(interviews.flatMap((interview) => interview.flags));
  return Object.keys(FLAG_LABEL).filter((flag) => present.has(flag));
}

export function snapshotSummary(snapshot: FieldworkSnapshot) {
  return kpis(snapshot.interviews, snapshot.assignments, snapshot.meta.targetHouseholds);
}

function mode(values: string[]): string {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  let best = "—";
  let n = -1;
  for (const [value, count] of counts) {
    if (count > n) {
      best = value;
      n = count;
    }
  }
  return best;
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export { BUCKET_LABEL, FLAG_LABEL };
