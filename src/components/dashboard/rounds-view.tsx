"use client";

import {
  DurationByRound,
  ProvinceRoundHeatmap,
  QualityByRound,
  RatesByRound,
  ResultsByRound,
  RoundTable,
  WorkflowByRound,
} from "@/components/dashboard/round-charts";
import { Button } from "@/components/ui/button";
import { assignmentsForView, provinceRoundHeatmap, roundComparison, SURVEY_ROUNDS } from "@/lib/fieldwork/rounds";
import type { Assignment, Interview } from "@/lib/fieldwork/types";

export function RoundsView({
  interviews,
  assignments,
  province,
  island,
  activeRound,
  onSelectRound,
}: {
  interviews: Interview[];
  assignments: Assignment[];
  province: string;
  island: string;
  activeRound: string;
  onSelectRound: (round: string) => void;
}) {
  const rows = roundComparison(interviews, assignmentsForView(assignments, province, island)).filter(
    (row) => row.round <= SURVEY_ROUNDS,
  );
  const heat = provinceRoundHeatmap(interviews, SURVEY_ROUNDS);
  const selected = activeRound ? Number(activeRound) : null;
  const inFile = rows.filter((row) => row.households > 0).length;
  const notOpened = rows.reduce((sum, row) => sum + row.unopened, 0);

  function choose(round: number) {
    onSelectRound(String(round) === activeRound ? "" : String(round));
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border bg-card px-4 py-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl">32-round comparison</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              VUTHIES is collected in {SURVEY_ROUNDS} rounds. {inFile} of those rounds have opened households in this view
              {notOpened > 0 ? `, and ${notOpened} households are assigned but not yet opened` : ""}. Select a round to
              filter the rest of the desk. Select it again to clear that filter.
            </p>
          </div>
          {activeRound && (
            <Button variant="outline" size="sm" onClick={() => onSelectRound("")}>
              Clear round {activeRound}
            </Button>
          )}
        </div>
      </section>

      <WorkflowByRound rows={rows} activeRound={selected} onSelect={choose} />

      <div className="grid gap-4 xl:grid-cols-2">
        <RatesByRound rows={rows} activeRound={selected} onSelect={choose} />
        <DurationByRound rows={rows} activeRound={selected} onSelect={choose} />
      </div>

      <ProvinceRoundHeatmap
        provinces={heat.provinces}
        rounds={heat.rounds.filter((round) => round <= SURVEY_ROUNDS)}
        cells={heat.cells.filter((cell) => cell.round <= SURVEY_ROUNDS)}
        activeRound={selected}
        onSelect={choose}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <ResultsByRound rows={rows} activeRound={selected} onSelect={choose} />
        <QualityByRound rows={rows} activeRound={selected} onSelect={choose} />
      </div>

      <section className="rounded-2xl border bg-card p-4">
        <h2 className="font-display text-xl">Round numbers</h2>
        <p className="mt-1 mb-3 text-sm text-muted-foreground">The same comparison in a table. A dash means the round has nothing to measure yet.</p>
        <RoundTable rows={rows} activeRound={selected} onSelect={choose} />
      </section>
    </div>
  );
}
