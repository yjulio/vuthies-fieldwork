"use client";

import { formatNumber, formatPct } from "@/components/dashboard/format";
import type { CollectionProgress } from "@/lib/fieldwork/metrics";

export function CollectionBar({
  overall,
  view,
  viewLabel,
}: {
  overall: CollectionProgress;
  view: CollectionProgress | null;
  viewLabel: string | null;
}) {
  const width = overall.rate == null ? 0 : Math.min(100, overall.rate * 100);

  return (
    <section className="mt-4 rounded-2xl border bg-card px-4 py-4" aria-label="Overall collection">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <h2 className="text-xs tracking-wide text-muted-foreground uppercase">Overall collection</h2>
          <p className="font-display mt-1 text-4xl leading-none sm:text-5xl">{formatPct(overall.rate, 1)}</p>
        </div>
        <p className="max-w-md text-sm text-muted-foreground">
          {overall.sample == null
            ? "This file has no households to measure against."
            : `${formatNumber(overall.collected)} of ${formatNumber(overall.sample)} households collected. ${formatNumber(overall.remaining ?? 0)} still to collect.`}
        </p>
      </div>
      <div
        className="mt-3 h-3 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(width)}
        aria-label="Share of the sample already collected"
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {overall.sample == null
          ? "Load an export that includes interviews or assignment quantities."
          : `A household counts once the interviewer submits it, including cases now with a supervisor or headquarters. ${formatNumber(overall.hqApproved)} are approved by headquarters.`}
      </p>
      {view && viewLabel && view.sample != null && (
        <p className="mt-2 text-sm">
          <span className="font-medium">{viewLabel}</span>
          <span className="text-muted-foreground">
            {" "}
            {formatPct(view.rate, 1)} collected
            {view.sample > 0 ? ` · ${formatNumber(view.collected)} of ${formatNumber(view.sample)}` : ""}
          </span>
        </p>
      )}
    </section>
  );
}
