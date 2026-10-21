"use client";

import type { ReactNode } from "react";
import { formatNumber, formatPct } from "@/components/dashboard/format";
import type { HeatCell, RoundComparison } from "@/lib/fieldwork/rounds";

const WORKFLOW = [
  { key: "notStarted", label: "Not started", color: "#8a8478" },
  { key: "inField", label: "In the field", color: "#2c5f8a" },
  { key: "withSupervisor", label: "With supervisor", color: "#b7791f" },
  { key: "withHq", label: "With headquarters", color: "#3d8f84" },
  { key: "hqApproved", label: "HQ approved", color: "#0f6e62" },
  { key: "unopened", label: "Not yet opened", color: "#e4d3ae" },
] as const;

const RESULTS = [
  { key: "complete", label: "Complete", color: "#0f6e62" },
  { key: "partial", label: "Partial", color: "#7d9a4e" },
  { key: "refused", label: "Refused", color: "#b4532a" },
  { key: "noncontact", label: "No contact", color: "#b7791f" },
  { key: "vacant", label: "Vacant", color: "#8a8478" },
  { key: "otherResult", label: "Other or uncoded", color: "#c4b8a8" },
] as const;

export function WorkflowByRound({
  rows,
  activeRound,
  onSelect,
}: {
  rows: RoundComparison[];
  activeRound: number | null;
  onSelect: (round: number) => void;
}) {
  return (
    <RoundFrame
      label="Workload by round"
      note="Each bar is one of the 32 rounds. Segments show where those households sit. The sand cap is households assigned but not yet opened."
    >
      <Legend items={WORKFLOW.map((item) => ({ label: item.label, color: item.color }))} />
      <StackedBars
        rows={rows}
        activeRound={activeRound}
        onSelect={onSelect}
        series={WORKFLOW.map((item) => ({ key: item.key, color: item.color }))}
        ariaLabel="Stacked bars comparing workflow status across 32 survey rounds"
      />
    </RoundFrame>
  );
}

export function RatesByRound({
  rows,
  activeRound,
  onSelect,
}: {
  rows: RoundComparison[];
  activeRound: number | null;
  onSelect: (round: number) => void;
}) {
  const series = [
    { key: "hq", label: "HQ approved", color: "#0f6e62", values: rows.map((row) => (row.households ? row.hqApproved / row.households : null)) },
    { key: "response", label: "Response rate", color: "#b7791f", values: rows.map((row) => row.responseRate) },
    { key: "gps", label: "GPS coverage", color: "#2c5f8a", values: rows.map((row) => row.gpsCoverage) },
  ];
  return (
    <RoundFrame
      label="Rates compared"
      note="HQ approval is a share of opened households. Response and GPS use submitted responding households. Rounds with no interviews are left blank, not drawn as zero."
    >
      <Legend items={series.map((item) => ({ label: item.label, color: item.color }))} />
      <LineCompare rows={rows} series={series} activeRound={activeRound} onSelect={onSelect} />
    </RoundFrame>
  );
}

export function DurationByRound({
  rows,
  activeRound,
  onSelect,
}: {
  rows: RoundComparison[];
  activeRound: number | null;
  onSelect: (round: number) => void;
}) {
  const max = Math.max(120, ...rows.map((row) => row.medianDuration ?? 0));
  return (
    <RoundFrame
      label="Median active time"
      note="Submitted interviews only. The coral line is 90 minutes, the short-interview threshold."
    >
      <svg viewBox="0 0 760 230" role="img" aria-label="Median interview duration by round" className="h-auto w-full">
        <PlotGrid maxLabel={`${Math.round(max)}m`} midLabel={`${Math.round(max / 2)}m`} />
        {rows.map((row, index) => {
          const slot = column(index, rows.length);
          const minutes = row.medianDuration;
          const height = minutes == null ? 0 : (minutes / max) * slot.innerH;
          return (
            <g key={row.round} onClick={() => onSelect(row.round)} className="cursor-pointer">
              <title>{`${roundTitle(row)} Median active time ${minutes == null ? "not available" : `${Math.round(minutes)} minutes`}.`}</title>
              {minutes != null && (
                <rect x={slot.x} y={slot.base - height} width={slot.bar} height={height} fill="#0f6e62" rx="1" />
              )}
              {activeRound === row.round && (
                <rect x={slot.x - 1} y={18} width={slot.bar + 2} height={slot.innerH} fill="none" stroke="#1c2430" strokeWidth="1.4" />
              )}
            </g>
          );
        })}
        <ReferenceLine max={max} value={90} label="90m" />
        <RoundLabels count={rows.length} />
      </svg>
    </RoundFrame>
  );
}

export function ProvinceRoundHeatmap({
  provinces,
  rounds,
  cells,
  activeRound,
  onSelect,
}: {
  provinces: string[];
  rounds: number[];
  cells: HeatCell[];
  activeRound: number | null;
  onSelect: (round: number) => void;
}) {
  const lookup = new Map(cells.map((cell) => [`${cell.province}|${cell.round}`, cell]));
  return (
    <RoundFrame
      label="Headquarters approval by province and round"
      note="Darker cells are closer to fully approved. A blank cell has no opened households in that province and round."
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-separate border-spacing-0.5 text-center text-[10px]">
          <thead>
            <tr>
              <th className="w-20 text-left font-medium text-muted-foreground">Province</th>
              {rounds.map((round) => (
                <th key={round} className="font-medium text-muted-foreground">
                  <button type="button" className={activeRound === round ? "font-semibold text-foreground" : ""} onClick={() => onSelect(round)}>
                    {round}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {provinces.map((province) => (
              <tr key={province}>
                <th className="pr-2 text-left text-xs font-medium">{province}</th>
                {rounds.map((round) => {
                  const cell = lookup.get(`${province}|${round}`);
                  const share = cell?.share ?? null;
                  return (
                    <td key={round} className="p-0">
                      <button
                        type="button"
                        onClick={() => onSelect(round)}
                        title={
                          share == null
                            ? `${province}, round ${round}: no households`
                            : `${province}, round ${round}: ${Math.round(share * 100)}% HQ approved of ${cell?.households}`
                        }
                        className="flex h-7 w-full items-center justify-center rounded-sm"
                        style={{
                          background: heatColor(share),
                          color: share != null && share > 0.62 ? "#f7f4ee" : "#1c2430",
                          outline: activeRound === round ? "1px solid #1c2430" : undefined,
                        }}
                      >
                        {share == null ? "" : Math.round(share * 100)}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </RoundFrame>
  );
}

export function ResultsByRound({
  rows,
  activeRound,
  onSelect,
}: {
  rows: RoundComparison[];
  activeRound: number | null;
  onSelect: (round: number) => void;
}) {
  return (
    <RoundFrame label="Household result" note="Submitted interviews only, so a short bar is a round that is still mostly in the field.">
      <Legend items={RESULTS.map((item) => ({ label: item.label, color: item.color }))} />
      <StackedBars
        rows={rows}
        activeRound={activeRound}
        onSelect={onSelect}
        series={RESULTS.map((item) => ({ key: item.key, color: item.color }))}
        ariaLabel="Stacked bars comparing household results across rounds"
      />
    </RoundFrame>
  );
}

export function QualityByRound({
  rows,
  activeRound,
  onSelect,
}: {
  rows: RoundComparison[];
  activeRound: number | null;
  onSelect: (round: number) => void;
}) {
  const max = Math.max(1, ...rows.map((row) => Math.max(row.short, row.missingGps)));
  return (
    <RoundFrame
      label="Quality flags"
      note="Short interviews are under 90 minutes. Missing GPS counts submitted complete or partial households with no coordinates."
    >
      <Legend
        items={[
          { label: "Short interview", color: "#b4532a" },
          { label: "Missing GPS", color: "#2c5f8a" },
        ]}
      />
      <svg viewBox="0 0 760 230" role="img" aria-label="Short interviews and missing GPS by round" className="h-auto w-full">
        <PlotGrid maxLabel={String(max)} midLabel={String(Math.round(max / 2))} />
        {rows.map((row, index) => {
          const slot = column(index, rows.length);
          const gap = 1;
          const width = Math.max((slot.bar - gap) / 2, 0.8);
          const shortH = (row.short / max) * slot.innerH;
          const gpsH = (row.missingGps / max) * slot.innerH;
          return (
            <g key={row.round} onClick={() => onSelect(row.round)} className="cursor-pointer">
              <title>{`Round ${row.round}: ${row.short} short interviews, ${row.missingGps} missing GPS.`}</title>
              <rect x={slot.x} y={slot.base - shortH} width={width} height={shortH} fill="#b4532a" />
              <rect x={slot.x + width + gap} y={slot.base - gpsH} width={width} height={gpsH} fill="#2c5f8a" />
              {activeRound === row.round && (
                <rect x={slot.x - 1} y={18} width={slot.bar + 2} height={slot.innerH} fill="none" stroke="#1c2430" strokeWidth="1.4" />
              )}
            </g>
          );
        })}
        <RoundLabels count={rows.length} />
      </svg>
    </RoundFrame>
  );
}

export function RoundTable({
  rows,
  activeRound,
  onSelect,
}: {
  rows: RoundComparison[];
  activeRound: number | null;
  onSelect: (round: number) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="text-xs tracking-wide text-muted-foreground uppercase">
          <tr>
            <th className="py-2 pr-3 font-medium">Round</th>
            <th className="py-2 pr-3 font-medium">Opened</th>
            <th className="py-2 pr-3 font-medium">Not opened</th>
            <th className="py-2 pr-3 font-medium">HQ approved</th>
            <th className="py-2 pr-3 font-medium">Response</th>
            <th className="py-2 pr-3 font-medium">GPS</th>
            <th className="py-2 pr-3 font-medium">Median time</th>
            <th className="py-2 font-medium">Short</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.round} className={`border-t ${activeRound === row.round ? "bg-accent/60" : ""}`}>
              <td className="py-1.5 pr-3">
                <button type="button" className="font-mono" onClick={() => onSelect(row.round)}>
                  {row.round}
                </button>
              </td>
              <td className="py-1.5 pr-3 font-mono">{formatNumber(row.households)}</td>
              <td className="py-1.5 pr-3 font-mono">{formatNumber(row.unopened)}</td>
              <td className="py-1.5 pr-3 font-mono">{row.households ? formatPct(row.hqApproved / row.households) : "—"}</td>
              <td className="py-1.5 pr-3 font-mono">{formatPct(row.responseRate)}</td>
              <td className="py-1.5 pr-3 font-mono">{formatPct(row.gpsCoverage)}</td>
              <td className="py-1.5 pr-3 font-mono">{row.medianDuration == null ? "—" : `${Math.round(row.medianDuration)}m`}</td>
              <td className="py-1.5 font-mono">{formatNumber(row.short)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StackedBars({
  rows,
  series,
  activeRound,
  onSelect,
  ariaLabel,
}: {
  rows: RoundComparison[];
  series: { key: keyof RoundComparison; color: string }[];
  activeRound: number | null;
  onSelect: (round: number) => void;
  ariaLabel: string;
}) {
  const max = Math.max(1, ...rows.map((row) => series.reduce((sum, item) => sum + Number(row[item.key] ?? 0), 0)));
  return (
    <svg viewBox="0 0 760 230" role="img" aria-label={ariaLabel} className="h-auto w-full">
      <PlotGrid maxLabel={String(max)} midLabel={String(Math.round(max / 2))} />
      {rows.map((row, index) => {
        const slot = column(index, rows.length);
        let cursor = 0;
        const total = series.reduce((sum, item) => sum + Number(row[item.key] ?? 0), 0);
        return (
          <g key={row.round} onClick={() => onSelect(row.round)} className="cursor-pointer">
            <title>{roundTitle(row)}</title>
            {series.map((item) => {
              const value = Number(row[item.key] ?? 0);
              const height = (value / max) * slot.innerH;
              const y = slot.base - cursor - height;
              cursor += height;
              if (value <= 0) return null;
              return <rect key={item.key} x={slot.x} y={y} width={slot.bar} height={height} fill={item.color} />;
            })}
            {total === 0 && <line x1={slot.x} x2={slot.x + slot.bar} y1={slot.base} y2={slot.base} stroke="#d9d0c4" strokeWidth="2" />}
            {activeRound === row.round && (
              <rect x={slot.x - 1} y={18} width={slot.bar + 2} height={slot.innerH} fill="none" stroke="#1c2430" strokeWidth="1.4" />
            )}
          </g>
        );
      })}
      <RoundLabels count={rows.length} />
    </svg>
  );
}

function LineCompare({
  rows,
  series,
  activeRound,
  onSelect,
}: {
  rows: RoundComparison[];
  series: { key: string; label: string; color: string; values: (number | null)[] }[];
  activeRound: number | null;
  onSelect: (round: number) => void;
}) {
  return (
    <svg viewBox="0 0 760 230" role="img" aria-label="HQ approval, response rate, and GPS coverage by round" className="h-auto w-full">
      <PlotGrid maxLabel="100%" midLabel="50%" />
      {series.map((item) => (
        <path key={item.key} d={linePath(item.values)} fill="none" stroke={item.color} strokeWidth="1.8" />
      ))}
      {rows.map((row, index) => {
        const slot = column(index, rows.length);
        return (
          <g key={row.round} onClick={() => onSelect(row.round)} className="cursor-pointer">
            <title>{`${roundTitle(row)} HQ ${row.households ? formatPct(row.hqApproved / row.households) : "—"}. Response ${formatPct(row.responseRate)}. GPS ${formatPct(row.gpsCoverage)}.`}</title>
            <rect x={slot.x - 2} y={18} width={slot.step} height={slot.innerH} fill="transparent" />
            {activeRound === row.round && <line x1={slot.x + slot.bar / 2} x2={slot.x + slot.bar / 2} y1={18} y2={slot.base} stroke="#1c2430" strokeWidth="1" />}
          </g>
        );
      })}
      <RoundLabels count={rows.length} />
    </svg>
  );
}

function RoundFrame({ label, note, children }: { label: string; note: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-4">
      <h2 className="font-display text-xl">{label}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{note}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-sm" style={{ background: item.color }} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

function PlotGrid({ maxLabel, midLabel }: { maxLabel: string; midLabel: string }) {
  const top = 18;
  const base = 198;
  const mid = (top + base) / 2;
  return (
    <g>
      <line x1="36" x2="748" y1={base} y2={base} stroke="#e4ddd0" />
      <line x1="36" x2="748" y1={mid} y2={mid} stroke="#e4ddd0" />
      <line x1="36" x2="748" y1={top} y2={top} stroke="#e4ddd0" />
      <text x="32" y={base + 3} textAnchor="end" fill="#6b645b" fontSize="10">0</text>
      <text x="32" y={mid + 3} textAnchor="end" fill="#6b645b" fontSize="10">{midLabel}</text>
      <text x="32" y={top + 3} textAnchor="end" fill="#6b645b" fontSize="10">{maxLabel}</text>
    </g>
  );
}

function RoundLabels({ count }: { count: number }) {
  const marks = [1, 8, 16, 24, 32].filter((round) => round <= count);
  return (
    <g>
      {marks.map((round) => {
        const slot = column(round - 1, count);
        return (
          <text key={round} x={slot.x + slot.bar / 2} y="216" textAnchor="middle" fill="#6b645b" fontSize="10">
            {round}
          </text>
        );
      })}
    </g>
  );
}

function ReferenceLine({ max, value, label }: { max: number; value: number; label: string }) {
  const top = 18;
  const base = 198;
  const y = base - (value / max) * (base - top);
  return (
    <g>
      <line x1="36" x2="748" y1={y} y2={y} stroke="#b4532a" strokeDasharray="3 3" strokeWidth="1" />
      <text x="744" y={y - 3} textAnchor="end" fill="#b4532a" fontSize="10">{label}</text>
    </g>
  );
}

function column(index: number, count: number) {
  const left = 40;
  const right = 748;
  const top = 18;
  const base = 198;
  const span = right - left;
  const step = span / Math.max(count, 1);
  const bar = Math.max(step - 3, 1.5);
  return { x: left + index * step + (step - bar) / 2, bar, step, base, innerH: base - top };
}

function linePath(values: (number | null)[]): string {
  let path = "";
  let drawing = false;
  values.forEach((value, index) => {
    if (value == null) {
      drawing = false;
      return;
    }
    const slot = column(index, values.length);
    const y = 198 - value * (198 - 18);
    const x = slot.x + slot.bar / 2;
    path += `${drawing ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
    drawing = true;
  });
  return path;
}

function heatColor(share: number | null): string {
  if (share == null) return "#f4efe6";
  const mix = (from: number, to: number) => Math.round(from + (to - from) * share);
  return `rgb(${mix(244, 15)} ${mix(230, 110)} ${mix(200, 98)})`;
}

function roundTitle(row: RoundComparison): string {
  if (row.households === 0 && row.unopened === 0) return `Round ${row.round}: not in this export.`;
  return `Round ${row.round}: ${row.households} opened, ${row.hqApproved} HQ approved, ${row.unopened} not yet opened.`;
}
