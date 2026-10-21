export type WorkflowEvent = {
  at: string;
  action: string;
  actionCode: number;
  by: string;
  role: string;
};

export type CaseNote = {
  at: string;
  by: string;
  role: string;
  variable: string;
  text: string;
};

export type CaseError = {
  variable: string;
  message: string;
};

export type Interview = {
  id: string;
  key: string;
  assignmentId: string | null;
  status: number;
  statusLabel: string;
  bucket: string;
  interviewer: string | null;
  supervisor: string | null;
  responsible: string | null;
  province: string;
  island: string;
  areaCouncil: string;
  ea: string;
  locality: string;
  urbanRural: string;
  round: number | null;
  hhSerial: string;
  resultCode: string | null;
  resultLabel: string | null;
  resultClass: ResultClass;
  latitude: number | null;
  longitude: number | null;
  gpsAccuracy: number | null;
  durationMinutes: number | null;
  errors: number;
  rejectionsSup: number;
  rejectionsHq: number;
  commentCount: number;
  members: number | null;
  maleMembers: number | null;
  femaleMembers: number | null;
  startedAt: string | null;
  completedAt: string | null;
  supervisorApprovedAt: string | null;
  hqApprovedAt: string | null;
  assignedAt: string | null;
  events: WorkflowEvent[];
  notes: CaseNote[];
  errorSamples: CaseError[];
  flags: string[];
};

export type ResultClass =
  | "complete"
  | "partial"
  | "refused"
  | "noncontact"
  | "vacant"
  | "other"
  | "unknown";

export type Assignment = {
  id: string;
  quantity: number | null;
  archived: boolean;
  deleted: boolean;
  interviewer: string | null;
  supervisor: string | null;
  round: number | null;
  province: string | null;
  island: string | null;
  ea: string | null;
};

export type FieldworkSnapshot = {
  meta: {
    source: "demonstration" | "survey-solutions";
    fileName: string;
    questionnaire: string | null;
    susoVersion: string | null;
    exportedAt: string | null;
    asOf: string;
    note: string;
    filesUsed: string[];
    filesIgnored: string[];
    filesSkipped: string[];
    targetHouseholds: number | null;
    publishedDesign: { households: number; rounds: number; note: string } | null;
  };
  interviews: Interview[];
  assignments: Assignment[];
};

export type Filters = {
  province: string;
  island: string;
  round: string;
  bucket: string;
  interviewer: string;
  flag: string;
  query: string;
};

export const EMPTY_FILTERS: Filters = {
  province: "",
  island: "",
  round: "",
  bucket: "",
  interviewer: "",
  flag: "",
  query: "",
};
