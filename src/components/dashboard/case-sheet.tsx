"use client";

import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { bucketClass, formatDate, formatDuration, formatWhen } from "@/components/dashboard/format";
import { BUCKET_LABEL, FLAG_LABEL } from "@/lib/suso/codes";
import type { Interview } from "@/lib/fieldwork/types";

export function CaseSheet({
  interview,
  onOpenChange,
}: {
  interview: Interview | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={interview != null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto data-[side=right]:sm:max-w-md">
        <SheetHeader>
              <SheetTitle className="font-mono text-lg">{interview?.key ?? "Case"}</SheetTitle>
              <SheetDescription>
                {interview ? `${interview.province} · ${interview.island} · ${interview.areaCouncil}` : "Interview"}
              </SheetDescription>
            </SheetHeader>
            {interview && (
          <>
            <div className="flex flex-col gap-5 px-4 pb-6">
              <div className="flex flex-wrap gap-2">
                <Badge className={bucketClass(interview.bucket)} variant="secondary">
                  {BUCKET_LABEL[interview.bucket] ?? interview.statusLabel}
                </Badge>
                {interview.resultLabel && <Badge variant="outline">{interview.resultLabel}</Badge>}
                {interview.round != null && <Badge variant="outline">Round {interview.round}</Badge>}
              </div>

              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                <Fact label="EA" value={interview.ea} />
                <Fact label="Household" value={interview.hhSerial || "—"} />
                <Fact label="Interviewer" value={interview.interviewer ?? "—"} mono />
                <Fact label="Supervisor" value={interview.supervisor ?? "—"} mono />
                <Fact label="Urban or rural" value={interview.urbanRural} />
                <Fact label="Active time" value={formatDuration(interview.durationMinutes)} />
                <Fact label="Persons listed" value={interview.members == null ? "—" : String(interview.members)} />
                <Fact
                  label="GPS"
                  value={
                    interview.latitude != null && interview.longitude != null
                      ? `${interview.latitude.toFixed(4)}, ${interview.longitude.toFixed(4)}`
                      : "Missing"
                  }
                />
                <Fact
                  label="Accuracy"
                  value={interview.gpsAccuracy == null ? "—" : `${Math.round(interview.gpsAccuracy)} m`}
                />
                <Fact label="Validation errors" value={String(interview.errors)} />
              </dl>

              {interview.flags.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Flags</h3>
                  <ul className="flex flex-col gap-1 text-sm">
                    {interview.flags.map((flag) => (
                      <li key={flag}>{FLAG_LABEL[flag] ?? flag}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Workflow</h3>
                <ol className="flex flex-col gap-2 border-l border-border pl-3">
                  {interview.events.map((event, index) => (
                    <li key={`${event.at}-${event.actionCode}-${index}`} className="text-sm">
                      <div className="font-medium">{event.action}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatWhen(event.at)} · {event.by || "unknown"} · {event.role}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              {interview.notes.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Comments</h3>
                  <ul className="flex flex-col gap-2">
                    {interview.notes.map((note, index) => (
                      <li key={`${note.at}-${index}`} className="rounded-lg bg-muted px-3 py-2 text-sm">
                        <div className="text-xs text-muted-foreground">
                          {note.variable} · {note.by} · {formatDate(note.at)}
                        </div>
                        {note.text}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {interview.errorSamples.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Validation messages
                  </h3>
                  <ul className="flex flex-col gap-2 text-sm">
                    {interview.errorSamples.map((error, index) => (
                      <li key={`${error.variable}-${index}`}>
                        <span className="font-mono text-xs">{error.variable}</span> {error.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Fact({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-xs" : ""}>{value}</dd>
    </div>
  );
}
