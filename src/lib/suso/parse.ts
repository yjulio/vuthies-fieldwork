import {
  ASSIGNMENT_ACTION,
  actionLabel,
  bucketFor,
  fallbackProvince,
  FLAG_LABEL,
  roleLabel,
  statusLabel,
  SUBMITTED_STATUSES,
} from "@/lib/suso/codes";
import {
  cell,
  daysBetween,
  fileStem,
  findHeader,
  normalizeHeader,
  numericCode,
  parseDelimited,
  parseDurationMinutes,
  parseNumber,
  type Table,
} from "@/lib/suso/table";
import type {
  Assignment,
  CaseError,
  CaseNote,
  FieldworkSnapshot,
  Interview,
  ResultClass,
  WorkflowEvent,
} from "@/lib/fieldwork/types";

const SYSTEM_STEMS = new Set([
  "interview__actions",
  "interview__comments",
  "interview__diagnostics",
  "interview__errors",
  "assignment__actions",
]);

const WORKFLOW_ACTIONS = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 21]);

type Labeled = Map<string, Map<string, string>>;

type Options = {
  fileName?: string;
  skipped?: string[];
};

export function parseSurveyExport(
  files: Record<string, string>,
  options: Options = {},
): FieldworkSnapshot {
  const entries = Object.entries(files).filter(([, text]) => text != null);
  if (entries.length === 0) {
    throw new Error("The zip has no readable files.");
  }

  const stataOnly = entries.some(([name]) => name.toLowerCase().endsWith(".dta"));
  const tabular = entries.some((name) => /\.(tab|csv|txt)$/i.test(name[0]));
  if (stataOnly && !tabular) {
    throw new Error(
      "This looks like a Stata export. Download the Tabular export from Survey Solutions Headquarters.",
    );
  }

  const readme = textOf(entries, /export__readme\.txt$/i);
  const infoJson = textOf(entries, /export__info\.json$/i);
  const labels = parseDoLabels(entries.filter(([name]) => name.toLowerCase().endsWith(".do")));
  const metaBits = readMeta(readme, infoJson);

  const tables = new Map<string, { name: string; table: Table }>();
  for (const [name, text] of entries) {
    if (!/\.(tab|csv|txt)$/i.test(name)) continue;
    if (/export__readme\.txt$/i.test(name)) continue;
    tables.set(name, { name, table: parseDelimited(text) });
  }

  const diagnostics = findSystem(tables, "interview__diagnostics");
  const actions = findSystem(tables, "interview__actions");
  const comments = findSystem(tables, "interview__comments");
  const errors = findSystem(tables, "interview__errors");
  const assignmentActions = findSystem(tables, "assignment__actions");

  const dataTables = [...tables.values()].filter(
    (entry) => !SYSTEM_STEMS.has(fileStem(entry.name).toLowerCase()),
  );

  const diagCount = diagnostics?.table.rows.length ?? 0;
  const ranked = dataTables
    .map((entry) => ({
      entry,
      score: scoreCover(entry.table, diagCount),
    }))
    .sort((a, b) => b.score - a.score);

  const cover = ranked[0]?.score > 0 ? ranked[0].entry : null;
  const member = pickMemberTable(dataTables, cover?.table.rows.length ?? diagCount);

  const filesUsed = [
    diagnostics?.name,
    actions?.name,
    comments?.name,
    errors?.name,
    assignmentActions?.name,
    cover?.name,
    member?.name,
    readme ? "export__readme.txt" : null,
  ].filter((name): name is string => Boolean(name));

  const used = new Set(filesUsed.map((name) => name.toLowerCase()));
  const filesIgnored = dataTables
    .map((entry) => entry.name)
    .filter((name) => !used.has(name.toLowerCase()));

  const actionIndex = indexByInterview(actions?.table, "actions");
  const commentIndex = indexByInterview(comments?.table, "comments");
  const errorIndex = indexByInterview(errors?.table, "errors");
  const memberIndex = indexMembers(member?.table);

  const spine = new Map<string, Record<string, string>>();
  if (diagnostics) {
    const idHeader = headerOf(diagnostics.table, [/^interview__id$/]);
    for (const row of diagnostics.table.rows) {
      const id = cell(row, idHeader);
      if (id) spine.set(id, row);
    }
  }

  const coverById = new Map<string, Record<string, string>>();
  let coverCols: CoverColumns | null = null;
  if (cover) {
    coverCols = coverColumns(cover.table.headers);
    const idHeader = coverCols.id;
    for (const row of cover.table.rows) {
      const id = cell(row, idHeader);
      if (id) coverById.set(id, row);
    }
    if (spine.size === 0) {
      for (const [id, row] of coverById) spine.set(id, row);
    }
  }

  if (spine.size === 0 && actions) {
    const idHeader = headerOf(actions.table, [/^interview__id$/]);
    for (const row of actions.table.rows) {
      const id = cell(row, idHeader);
      if (id && !spine.has(id)) spine.set(id, {});
    }
  }

  if (spine.size === 0) {
    throw new Error(
      "No interviews found. The zip needs interview__diagnostics, interview__actions, or the household cover file.",
    );
  }

  const assignments = assignmentActions
    ? parseAssignments(assignmentActions.table)
    : [];

  const interviews: Interview[] = [];
  for (const [id, diagRow] of spine) {
    const coverRow = coverById.get(id) ?? null;
    const built = buildInterview({
      id,
      diagRow: diagnostics ? diagRow : null,
      coverRow,
      coverCols,
      labels,
      actions: actionIndex.get(id) ?? [],
      comments: commentIndex.get(id) ?? [],
      errors: errorIndex.get(id) ?? [],
      members: memberIndex.get(id) ?? null,
    });
    if (built) interviews.push(built);
  }

  interviews.sort((a, b) => a.key.localeCompare(b.key));

  const asOf = metaBits.exportedAt?.slice(0, 10) || latestDay(interviews) || todayStamp();
  for (const interview of interviews) {
    interview.flags = flagInterview(interview, asOf);
  }

  const source = /demonstration extract/i.test(readme ?? "")
    ? "demonstration"
    : "survey-solutions";

  const questionnaire = metaBits.questionnaire;
  const vuthies = /vuthies/i.test(`${questionnaire ?? ""} ${options.fileName ?? ""}`);

  const target = targetHouseholds(assignments);

  return {
    meta: {
      source,
      fileName: options.fileName ?? "survey-solutions-export.zip",
      questionnaire,
      susoVersion: metaBits.susoVersion,
      exportedAt: metaBits.exportedAt,
      asOf,
      note:
        source === "demonstration"
          ? "Demonstration extract shaped like a Survey Solutions tabular download. These counts are synthetic and must not be quoted as VNSO fieldwork progress."
          : "Parsed in this browser from a Survey Solutions tabular export. Diary and income modules were left unread. Counts describe the file you loaded.",
      filesUsed,
      filesIgnored,
      filesSkipped: options.skipped ?? [],
      targetHouseholds: target,
      publishedDesign: vuthies
        ? {
            households: 5280,
            rounds: 32,
            note: "Published VNSO design for the 2026–27 survey. It is context only and is not a denominator unless this export contains the full sample.",
          }
        : null,
    },
    interviews,
    assignments,
  };
}

export { FLAG_LABEL };

function textOf(entries: [string, string][], pattern: RegExp): string | null {
  const found = entries.find(([name]) => pattern.test(name));
  return found ? found[1] : null;
}

function findSystem(
  tables: Map<string, { name: string; table: Table }>,
  stem: string,
) {
  for (const entry of tables.values()) {
    if (fileStem(entry.name).toLowerCase() === stem) return entry;
  }
  return null;
}

function scoreCover(table: Table, diagCount: number): number {
  const headers = table.headers;
  let score = 0;
  if (findHeader(headers, [/province/, /^prov$/, /geo_?1$/])) score += 5;
  if (findHeader(headers, [/island/, /geo_?2$/])) score += 3;
  if (findHeader(headers, [/latitude/, /__lat$/])) score += 5;
  if (findHeader(headers, [/area_?council/, /(^|_)ea$/, /enumeration_area/, /locality/, /village/])) {
    score += 3;
  }
  if (findHeader(headers, [/(^|_)result$/, /response_code/, /subround/, /^round$/, /urban_rural/])) {
    score += 2;
  }
  if (findHeader(headers, [/^interview__id$/])) score += 1;
  if (diagCount > 0 && table.rows.length > 0) {
    const ratio = table.rows.length / diagCount;
    if (ratio > 0.8 && ratio < 1.25) score += 6;
    if (ratio > 1.4) score -= 5;
  }
  return score;
}

function pickMemberTable(
  dataTables: { name: string; table: Table }[],
  coverRows: number,
) {
  let best: { name: string; table: Table } | null = null;
  let bestScore = 0;
  for (const entry of dataTables) {
    const headers = entry.table.headers;
    const hasPeople = findHeader(headers, [/^sex$/, /^gender$/, /^age$/, /relationship/, /member/]);
    const hasId = findHeader(headers, [/^interview__id$/]);
    if (!hasPeople || !hasId) continue;
    if (coverRows > 0 && entry.table.rows.length < coverRows) continue;
    const score = entry.table.rows.length + (findHeader(headers, [/^sex$/, /^gender$/]) ? 1000 : 0);
    if (score > bestScore) {
      best = entry;
      bestScore = score;
    }
  }
  return best;
}

function headerOf(table: Table | undefined, patterns: RegExp[]): string | null {
  if (!table) return null;
  return findHeader(table.headers, patterns);
}

type CoverColumns = ReturnType<typeof coverColumns>;

function coverColumns(headers: string[]) {
  return {
    id: findHeader(headers, [/^interview__id$/]),
    key: findHeader(headers, [/^interview__key$/]),
    assignmentId: findHeader(headers, [/^assignment__id$/]),
    province: findHeader(headers, [/province/, /^prov$/, /geo_?1$/]),
    island: findHeader(headers, [/island/, /geo_?2$/]),
    areaCouncil: findHeader(headers, [/area_?council/, /council$/]),
    ea: findHeader(headers, [/(^|_)ea$/, /enumeration_area/, /enum_area/]),
    locality: findHeader(headers, [/locality/, /village/, /community/]),
    urbanRural: findHeader(headers, [/urban_rural/, /^urban$/, /stratum/]),
    round: findHeader(headers, [/subround/, /^round$/, /survey_round/]),
    serial: findHeader(headers, [/hh_?serial/, /hh_?number/, /household_?number/, /^hh_?id$/, /^hhid$/]),
    result: findHeader(headers, [/(^|_)result$/, /interview_result/, /response_code/, /final_result/]),
    latitude: findHeader(headers, [/__latitude$/, /_latitude$/, /^latitude$/, /gps__lat$/]),
    longitude: findHeader(headers, [/__longitude$/, /_longitude$/, /^longitude$/, /gps__lon$/]),
    accuracy: findHeader(headers, [/__accuracy$/, /accuracy$/]),
  };
}

function indexByInterview(table: Table | undefined, kind: "actions" | "comments" | "errors") {
  const map = new Map<string, Record<string, string>[]>();
  if (!table) return map;
  const idHeader = findHeader(table.headers, [/^interview__id$/]);
  for (const row of table.rows) {
    const id = cell(row, idHeader);
    if (!id) continue;
    const list = map.get(id);
    if (list) list.push(row);
    else map.set(id, [row]);
  }
  if (kind === "actions") {
    for (const list of map.values()) {
      list.sort((a, b) => stampOf(a).localeCompare(stampOf(b)));
    }
  }
  return map;
}

function stampOf(row: Record<string, string>): string {
  const date = row.date ?? row.Date ?? "";
  const time = row.time ?? row.Time ?? "00:00:00";
  return `${date}T${time}`;
}

function indexMembers(table: Table | undefined) {
  const map = new Map<string, { members: number; male: number; female: number }>();
  if (!table) return map;
  const idHeader = findHeader(table.headers, [/^interview__id$/]);
  const sexHeader = findHeader(table.headers, [/^sex$/, /^gender$/]);
  for (const row of table.rows) {
    const id = cell(row, idHeader);
    if (!id) continue;
    const current = map.get(id) ?? { members: 0, male: 0, female: 0 };
    current.members += 1;
    const sex = numericCode(cell(row, sexHeader)).toLowerCase();
    if (sex === "1" || sex === "male" || sex === "m") current.male += 1;
    if (sex === "2" || sex === "female" || sex === "f") current.female += 1;
    map.set(id, current);
  }
  return map;
}

function buildInterview(input: {
  id: string;
  diagRow: Record<string, string> | null;
  coverRow: Record<string, string> | null;
  coverCols: CoverColumns | null;
  labels: Labeled;
  actions: Record<string, string>[];
  comments: Record<string, string>[];
  errors: Record<string, string>[];
  members: { members: number; male: number; female: number } | null;
}): Interview | null {
  const diag = input.diagRow;
  const cover = input.coverRow;
  const cols = input.coverCols;

  const statusRaw = diag ? pick(diag, ["interview__status"]) : "";
  const status = statusRaw ? Number(numericCode(statusRaw)) : inferStatus(input.actions);
  if (!Number.isFinite(status)) return null;

  const events = input.actions
    .map((row) => toEvent(row))
    .filter((event): event is WorkflowEvent => event != null && WORKFLOW_ACTIONS.has(event.actionCode));

  const interviewer = lastResponsible(input.actions, 1) ?? (isFieldStatus(status) ? pick(diag, ["responsible"]) : null);
  const supervisor =
    lastOriginator(input.actions, 1, 2) ??
    lastResponsible(input.actions, 0) ??
    null;
  const responsible = diag ? pick(diag, ["responsible"]) || null : events.at(-1)?.by ?? null;

  const key =
    (diag && pick(diag, ["interview__key"])) ||
    (cover && cols ? cell(cover, cols.key) : "") ||
    input.id.slice(0, 11);

  const province = labelValue(input.labels, cols?.province, cover ? cell(cover, cols?.province ?? null) : "", true);
  const island = labelValue(input.labels, cols?.island, cover ? cell(cover, cols?.island ?? null) : "", false);
  const areaCouncil = labelValue(input.labels, cols?.areaCouncil, cover ? cell(cover, cols?.areaCouncil ?? null) : "", false);
  const ea = cover && cols ? cell(cover, cols.ea) : "";
  const locality = cover && cols ? cell(cover, cols.locality) : "";
  const urbanRural = labelValue(input.labels, cols?.urbanRural, cover ? cell(cover, cols?.urbanRural ?? null) : "", false);
  const roundRaw = cover && cols ? cell(cover, cols.round) : "";
  const roundNumber = parseNumber(numericCode(roundRaw));
  const resultRaw = cover && cols ? cell(cover, cols.result) : "";
  const resultCode = resultRaw ? numericCode(resultRaw) : null;
  const resultLabel = resultRaw
    ? labelValue(input.labels, cols?.result, resultRaw, false) || resultRaw
    : null;

  const latitude = parseNumber(cover && cols ? cell(cover, cols.latitude) : "");
  const longitude = parseNumber(cover && cols ? cell(cover, cols.longitude) : "");
  const gpsAccuracy = parseNumber(cover && cols ? cell(cover, cols.accuracy) : "");

  const duration = parseDurationMinutes(diag ? pick(diag, ["interview__duration"]) : "");
  const errorCountFromDiag = parseNumber(diag ? pick(diag, ["entities__errors"]) : "");
  const rejectionsSup = parseNumber(diag ? pick(diag, ["rejections__sup"]) : "") ?? countActions(input.actions, 7);
  const rejectionsHq = parseNumber(diag ? pick(diag, ["rejections__hq"]) : "") ?? countActions(input.actions, 8);

  const notes = input.comments.slice(0, 8).map((row) => toNote(row)).filter((note): note is CaseNote => note != null);
  const errorSamples = input.errors.slice(0, 8).map((row) => toError(row)).filter((item): item is CaseError => item != null);
  const errors = errorCountFromDiag ?? input.errors.length;

  const startedAt = firstActionAt(events, 2);
  const interview: Interview = {
    id: input.id,
    key,
    assignmentId: (cover && cols ? cell(cover, cols.assignmentId) : "") || null,
    status,
    statusLabel: statusLabel(status),
    bucket: bucketFor(status, Boolean(startedAt)),
    interviewer: interviewer || null,
    supervisor: supervisor || null,
    responsible,
    province: province || "Uncoded",
    island: island || "Uncoded",
    areaCouncil: areaCouncil || "Uncoded",
    ea: ea || "Uncoded",
    locality: locality || "",
    urbanRural: urbanRural || "Uncoded",
    round: roundNumber == null ? null : Math.round(roundNumber),
    hhSerial: cover && cols ? cell(cover, cols.serial) : "",
    resultCode,
    resultLabel,
    resultClass: classifyResult(resultLabel, resultCode),
    latitude: latitude == null || latitude === 0 ? (latitude === 0 ? 0 : null) : latitude,
    longitude: longitude == null || longitude === 0 ? (longitude === 0 ? 0 : null) : longitude,
    gpsAccuracy,
    durationMinutes: duration,
    errors,
    rejectionsSup,
    rejectionsHq,
    commentCount: input.comments.length,
    members: input.members?.members ?? null,
    maleMembers: input.members?.male ?? null,
    femaleMembers: input.members?.female ?? null,
    startedAt,
    completedAt: lastActionAt(events, 3),
    supervisorApprovedAt: lastActionAt(events, 5),
    hqApprovedAt: lastActionAt(events, 6),
    assignedAt: lastActionAt(events, 1) ?? firstActionAt(events, 13),
    events,
    notes,
    errorSamples,
    flags: [],
  };

  if (interview.latitude === 0 && interview.longitude === 0) {
    // Keep the zero point so the outside-Vanuatu flag can fire, but callers may hide it on the map.
  }

  return interview;
}

function pick(row: Record<string, string> | null, names: string[]): string {
  if (!row) return "";
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  for (const [key, value] of Object.entries(row)) {
    if (wanted.has(key.toLowerCase())) return value ?? "";
  }
  return "";
}

function inferStatus(actions: Record<string, string>[]): number {
  let status = 20;
  for (const row of actions) {
    const code = Number(numericCode(row.action ?? ""));
    if (code === 0) status = 40;
    if (code === 1) status = 60;
    if (code === 13) status = 85;
    if (code === 3) status = 100;
    if (code === 7) status = 65;
    if (code === 5) status = 120;
    if (code === 8) status = 125;
    if (code === 6) status = 130;
    if (code === 9) status = -1;
  }
  return status;
}

function isFieldStatus(status: number): boolean {
  return status === 60 || status === 65 || status === 80 || status === 85 || status === 95;
}

function toEvent(row: Record<string, string>): WorkflowEvent | null {
  const code = Number(numericCode(row.action ?? ""));
  if (!Number.isFinite(code)) return null;
  const date = row.date ?? "";
  const time = row.time || "00:00:00";
  const roleCode = Number(numericCode(row.role ?? ""));
  return {
    at: date ? `${date}T${time}` : "",
    action: actionLabel(code),
    actionCode: code,
    by: row.originator || row.responsible_name || row.responsible__name || "",
    role: roleLabel(Number.isFinite(roleCode) ? roleCode : 0),
  };
}

function lastResponsible(actions: Record<string, string>[], actionCode: number): string | null {
  let found: string | null = null;
  for (const row of actions) {
    if (Number(numericCode(row.action ?? "")) !== actionCode) continue;
    const name = row.responsible_name || row.responsible__name || "";
    if (name) found = name;
  }
  return found;
}

function lastOriginator(actions: Record<string, string>[], actionCode: number, role: number): string | null {
  let found: string | null = null;
  for (const row of actions) {
    if (Number(numericCode(row.action ?? "")) !== actionCode) continue;
    if (Number(numericCode(row.role ?? "")) !== role) continue;
    if (row.originator) found = row.originator;
  }
  return found;
}

function countActions(actions: Record<string, string>[], actionCode: number): number {
  return actions.filter((row) => Number(numericCode(row.action ?? "")) === actionCode).length;
}

function firstActionAt(events: WorkflowEvent[], code: number): string | null {
  return events.find((event) => event.actionCode === code)?.at || null;
}

function lastActionAt(events: WorkflowEvent[], code: number): string | null {
  let found: string | null = null;
  for (const event of events) {
    if (event.actionCode === code && event.at) found = event.at;
  }
  return found;
}

function toNote(row: Record<string, string>): CaseNote | null {
  const text = row.comment || "";
  if (!text) return null;
  const roleCode = Number(numericCode(row.role ?? ""));
  const date = row.date ?? "";
  const time = row.time || "00:00:00";
  return {
    at: date ? `${date}T${time}` : "",
    by: row.originator || "",
    role: roleLabel(Number.isFinite(roleCode) ? roleCode : 0),
    variable: row.variable || "",
    text,
  };
}

function toError(row: Record<string, string>): CaseError | null {
  const message = row.message || "";
  if (!message && !row.variable) return null;
  return { variable: row.variable || "", message };
}

function labelValue(labels: Labeled, header: string | null | undefined, raw: string, provinceFallback: boolean): string {
  const value = raw.trim();
  if (!value) return "";
  const code = numericCode(value);
  if (header) {
    const table = labels.get(normalizeHeader(header));
    const labeled = table?.get(code) ?? table?.get(value);
    if (labeled) return labeled;
  }
  if (code !== value && Number.isNaN(Number(value)) === false && value !== code) {
    return code;
  }
  if (/^-?\d+$/.test(code)) {
    if (provinceFallback) return fallbackProvince(code) ?? `Code ${code}`;
    return value;
  }
  return value;
}

function classifyResult(label: string | null, code: string | null): ResultClass {
  const text = `${label ?? ""} ${code ?? ""}`.toLowerCase();
  if (!text.trim()) return "unknown";
  if (/partial/.test(text)) return "partial";
  if (/refus/.test(text)) return "refused";
  if (/no contact|non-?contact|not at home|no competent|nobody/.test(text)) return "noncontact";
  if (/vacant|unoccupied|empty dwelling|demolish/.test(text)) return "vacant";
  if (/complete|respond/.test(text) && !/incomplet/.test(text)) return "complete";
  if (/other/.test(text)) return "other";
  if (code && !label) return "unknown";
  return "other";
}

function flagInterview(interview: Interview, asOf: string): string[] {
  const flags: string[] = [];
  const submitted = SUBMITTED_STATUSES.has(interview.status);
  const responded =
    interview.resultClass === "complete" ||
    interview.resultClass === "partial" ||
    interview.resultClass === "unknown";

  if (submitted && responded && interview.durationMinutes != null) {
    if (interview.durationMinutes < 50) flags.push("very-short");
    else if (interview.durationMinutes < 90) flags.push("short");
  }

  if (
    submitted &&
    (interview.resultClass === "complete" || interview.resultClass === "partial") &&
    (interview.latitude == null || interview.longitude == null)
  ) {
    flags.push("missing-gps");
  }

  if (interview.gpsAccuracy != null && interview.gpsAccuracy > 25) flags.push("poor-gps");

  if (interview.latitude != null && interview.longitude != null) {
    const inside =
      interview.latitude <= -12.5 &&
      interview.latitude >= -21.5 &&
      interview.longitude >= 166 &&
      interview.longitude <= 171.2;
    if (!inside) flags.push("outside-vanuatu");
  }

  if (interview.errors > 0) flags.push("open-errors");
  if (interview.errors >= 8) flags.push("high-errors");
  if (interview.rejectionsSup + interview.rejectionsHq >= 2) flags.push("repeat-rejection");

  const asOfDay = asOf.slice(0, 10);
  if (
    (interview.bucket === "inProgress" || interview.bucket === "notStarted" || interview.bucket === "returned") &&
    interview.assignedAt &&
    daysBetween(interview.assignedAt, asOfDay) > 10
  ) {
    flags.push("stale-field");
  }
  if (
    interview.status === 100 &&
    interview.completedAt &&
    daysBetween(interview.completedAt, asOfDay) > 5
  ) {
    flags.push("stale-supervisor");
  }
  if (
    interview.status === 120 &&
    interview.supervisorApprovedAt &&
    daysBetween(interview.supervisorApprovedAt, asOfDay) > 7
  ) {
    flags.push("stale-hq");
  }

  return flags;
}

function parseAssignments(table: Table): Assignment[] {
  const byId = new Map<string, Assignment>();
  const rows = [...table.rows].sort((a, b) => stampOf(a).localeCompare(stampOf(b)));
  for (const row of rows) {
    const id = row.assignment__id || row.assignment__ID || "";
    if (!id) continue;
    const current = byId.get(id) ?? {
      id,
      quantity: null,
      archived: false,
      deleted: false,
      interviewer: null,
      supervisor: null,
      round: null,
      province: null,
      island: null,
      ea: null,
    };
    const action = Number(numericCode(row.action ?? ""));
    const responsible = row.responsible_name || row.responsible__name || "";
    const role = Number(numericCode(row.responsible_role ?? row.responsible__role ?? ""));
    if (action === 1 || action === 8) {
      const qty = parseNumber(row.new__value || "");
      if (qty != null) current.quantity = qty;
    }
    if (action === 2) current.archived = true;
    if (action === 5) current.archived = false;
    if (action === 3) current.deleted = true;
    if (responsible && role === 1) current.interviewer = responsible;
    if (responsible && role === 2) current.supervisor = responsible;
    const comment = row.comment || "";
    const round = comment.match(/round\s+(\d+)/i);
    const province = comment.match(/province\s+([^·|]+)/i);
    const island = comment.match(/island\s+([^·|]+)/i);
    const ea = comment.match(/ea\s+([A-Za-z0-9-]+)/i);
    if (round) current.round = Number(round[1]);
    if (province) current.province = province[1].trim();
    if (island) current.island = island[1].trim();
    if (ea) current.ea = ea[1].trim();
    if (action && ASSIGNMENT_ACTION[action] == null) {
      // Unknown assignment action codes are ignored.
    }
    byId.set(id, current);
  }
  return [...byId.values()];
}

function targetHouseholds(assignments: Assignment[]): number | null {
  const live = assignments.filter((assignment) => !assignment.deleted && !assignment.archived);
  if (live.length === 0) return null;
  if (live.every((assignment) => assignment.quantity == null)) return null;
  return live.reduce((sum, assignment) => sum + (assignment.quantity ?? 0), 0);
}

function latestDay(interviews: Interview[]): string | null {
  let latest = "";
  for (const interview of interviews) {
    for (const event of interview.events) {
      const day = event.at.slice(0, 10);
      if (day > latest) latest = day;
    }
  }
  return latest || null;
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function readMeta(readme: string | null, infoJson: string | null): {
  questionnaire: string | null;
  susoVersion: string | null;
  exportedAt: string | null;
} {
  let questionnaire: string | null = null;
  let susoVersion: string | null = null;
  let exportedAt: string | null = null;

  if (infoJson) {
    try {
      const info = JSON.parse(infoJson) as Record<string, unknown>;
      const name = info.questionnaireName ?? info.questionnaire ?? info.title;
      const version = info.version ?? info.questionnaireVersion;
      const date = info.exportDate ?? info.export_date ?? info.date;
      if (typeof name === "string") {
        questionnaire = version != null ? `${name} (version ${version})` : name;
      }
      if (typeof date === "string") exportedAt = date;
    } catch {
      // The readme remains the source if export__info.json is not valid JSON.
    }
  }

  if (readme) {
    const version = readme.match(/Survey Solutions\s+([0-9][0-9.]*)/i);
    const title = readme.match(/Questionnaire:\s*(.+)/i);
    const exported = readme.match(/Export date:\s*(.+)/i);
    if (!susoVersion && version) susoVersion = version[1];
    if (!questionnaire && title) questionnaire = title[1].trim();
    if (!exportedAt && exported) exportedAt = exported[1].trim();
    if (version) susoVersion = version[1];
  }

  return { questionnaire, susoVersion, exportedAt };
}

function parseDoLabels(files: [string, string][]): Labeled {
  const labels: Labeled = new Map();
  const defined = new Map<string, Map<string, string>>();

  for (const [, text] of files) {
    const compact = text.replace(/\/\/\/\s*\n/g, " ");
    for (const match of compact.matchAll(/label\s+define\s+(\w+)\s+([\s\S]*?)(?=\nlabel\s|\n\s*$|$)/gi)) {
      const name = match[1];
      const body = match[2].replace(/,?\s*replace\s*$/i, "");
      const map = new Map<string, string>();
      for (const pair of body.matchAll(/(-?\d+)\s+"([^"]*)"/g)) {
        map.set(pair[1], pair[2]);
      }
      if (map.size) defined.set(name.toLowerCase(), map);
    }
    for (const match of compact.matchAll(/label\s+values\s+(\w+)\s+(\w+)/gi)) {
      const variable = normalizeHeader(match[1]);
      const table = defined.get(match[2].toLowerCase());
      if (table) labels.set(variable, table);
    }
  }

  for (const [name, table] of defined) {
    if (!labels.has(name)) labels.set(name, table);
  }
  return labels;
}
