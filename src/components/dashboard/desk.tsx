"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CaseSheet } from "@/components/dashboard/case-sheet";
import { CasesView } from "@/components/dashboard/cases-view";
import { formatDate } from "@/components/dashboard/format";
import { GeographyView } from "@/components/dashboard/geography-view";
import { LoadDialog } from "@/components/dashboard/load-dialog";
import { OpsView } from "@/components/dashboard/ops-view";
import { QualityView } from "@/components/dashboard/quality-view";
import { TeamsView } from "@/components/dashboard/teams-view";
import { applyFilters, bucketOptions, flagOptions } from "@/lib/fieldwork/metrics";
import { BUCKET_LABEL, FLAG_LABEL } from "@/lib/suso/codes";
import { EMPTY_FILTERS, type FieldworkSnapshot, type Filters } from "@/lib/fieldwork/types";

const VIEWS = [
  { id: "ops", label: "Operations" },
  { id: "geography", label: "Geography" },
  { id: "teams", label: "Teams" },
  { id: "quality", label: "Quality" },
  { id: "cases", label: "Cases" },
] as const;

type ViewId = (typeof VIEWS)[number]["id"];

export function Desk({ initial }: { initial: FieldworkSnapshot }) {
  const baseline = useRef(initial);
  const [snapshot, setSnapshot] = useState(initial);
  const [view, setView] = useState<ViewId>("ops");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [loadOpen, setLoadOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => applyFilters(snapshot.interviews, filters), [snapshot.interviews, filters]);
  const selected = snapshot.interviews.find((interview) => interview.id === selectedId) ?? null;
  const provinces = unique(snapshot.interviews.map((interview) => interview.province));
  const islands = unique(
    snapshot.interviews
      .filter((interview) => !filters.province || interview.province === filters.province)
      .map((interview) => interview.island),
  );
  const rounds = unique(
    snapshot.interviews.map((interview) => (interview.round == null ? "" : String(interview.round))).filter(Boolean),
  ).sort((a, b) => Number(a) - Number(b));
  const interviewers = unique(snapshot.interviews.map((interview) => interview.interviewer ?? "")).filter(Boolean);
  const buckets = bucketOptions(snapshot.interviews);
  const flags = flagOptions(snapshot.interviews);
  const activeFilters = countFilters(filters);

  function patch(next: Partial<Filters>) {
    setFilters((current) => ({ ...current, ...next }));
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6">
      <header className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs tracking-[0.18em] text-primary uppercase">Vanuatu Bureau of Statistics</p>
          <h1 className="font-display text-3xl leading-tight sm:text-4xl">VUTHIES 2026–27</h1>
          <p className="text-sm text-muted-foreground">Household income and expenditure survey · fieldwork monitoring desk</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground">
            As of {formatDate(snapshot.meta.asOf)}
            {snapshot.meta.susoVersion ? ` · Survey Solutions ${snapshot.meta.susoVersion}` : ""}
          </p>
          <Button onClick={() => setLoadOpen(true)}>Load export</Button>
          {snapshot !== baseline.current && (
            <Button
              variant="outline"
              onClick={() => {
                setSnapshot(baseline.current);
                setFilters(EMPTY_FILTERS);
                setSelectedId(null);
              }}
            >
              Demonstration
            </Button>
          )}
        </div>
      </header>

      <div
        className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
          snapshot.meta.source === "demonstration"
            ? "border-amber-700/30 bg-amber-100/70"
            : "border-primary/20 bg-accent"
        }`}
      >
        <p className="font-medium">
          {snapshot.meta.source === "demonstration" ? "Demonstration extract" : snapshot.meta.fileName}
        </p>
        <p className="mt-1 text-muted-foreground">{snapshot.meta.note}</p>
        {snapshot.meta.publishedDesign && (
          <p className="mt-1 text-muted-foreground">{snapshot.meta.publishedDesign.note}</p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setView(item.id)}
            className={`rounded-full px-3 py-1.5 text-sm whitespace-nowrap ${
              view === item.id ? "bg-primary text-primary-foreground" : "bg-card text-foreground ring-1 ring-border"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground lg:col-span-2">
          Search key, EA, or login
          <Input
            value={filters.query}
            placeholder="Key, EA, or login"
            onChange={(event) => patch({ query: event.target.value })}
          />
        </label>
        <Filter label="Province" value={filters.province} onChange={(province) => patch({ province, island: "" })}>
          {provinces.map((province) => (
            <option key={province} value={province}>
              {province}
            </option>
          ))}
        </Filter>
        <Filter label="Island" value={filters.island} onChange={(island) => patch({ island })}>
          {islands.map((island) => (
            <option key={island} value={island}>
              {island}
            </option>
          ))}
        </Filter>
        <Filter label="Round" value={filters.round} onChange={(round) => patch({ round })}>
          {rounds.map((round) => (
            <option key={round} value={round}>
              Round {round}
            </option>
          ))}
        </Filter>
        <Filter label="Status" value={filters.bucket} onChange={(bucket) => patch({ bucket })}>
          {buckets.map((bucket) => (
            <option key={bucket} value={bucket}>
              {BUCKET_LABEL[bucket] ?? bucket}
            </option>
          ))}
        </Filter>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Filter label="Interviewer" value={filters.interviewer} onChange={(interviewer) => patch({ interviewer })}>
          {interviewers.map((login) => (
            <option key={login} value={login}>
              {login}
            </option>
          ))}
        </Filter>
        <Filter label="Flag" value={filters.flag} onChange={(flag) => patch({ flag })}>
          {flags.map((flag) => (
            <option key={flag} value={flag}>
              {FLAG_LABEL[flag]}
            </option>
          ))}
        </Filter>
        {activeFilters > 0 && (
          <Button variant="ghost" size="sm" className="mt-4" onClick={() => setFilters(EMPTY_FILTERS)}>
            Clear filters ({activeFilters})
          </Button>
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          {filtered.length} of {snapshot.interviews.length} households in view
          {snapshot.meta.questionnaire ? ` · ${snapshot.meta.questionnaire}` : ""}
        </p>
      </div>

      <main className="mt-4 flex-1">
        {view === "ops" && (
          <OpsView
            interviews={filtered}
            assignments={snapshot.assignments}
            target={snapshot.meta.targetHouseholds}
            asOf={snapshot.meta.asOf}
            onSelect={setSelectedId}
            onProvince={(province) => {
              patch({ province, island: "" });
              setView("geography");
            }}
          />
        )}
        {view === "geography" && (
          <GeographyView interviews={filtered} filters={filters} onFilter={(next) => patch(next)} />
        )}
        {view === "teams" && (
          <TeamsView
            interviews={filtered}
            onInterviewer={(login) => {
              patch({ interviewer: login });
              setView("cases");
            }}
          />
        )}
        {view === "quality" && (
          <QualityView
            interviews={filtered}
            onFlag={(flag) => {
              patch({ flag });
              setView("cases");
            }}
          />
        )}
        {view === "cases" && (
          <CasesView
            key={`${filters.province}|${filters.island}|${filters.round}|${filters.bucket}|${filters.interviewer}|${filters.flag}|${filters.query}`}
            interviews={filtered}
            onSelect={setSelectedId}
          />
        )}
      </main>

      <footer className="mt-8 border-t py-4 text-xs text-muted-foreground">
        <p>
          Files read: {snapshot.meta.filesUsed.join(", ") || "none"}.
          {snapshot.meta.filesIgnored.length > 0
            ? ` Left unread: ${snapshot.meta.filesIgnored.length} other data file${snapshot.meta.filesIgnored.length === 1 ? "" : "s"}.`
            : ""}
          {snapshot.meta.filesSkipped.length > 0
            ? ` Skipped ${snapshot.meta.filesSkipped.length} large or unsupported files.`
            : ""}
        </p>
        <p className="mt-1">
          {formatNumberSafe(filtered.reduce((sum, interview) => sum + (interview.members ?? 0), 0))} persons are listed
          on started rosters in this view. That is a fieldwork count, not a population estimate.
        </p>
      </footer>

      <LoadDialog open={loadOpen} onOpenChange={setLoadOpen} onLoad={(next) => {
        setSnapshot(next);
        setFilters(EMPTY_FILTERS);
        setSelectedId(null);
        setView("ops");
      }} />
      <CaseSheet interview={selected} onOpenChange={(open) => !open && setSelectedId(null)} />
    </div>
  );
}

function Filter({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {label}
      <select
        className="h-8 rounded-lg border bg-card px-2 text-sm text-foreground"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">All</option>
        {children}
      </select>
    </label>
  );
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function countFilters(filters: Filters): number {
  return Object.values(filters).filter((value) => value.trim()).length;
}

function formatNumberSafe(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}
