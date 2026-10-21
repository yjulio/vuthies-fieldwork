"use client";

import { formatDuration, formatNumber, formatPct, formatDate } from "@/components/dashboard/format";
import { groupBy, interviewerRows } from "@/lib/fieldwork/metrics";
import type { Interview } from "@/lib/fieldwork/types";

export function TeamsView({
  interviews,
  onInterviewer,
}: {
  interviews: Interview[];
  onInterviewer: (login: string) => void;
}) {
  const people = interviewerRows(interviews);
  const supervisors = groupBy(interviews, (interview) => ({
    key: interview.supervisor ?? "Unassigned",
    label: interview.supervisor ?? "Unassigned",
    parent: interview.province,
  }));

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border bg-card p-4">
        <h2 className="font-display text-xl">Supervisors</h2>
        <p className="mt-1 text-sm text-muted-foreground">Taken from the person who assigned the interviewer.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="py-2 pr-3 font-medium">Supervisor</th>
                <th className="py-2 pr-3 font-medium">Opened</th>
                <th className="py-2 pr-3 font-medium">With supervisor</th>
                <th className="py-2 pr-3 font-medium">With HQ</th>
                <th className="py-2 pr-3 font-medium">HQ approved</th>
                <th className="py-2 font-medium">Short interviews</th>
              </tr>
            </thead>
            <tbody>
              {supervisors.map((row) => (
                <tr key={row.key} className="border-t">
                  <td className="py-2 pr-3 font-mono text-xs">
                    {row.label}
                    <span className="block font-sans text-xs text-muted-foreground">{row.parent}</span>
                  </td>
                  <td className="py-2 pr-3 font-mono">{formatNumber(row.households)}</td>
                  <td className="py-2 pr-3 font-mono">{formatNumber(row.withSupervisor)}</td>
                  <td className="py-2 pr-3 font-mono">{formatNumber(row.withHq)}</td>
                  <td className="py-2 pr-3 font-mono">{formatNumber(row.hqApproved)}</td>
                  <td className="py-2 font-mono">{formatNumber(row.shortInterviews)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-4">
        <h2 className="font-display text-xl">Interviewers</h2>
        <p className="mt-1 text-sm text-muted-foreground">Select a login to open their cases.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="text-xs tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="py-2 pr-3 font-medium">Interviewer</th>
                <th className="py-2 pr-3 font-medium">In field</th>
                <th className="py-2 pr-3 font-medium">Submitted</th>
                <th className="py-2 pr-3 font-medium">HQ approved</th>
                <th className="py-2 pr-3 font-medium">Rejection</th>
                <th className="py-2 pr-3 font-medium">Median time</th>
                <th className="py-2 pr-3 font-medium">Very short</th>
                <th className="py-2 font-medium">Last action</th>
              </tr>
            </thead>
            <tbody>
              {people.map((row) => (
                <tr key={row.login} className="border-t">
                  <td className="py-2 pr-3">
                    <button type="button" className="font-mono text-xs" onClick={() => onInterviewer(row.login)}>
                      {row.login}
                    </button>
                    <span className="block text-xs text-muted-foreground">
                      {row.province} · {row.supervisor}
                    </span>
                  </td>
                  <td className="py-2 pr-3 font-mono">{formatNumber(row.inField)}</td>
                  <td className="py-2 pr-3 font-mono">{formatNumber(row.submitted)}</td>
                  <td className="py-2 pr-3 font-mono">{formatNumber(row.hqApproved)}</td>
                  <td className="py-2 pr-3">{formatPct(row.rejectionRate)}</td>
                  <td className="py-2 pr-3">{formatDuration(row.medianDuration)}</td>
                  <td className="py-2 pr-3 font-mono">{formatNumber(row.veryShort)}</td>
                  <td className="py-2">{formatDate(row.lastActivity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
