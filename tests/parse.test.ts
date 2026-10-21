import assert from "node:assert/strict";
import test from "node:test";
import { buildDemoFiles } from "../src/lib/demo/build";
import { parseSurveyExport } from "../src/lib/suso/parse";
import { parseDurationMinutes, parseDelimited } from "../src/lib/suso/table";
import { unzipSurvey, zipTextFiles } from "../src/lib/suso/zip";
import { kpis } from "../src/lib/fieldwork/metrics";
import { roundComparison } from "../src/lib/fieldwork/rounds";

test("duration uses Survey Solutions DD.HH:MM:SS", () => {
  assert.equal(parseDurationMinutes("00.01:30:00"), 90);
  assert.equal(parseDurationMinutes("00.00:45:30"), 45.5);
  assert.equal(parseDurationMinutes(""), null);
});

test("quoted csv cells stay intact", () => {
  const table = parseDelimited('interview__id,comment\n"abc","say ""hello"", friend"\n');
  assert.equal(table.rows[0].comment, 'say "hello", friend');
});

test("demonstration extract parses into a fieldwork snapshot", () => {
  const snapshot = parseSurveyExport(buildDemoFiles(), { fileName: "VUTHIES_2026_demo_tabular.zip" });
  assert.equal(snapshot.meta.source, "demonstration");
  assert.match(snapshot.meta.questionnaire ?? "", /VUTHIES 2026/);
  assert.equal(snapshot.meta.asOf, "2026-10-21");
  assert.equal(snapshot.interviews.length, 600);
  assert.equal(snapshot.assignments.length, 110);
  assert.equal(snapshot.meta.targetHouseholds, 660);
  assert.equal(new Set(snapshot.interviews.map((interview) => interview.province)).size, 6);
  assert.ok(snapshot.interviews.some((interview) => interview.province === "Torba"));
  assert.ok(snapshot.interviews.some((interview) => interview.province === "Shefa"));
  assert.equal(snapshot.meta.filesUsed.some((name) => name.endsWith("diary_food.tab")), false);
  assert.ok(snapshot.meta.filesIgnored.some((name) => name.endsWith("diary_food.tab")));

  const tafea = snapshot.interviews.filter(
    (interview) => interview.interviewer === "int.tafea.02" && interview.flags.includes("very-short"),
  );
  assert.ok(tafea.length >= 3, `expected short Tafea cases, got ${tafea.length}`);

  const penama = snapshot.interviews.filter(
    (interview) =>
      interview.interviewer === "int.penama.02" &&
      (interview.resultClass === "complete" || interview.resultClass === "partial"),
  );
  const missing = penama.filter((interview) => interview.flags.includes("missing-gps"));
  assert.ok(penama.length >= 4);
  assert.ok(missing.length / penama.length >= 0.4);

  assert.ok(snapshot.interviews.some((interview) => interview.flags.includes("outside-vanuatu")));
  const summary = kpis(snapshot.interviews, snapshot.assignments, snapshot.meta.targetHouseholds);
  assert.ok(summary.hqApproved > 150);
  assert.ok(summary.inField > 20);
  assert.ok(summary.responseRate != null && summary.responseRate > 0.7 && summary.responseRate < 0.98);
  assert.ok((summary.medianDuration ?? 0) > 60);
  assert.ok(snapshot.interviews.some((interview) => (interview.members ?? 0) >= 2));

  const rounds = roundComparison(snapshot.interviews, snapshot.assignments);
  assert.equal(rounds.length, 32);
  assert.equal(rounds[0].households > 0, true);
  assert.ok(rounds[0].hqApproved / rounds[0].households > (rounds[19].hqApproved / rounds[19].households));
  assert.equal(rounds[31].households, 0);
  assert.ok(rounds[20].unopened > 0);
});

test("zip roundtrip keeps the cover file", async () => {
  const files = buildDemoFiles();
  const unzipped = await unzipSurvey(zipTextFiles(files));
  const snapshot = parseSurveyExport(unzipped.files, {
    fileName: "VUTHIES_2026_demo_tabular.zip",
    skipped: unzipped.skipped,
  });
  assert.equal(snapshot.interviews.length, 600);
});

test("a cover file alone is enough when diagnostics are missing", () => {
  const files = buildDemoFiles();
  delete files["interview__diagnostics.tab"];
  const snapshot = parseSurveyExport(files, { fileName: "partial.zip" });
  assert.equal(snapshot.interviews.length, 600);
  assert.ok(snapshot.interviews.every((interview) => interview.province !== "Code 5"));
});
