"use client";

import { formatNumber, formatPct } from "@/components/dashboard/format";
import { FLAG_LABEL, SUBMITTED_STATUSES } from "@/lib/suso/codes";
import { flagOptions, resultMix } from "@/lib/fieldwork/metrics";
import type { Interview } from "@/lib/fieldwork/types";

const DURATION_BINS = [
  { label: "Under 50 min", test: (minutes: number) => minutes < 50 },
  { label: "50–89 min", test: (minutes: number) => minutes >= 50 && minutes < 90 },
  { label: "90–149 min", test: (minutes: number) => minutes >= 90 && minutes < 150 },
  { label: "150–239 min", test: (minutes: number) => minutes >= 150 && minutes < 240 },
  { label: "4 hours or more", test: (minutes: number) => minutes >= 240 },
];

export function QualityView({
  interviews,
  onFlag,
}: {
  interviews: Interview[];
  onFlag: (flag: string) => void;
}) {
  const flags = flagOptions(interviews);
  const submitted = interviews.filter(
    (interview) => SUBMITTED_STATUSES.has(interview.status) && interview.durationMinutes != null,
  );
  const durations = submitted.map((interview) => interview.durationMinutes!);
  const results = resultMix(interviews);
  const resultMax = Math.max(1, ...results.map((result) => result.count));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border bg-card p-4">
        <h2 className="font-display text-xl">Quality flags</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Short means under 90 minutes of active time on a submitted interview. Very short means under 50. A full HIES
          sitting is usually longer than either of those.
        </p>
        <ul className="mt-3 flex flex-col">
          {flags.length === 0 && <li className="text-sm text-muted-foreground">No flags in this filter.</li>}
          {flags.map((flag) => {
            const count = interviews.filter((interview) => interview.flags.includes(flag)).length;
            return (
              <li key={flag} className="border-t py-2 first:border-t-0">
                <button type="button" className="flex w-full items-center justify-between gap-3 text-left" onClick={() => onFlag(flag)}>
                  <span>{FLAG_LABEL[flag]}</span>
                  <span className="font-mono text-sm">{formatNumber(count)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-2xl border bg-card p-4">
        <h2 className="font-display text-xl">Active time</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatNumber(submitted.length)} submitted interviews with a duration. From interview__duration.
        </p>
        <ul className="mt-4 flex flex-col gap-2">
          {DURATION_BINS.map((bin) => {
            const count = durations.filter(bin.test).length;
            return (
              <li key={bin.label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{bin.label}</span>
                  <span className="font-mono">
                    {formatNumber(count)} {formatPct(durations.length ? count / durations.length : null)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${durations.length ? (count / durations.length) * 100 : 0}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-2xl border bg-card p-4 lg:col-span-2">
        <h2 className="font-display text-xl">Household result</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Among interviews the interviewer has submitted. Response rate treats complete and partial as responses, and
          leaves uncoded results out of the denominator.
        </p>
        <ul className="mt-4 flex flex-col gap-2">
          {results.map((result) => (
            <li key={result.key} className="grid grid-cols-[140px_1fr_48px] items-center gap-3 text-sm">
              <span>{result.label}</span>
              <div className="h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-primary" style={{ width: `${(result.count / resultMax) * 100}%` }} />
              </div>
              <span className="text-right font-mono">{formatNumber(result.count)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
