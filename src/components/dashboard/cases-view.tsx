"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { bucketClass, formatDuration } from "@/components/dashboard/format";
import { BUCKET_LABEL } from "@/lib/suso/codes";
import type { Interview } from "@/lib/fieldwork/types";

const PAGE = 20;

export function CasesView({
  interviews,
  onSelect,
}: {
  interviews: Interview[];
  onSelect: (id: string) => void;
}) {
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<"key" | "round" | "duration">("key");
  const sorted = useMemo(() => {
    const copy = [...interviews];
    copy.sort((a, b) => {
      if (sort === "round") return (a.round ?? 0) - (b.round ?? 0) || a.key.localeCompare(b.key);
      if (sort === "duration") return (a.durationMinutes ?? -1) - (b.durationMinutes ?? -1);
      return a.key.localeCompare(b.key);
    });
    return copy;
  }, [interviews, sort]);
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE));
  const safePage = Math.min(page, pages - 1);
  const slice = sorted.slice(safePage * PAGE, safePage * PAGE + PAGE);

  if (interviews.length === 0) {
    return (
      <section className="rounded-2xl border bg-card px-4 py-10 text-center">
        <h2 className="font-display text-xl">No cases in this filter</h2>
        <p className="mt-1 text-sm text-muted-foreground">Clear a province, round, or flag to widen the register.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl">Case register</h2>
        <label className="flex items-center gap-2 text-sm">
          Sort
          <select
            className="h-8 rounded-lg border bg-card px-2"
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as typeof sort);
              setPage(0);
            }}
          >
            <option value="key">Interview key</option>
            <option value="round">Round</option>
            <option value="duration">Active time</option>
          </select>
        </label>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="text-xs tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="py-2 pr-3 font-medium">Key</th>
              <th className="py-2 pr-3 font-medium">Status</th>
              <th className="py-2 pr-3 font-medium">Place</th>
              <th className="py-2 pr-3 font-medium">Round</th>
              <th className="py-2 pr-3 font-medium">Interviewer</th>
              <th className="py-2 pr-3 font-medium">Result</th>
              <th className="py-2 font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((interview) => (
              <tr key={interview.id} className="border-t">
                <td className="py-2 pr-3">
                  <button type="button" className="font-mono text-xs" onClick={() => onSelect(interview.id)}>
                    {interview.key}
                  </button>
                  {interview.flags.length > 0 && (
                    <span className="mt-1 block text-xs text-destructive">{interview.flags.length} flag{interview.flags.length === 1 ? "" : "s"}</span>
                  )}
                </td>
                <td className="py-2 pr-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${bucketClass(interview.bucket)}`}>
                    {BUCKET_LABEL[interview.bucket] ?? interview.statusLabel}
                  </span>
                </td>
                <td className="py-2 pr-3">
                  {interview.island}
                  <span className="block text-xs text-muted-foreground">{interview.province} · {interview.ea}</span>
                </td>
                <td className="py-2 pr-3 font-mono">{interview.round ?? "—"}</td>
                <td className="py-2 pr-3 font-mono text-xs">{interview.interviewer ?? "—"}</td>
                <td className="py-2 pr-3">{interview.resultLabel ?? "—"}</td>
                <td className="py-2">{formatDuration(interview.durationMinutes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {safePage * PAGE + 1}–{Math.min(sorted.length, safePage * PAGE + PAGE)} of {sorted.length}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)}>
            Next
          </Button>
        </div>
      </div>
    </section>
  );
}
