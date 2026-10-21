export type Table = {
  headers: string[];
  rows: Record<string, string>[];
};

export function parseDelimited(text: string): Table {
  const cleaned = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = cleaned.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseRow(lines[0], delimiter).map((header) => header.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseRow(lines[i], delimiter);
    const row: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c];
      if (!key || key in row) continue;
      row[key] = (cells[c] ?? "").trim();
    }
    rows.push(row);
  }

  return { headers, rows };
}

function detectDelimiter(header: string): string {
  const tabs = header.split("\t").length;
  const commas = header.split(",").length;
  const semis = header.split(";").length;
  if (tabs >= commas && tabs >= semis && tabs > 1) return "\t";
  if (semis > commas && semis > 1) return ";";
  return ",";
}

export function parseRow(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        current += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === delimiter) {
      out.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  out.push(current);
  return out;
}

export function cell(row: Record<string, string>, header: string | null): string {
  if (!header) return "";
  return row[header] ?? "";
}

export function findHeader(headers: string[], patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = headers.find((header) => pattern.test(normalizeHeader(header)));
    if (match) return match;
  }
  return null;
}

export function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, "_");
}

export function numericCode(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^-?\d+\.0+$/.test(trimmed)) return String(parseInt(trimmed, 10));
  if (/^-?\d+$/.test(trimmed)) return String(parseInt(trimmed, 10));
  return trimmed;
}

export function parseNumber(value: string): number | null {
  if (!value || !value.trim()) return null;
  const n = Number(value.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function parseDurationMinutes(raw: string): number | null {
  const value = raw.trim();
  if (!value) return null;

  const dayClock = value.match(/^(\d+)\.(\d{1,2}):(\d{2}):(\d{2})$/);
  if (dayClock) {
    const days = Number(dayClock[1]);
    const hours = Number(dayClock[2]);
    const minutes = Number(dayClock[3]);
    const seconds = Number(dayClock[4]);
    return days * 24 * 60 + hours * 60 + minutes + seconds / 60;
  }

  const clock = value.match(/^(\d{1,3}):(\d{2}):(\d{2})$/);
  if (clock) {
    return Number(clock[1]) * 60 + Number(clock[2]) + Number(clock[3]) / 60;
  }

  const asNumber = Number(value);
  if (!Number.isFinite(asNumber)) return null;
  // Survey Solutions sometimes stores active seconds as a number.
  if (asNumber > 300) return asNumber / 60;
  return asNumber;
}

export function daysBetween(from: string, to: string): number {
  const start = Date.parse(`${from.slice(0, 10)}T00:00:00Z`);
  const end = Date.parse(`${to.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.round((end - start) / 86_400_000);
}

export function fileStem(path: string): string {
  const base = path.split(/[/\\]/).pop() ?? path;
  return base.replace(/\.(tab|csv|txt|do|json)$/i, "");
}
