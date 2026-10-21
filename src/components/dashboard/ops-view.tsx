"use client";

import { ActivityChart } from "@/components/dashboard/activity-chart";
import { formatDuration, formatNumber, formatPct, PROVINCE_ORDER } from "@/components/dashboard/format";
import { VanuatuMap } from "@/components/dashboard/vanuatu-map";
import {
  alerts,
  dailyActivity,
  groupBy,
  kpis,
  resultMix,
  roundRows,
  workflowSteps,
  type Kpis,
} from "@/lib/fieldwork/metrics";
import type { Assignment, Interview } from "@/lib/fieldwork/types";

export function OpsView({
  interviews,
  assignments,
  target,
  asOf,
  onSelect,
  onProvince,
}: {
  interviews: Interview[];
  assignments: Assignment[];
  target: number | null;
  asOf: string;
  onSelect: (id: string) => void;
  onProvince: (province: string) => void;
}) {
  const summary = kpis(interviews, assignments, target);
  const steps = workflowSteps(interviews);
  const stepMax = Math.max(1, ...steps.map((step) => step.count));
  const provinces = groupBy(interviews, (interview) => ({
    key: interview.province,
    label: interview.province,
  })).sort((a, b) => PROVINCE_ORDER.indexOf(a.label) - PROVINCE_ORDER.indexOf(b.label));
  const days = dailyActivity(interviews, asOf);
  const watch = alerts(interviews);
  const results = resultMix(interviews);
  const rounds = roundRows(interviews, assignments).filter((round) => round.round <= 32);

  return (
    <div className="flex flex-col gap-5">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Households opened" value={formatNumber(summary.households)} detail={targetDetail(summary)} />
        <Kpi
          label="HQ approved"
          value={formatNumber(summary.hqApproved)}
          detail={summary.households ? `${formatPct(summary.hqApproved / summary.households)} of opened households` : "—"}
        />
        <Kpi
          label="Response rate"
          value={formatPct(summary.responseRate)}
          detail={
            summary.finalizedKnown
              ? `${formatNumber(summary.responded)} complete or partial of ${formatNumber(summary.finalizedKnown)} with a result code`
              : "No result codes in this file"
          }
        />
        <Kpi
          label="Median active time"
          value={formatDuration(summary.medianDuration)}
          detail="Submitted interviews only"
        />
        <Kpi
          label="Still in the field"
          value={formatNumber(summary.inField)}
          detail={`${formatNumber(summary.notStarted)} assigned and not yet started`}
        />
        <Kpi
          label="With supervisor"
          value={formatNumber(summary.withSupervisor)}
          detail="Completed, or sent back by headquarters"
        />
        <Kpi label="With headquarters" value={formatNumber(summary.withHq)} detail="Approved by the supervisor, waiting on HQ" />
        <Kpi
          label="GPS on responding households"
          value={formatPct(summary.gpsCoverage)}
          detail={summary.gpsKnown ? `${formatNumber(summary.gpsKnown)} complete or partial interviews` : "No responding households yet"}
        />
      </section>

      <section className="rounded-2xl border bg-card p-4">
        <h2 className="font-display text-xl">Where the work sits</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-5">
          {steps.map((step) => (
            <div key={step.id}>
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="text-sm">{step.label}</span>
                <span className="font-mono text-sm">{formatNumber(step.count)}</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${(step.count / stepMax) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        <div className="rounded-2xl border bg-card p-4">
          <h2 className="font-display text-xl">Last 12 weeks</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Completions and HQ approvals dated from the interview action file, through {asOf}.
          </p>
          <div className="mt-3">
            <ActivityChart days={days} />
          </div>
          <h3 className="mt-4 text-sm font-medium">Rounds in this file</h3>
          <div className="mt-2 grid grid-cols-8 gap-1.5 sm:grid-cols-16">
            {rounds.map((round) => {
              const share = round.households ? round.hqApproved / round.households : 0;
              const empty = round.households === 0 && round.unopened === 0;
              return (
                <div
                  key={round.round}
                  title={
                    empty
                      ? `Round ${round.round}: not in this export`
                      : `Round ${round.round}: ${round.hqApproved} HQ approved of ${round.households} opened${round.unopened ? `, ${round.unopened} not yet opened` : ""}`
                  }
                  className={`flex h-14 flex-col justify-end rounded-md border px-1 py-1 ${empty ? "border-dashed bg-muted/40" : "bg-accent/30"}`}
                >
                  <div className="mx-auto w-full overflow-hidden rounded-sm bg-muted" style={{ height: 18 }}>
                    <div className="bg-primary" style={{ width: `${share * 100}%`, height: "100%" }} />
                  </div>
                  <span className="mt-1 text-center text-[10px] text-muted-foreground">{round.round}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Each cell is a survey round. The bar is the share already approved by headquarters. Dashed cells are outside this export.
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <h2 className="font-display text-xl">Dwelling GPS</h2>
          <p className="mt-1 mb-2 text-sm text-muted-foreground">Click a point to open the case. Coordinates come from the cover GPS question.</p>
          <VanuatuMap interviews={interviews} onSelect={onSelect} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-4">
          <h2 className="font-display text-xl">Provinces</h2>
          <ul className="mt-3 flex flex-col gap-3">
            {provinces.map((province) => (
              <li key={province.key}>
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => onProvince(province.label)}
                >
                  <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium">{province.label}</span>
                    <span className="text-muted-foreground">
                      {formatNumber(province.hqApproved)} / {formatNumber(province.households)} HQ approved
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${province.households ? (province.hqApproved / province.households) * 100 : 0}%` }}
                    />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <h2 className="font-display text-xl">Needs a look</h2>
          {watch.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No quality alerts in the current filter.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {watch.map((item) => (
                <li key={item.title} className="rounded-xl bg-muted/70 px-3 py-2">
                  <div className="text-xs tracking-wide text-muted-foreground uppercase">
                    {item.severity === "high" ? "Check now" : "Watch"}
                  </div>
                  <div className="font-medium">{item.title}</div>
                  <p className="text-sm text-muted-foreground">{item.detail}</p>
                </li>
              ))}
            </ul>
          )}
          {results.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium">Result on submitted households</h3>
              <ul className="mt-2 flex flex-col gap-1.5">
                {results.map((result) => (
                  <li key={result.key} className="flex items-center justify-between text-sm">
                    <span>{result.label}</span>
                    <span className="font-mono">{formatNumber(result.count)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="rounded-2xl border bg-card px-4 py-3">
      <h2 className="text-xs tracking-wide text-muted-foreground uppercase">{label}</h2>
      <p className="font-display mt-1 text-3xl leading-none">{value}</p>
      <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
    </article>
  );
}

function targetDetail(summary: Kpis): string {
  if (summary.target == null) return "No assignment quantities in this file";
  const waiting = summary.unopened > 0 ? `${formatNumber(summary.unopened)} in assignments not yet opened` : "Every assignment in the file has an interview";
  return `${formatNumber(summary.target)} households on live assignments. ${waiting}.`;
}
