export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatPct(value: number | null, digits = 0): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatDuration(minutes: number | null): string {
  if (minutes == null) return "—";
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  if (hours <= 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  const time = iso.length > 10 ? iso.slice(11, 16) : "";
  return time ? `${formatDate(iso)} ${time}` : formatDate(iso);
}

export function bucketClass(bucket: string): string {
  switch (bucket) {
    case "hqApproved":
      return "bg-emerald-800/10 text-emerald-900";
    case "awaitingHq":
      return "bg-teal-800/10 text-teal-950";
    case "awaitingSupervisor":
    case "hqRejected":
      return "bg-amber-700/15 text-amber-950";
    case "inProgress":
    case "returned":
    case "restarted":
      return "bg-sky-800/10 text-sky-950";
    default:
      return "bg-stone-500/10 text-stone-700";
  }
}

export const PROVINCE_ORDER = ["Torba", "Sanma", "Penama", "Malampa", "Shefa", "Tafea"];
