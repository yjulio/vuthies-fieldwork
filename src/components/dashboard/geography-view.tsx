"use client";

import type { ReactNode } from "react";
import { formatDuration, formatNumber, formatPct, PROVINCE_ORDER } from "@/components/dashboard/format";
import { groupBy, type GroupRow } from "@/lib/fieldwork/metrics";
import type { Filters, Interview } from "@/lib/fieldwork/types";

export function GeographyView({
  interviews,
  filters,
  onFilter,
}: {
  interviews: Interview[];
  filters: Filters;
  onFilter: (next: Partial<Filters>) => void;
}) {
  const provinces = sortProvinces(
    groupBy(interviews, (interview) => ({ key: interview.province, label: interview.province })),
  );
  const islands = groupBy(
    interviews.filter((interview) => !filters.province || interview.province === filters.province),
    (interview) => ({ key: interview.island, label: interview.island, parent: interview.province }),
  );
  const councils = groupBy(
    interviews.filter((interview) => !filters.province || interview.province === filters.province),
    (interview) => ({
      key: `${interview.province}|${interview.areaCouncil}`,
      label: interview.areaCouncil,
      parent: interview.province,
    }),
  );
  const eas = groupBy(interviews, (interview) => ({
    key: interview.ea,
    label: interview.ea,
    parent: `${interview.province} · ${interview.island}`,
  })).slice(0, 40);

  return (
    <div className="flex flex-col gap-4">
      <Panel title="Provinces" note="North to south. Select a province to narrow islands and area councils.">
        <GeoTable rows={provinces} onPick={(row) => onFilter({ province: row.label, island: "" })} active={filters.province} />
      </Panel>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Islands" note={filters.province ? `Inside ${filters.province}` : "All provinces in the current filter"}>
          <GeoTable rows={islands} onPick={(row) => onFilter({ island: row.label, province: row.parent ?? filters.province })} active={filters.island} />
        </Panel>
        <Panel title="Area councils">
          <GeoTable rows={councils.slice(0, 18)} onPick={() => undefined} />
        </Panel>
      </div>
      <Panel title="Enumeration areas" note="Up to 40 areas in the current filter, largest first.">
        <GeoTable rows={eas} onPick={() => undefined} />
      </Panel>
    </div>
  );
}

function Panel({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-4">
      <h2 className="font-display text-xl">{title}</h2>
      {note && <p className="mt-1 text-sm text-muted-foreground">{note}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function GeoTable({
  rows,
  onPick,
  active,
}: {
  rows: GroupRow[];
  onPick: (row: GroupRow) => void;
  active?: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing in this filter.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="text-xs tracking-wide text-muted-foreground uppercase">
          <tr>
            <th className="py-2 pr-3 font-medium">Area</th>
            <th className="py-2 pr-3 font-medium">Opened</th>
            <th className="py-2 pr-3 font-medium">HQ approved</th>
            <th className="py-2 pr-3 font-medium">In field</th>
            <th className="py-2 pr-3 font-medium">Response</th>
            <th className="py-2 pr-3 font-medium">GPS</th>
            <th className="py-2 font-medium">Median time</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t">
              <td className="py-2 pr-3">
                <button type="button" className="text-left" onClick={() => onPick(row)}>
                  <span className={active === row.label ? "font-semibold" : ""}>{row.label}</span>
                  {row.parent && <span className="block text-xs text-muted-foreground">{row.parent}</span>}
                </button>
              </td>
              <td className="py-2 pr-3 font-mono">{formatNumber(row.households)}</td>
              <td className="py-2 pr-3 font-mono">
                {formatNumber(row.hqApproved)}
                <span className="text-muted-foreground"> {formatPct(row.households ? row.hqApproved / row.households : null)}</span>
              </td>
              <td className="py-2 pr-3 font-mono">{formatNumber(row.inField)}</td>
              <td className="py-2 pr-3">{formatPct(row.responseRate)}</td>
              <td className="py-2 pr-3">{formatPct(row.gpsCoverage)}</td>
              <td className="py-2">{formatDuration(row.medianDuration)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function sortProvinces(rows: GroupRow[]): GroupRow[] {
  return [...rows].sort((a, b) => {
    const ai = PROVINCE_ORDER.indexOf(a.label);
    const bi = PROVINCE_ORDER.indexOf(b.label);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}
