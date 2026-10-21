"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { parseSurveyExport } from "@/lib/suso/parse";
import { unzipSurvey } from "@/lib/suso/zip";
import type { FieldworkSnapshot } from "@/lib/fieldwork/types";

export function LoadDialog({
  open,
  onOpenChange,
  onLoad,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoad: (snapshot: FieldworkSnapshot) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function readFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setError("Choose the .zip downloaded from Survey Solutions Headquarters.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const unzipped = await unzipSurvey(bytes);
      const snapshot = parseSurveyExport(unzipped.files, {
        fileName: file.name,
        skipped: unzipped.skipped,
      });
      onLoad(snapshot);
      onOpenChange(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That zip could not be read.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Load a Headquarters export</DialogTitle>
          <DialogDescription>
            Use the Tabular zip from Survey Solutions. The desk reads the household cover, the member roster, and the
            system files. Diary and income files over 40 MB are skipped. The file stays in this browser.
          </DialogDescription>
        </DialogHeader>
        <label
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-accent/40 px-4 py-8 text-center"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const file = event.dataTransfer.files[0];
            if (file) void readFile(file);
          }}
        >
          <span className="font-medium">Drop the zip here, or browse</span>
          <span className="text-xs text-muted-foreground">VUTHIES_2026_2_Tabular_All_….zip</span>
          <input
            type="file"
            accept=".zip,application/zip"
            className="sr-only"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void readFile(file);
            }}
          />
        </label>
        {busy && <p className="text-sm text-muted-foreground">Reading the export…</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
