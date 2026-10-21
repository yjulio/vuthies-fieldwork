import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { unzipSync, strFromU8 } from "fflate";
import { parseSurveyExport } from "../src/lib/suso/parse";

const zipPath = process.argv[2];
if (!zipPath) {
  console.error("Usage: npm run ingest -- path/to/VUTHIES_tabular.zip");
  process.exit(1);
}

const bytes = new Uint8Array(readFileSync(zipPath));
const skipped: string[] = [];
const unzipped = unzipSync(bytes, {
  filter(file) {
    const base = file.name.split(/[/\\]/).pop() ?? file.name;
    const keep = /\.(tab|csv|txt|do|json)$/i.test(base) && file.originalSize <= 40_000_000;
    if (!keep) skipped.push(file.name);
    return keep;
  },
});

const files: Record<string, string> = {};
for (const [name, content] of Object.entries(unzipped)) {
  files[name] = strFromU8(content);
}

const snapshot = parseSurveyExport(files, {
  fileName: path.basename(zipPath),
  skipped,
});

const out = path.join(process.cwd(), "public", "data");
mkdirSync(out, { recursive: true });
writeFileSync(path.join(out, "fieldwork.json"), JSON.stringify(snapshot));
console.log(
  `Loaded ${snapshot.meta.source} export ${snapshot.meta.fileName}: ${snapshot.interviews.length} interviews, as of ${snapshot.meta.asOf}.`,
);
if (snapshot.meta.source === "survey-solutions") {
  console.log("This file contains survey cases. Do not commit public/data/fieldwork.json.");
}
