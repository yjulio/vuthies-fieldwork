export const INTERVIEW_STATUS: Record<number, string> = {
  [-1]: "Deleted",
  0: "Restored",
  20: "Created",
  40: "Supervisor assigned",
  60: "Interviewer assigned",
  65: "Rejected by supervisor",
  80: "Ready for interview",
  85: "Sent to tablet",
  95: "Restarted",
  100: "Completed",
  120: "Approved by supervisor",
  125: "Rejected by headquarters",
  130: "Approved by headquarters",
};

export const INTERVIEW_ACTION: Record<number, string> = {
  0: "Supervisor assigned",
  1: "Interviewer assigned",
  2: "First answer set",
  3: "Completed",
  4: "Restarted",
  5: "Approved by supervisor",
  6: "Approved by headquarters",
  7: "Rejected by supervisor",
  8: "Rejected by headquarters",
  9: "Deleted",
  10: "Restored",
  11: "Unapproved by headquarters",
  12: "Created",
  13: "Received by tablet",
  14: "Resumed",
  15: "Paused",
  16: "Translation switched",
  17: "Opened by supervisor",
  18: "Closed by supervisor",
  19: "Switched to CAWI",
  20: "Switched to CAPI",
  21: "Received by supervisor",
};

export const ROLE: Record<number, string> = {
  0: "Unknown",
  1: "Interviewer",
  2: "Supervisor",
  3: "Headquarters",
  4: "Administrator",
  5: "API user",
};

export const ASSIGNMENT_ACTION: Record<number, string> = {
  0: "Unknown",
  1: "Created",
  2: "Archived",
  3: "Deleted",
  4: "Received by tablet",
  5: "Unarchived",
  6: "Audio recording changed",
  7: "Reassigned",
  8: "Quantity changed",
  9: "Web mode changed",
  10: "Target area changed",
  11: "Completed",
  12: "Closed",
  13: "Reopened",
};

export const SUBMITTED_STATUSES = new Set([100, 120, 125, 130]);

export const BUCKET_LABEL: Record<string, string> = {
  hqApproved: "HQ approved",
  awaitingHq: "With headquarters",
  hqRejected: "HQ rejected",
  awaitingSupervisor: "With supervisor",
  returned: "Returned to interviewer",
  restarted: "Restarted",
  inProgress: "Interview underway",
  notStarted: "Assigned, not started",
  notAssigned: "With supervisor, not assigned",
  created: "Created",
  deleted: "Deleted",
  other: "Other status",
};

export const FLAG_LABEL: Record<string, string> = {
  "very-short": "Very short interview",
  short: "Short interview",
  "missing-gps": "Missing GPS",
  "poor-gps": "Weak GPS accuracy",
  "outside-vanuatu": "GPS outside Vanuatu",
  "open-errors": "Validation errors",
  "high-errors": "Many validation errors",
  "repeat-rejection": "Rejected more than once",
  "stale-field": "Still in the field after 10 days",
  "stale-supervisor": "Waiting on a supervisor",
  "stale-hq": "Waiting on headquarters",
};

export function statusLabel(code: number): string {
  return INTERVIEW_STATUS[code] ?? `Status ${code}`;
}

export function actionLabel(code: number): string {
  return INTERVIEW_ACTION[code] ?? `Action ${code}`;
}

export function roleLabel(code: number): string {
  return ROLE[code] ?? `Role ${code}`;
}

export function bucketFor(status: number, started: boolean): string {
  if (status === 130) return "hqApproved";
  if (status === 120) return "awaitingHq";
  if (status === 125) return "hqRejected";
  if (status === 100) return "awaitingSupervisor";
  if (status === 65) return "returned";
  if (status === 95) return "restarted";
  if (status === 60 || status === 80 || status === 85) {
    return started ? "inProgress" : "notStarted";
  }
  if (status === 40) return "notAssigned";
  if (status === 20) return "created";
  if (status === -1) return "deleted";
  return "other";
}

const PROVINCE_BY_CODE: Record<string, string> = {
  "1": "Torba",
  "2": "Sanma",
  "3": "Penama",
  "4": "Malampa",
  "5": "Shefa",
  "6": "Tafea",
};

/** VNSO province codes, used only when a province column is numeric and unlabeled. */
export function fallbackProvince(code: string): string | null {
  return PROVINCE_BY_CODE[code] ?? null;
}
