import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { buildDemoFiles, DEMO_FILE_NAME } from "../src/lib/demo/build";
import { parseSurveyExport } from "../src/lib/suso/parse";
import { zipTextFiles } from "../src/lib/suso/zip";

const root = process.cwd();
const demoDir = path.join(root, "data", "demo");
mkdirSync(demoDir, { recursive: true });
mkdirSync(path.join(root, "public", "data"), { recursive: true });

const files = buildDemoFiles();
for (const [name, text] of Object.entries(files)) {
  writeFileSync(path.join(demoDir, name), text);
}
writeFileSync(path.join(demoDir, DEMO_FILE_NAME), zipTextFiles(files));

const snapshot = parseSurveyExport(files, { fileName: DEMO_FILE_NAME });
writeFileSync(path.join(root, "public", "data", "fieldwork.json"), JSON.stringify(snapshot));

console.log(
  `Wrote ${snapshot.interviews.length} interviews to public/data/fieldwork.json and ${DEMO_FILE_NAME}.`,
);
