# VUTHIES 2026–27 fieldwork desk

Monitoring desk for the Vanuatu Household Income and Expenditure Survey. It reads a Survey Solutions **Tabular** export and shows where fieldwork stands: workflow, province and round progress, team workload, and quality flags.

The Headquarters file `VUTHIES_2026_2_Tabular_All_20261021T2258Z.zip` was not available in this environment. The desk opens on a **demonstration extract** with the same file layout. Those counts are synthetic. Load the real zip before using any figure as VNSO progress.

The published survey design is 5,280 households across 32 rounds. That figure is shown only as context. Every count on the desk comes from the file you load. The Rounds page compares all 32 rounds: workload, approval and response rates, active time, a province heatmap, household result, and quality flags.

## Run

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:4721](http://127.0.0.1:4721).

## Load the real export

In the desk, choose **Load export** and drop the Tabular zip from Survey Solutions Headquarters. Parsing happens in the browser. Diary and income files larger than 40 MB are skipped. The zip is not uploaded.

To bake a file into the local page instead:

```bash
npm run ingest -- /path/to/VUTHIES_2026_2_Tabular_All_20261021T2258Z.zip
```

That rewrites `public/data/fieldwork.json`. Do not commit that file if it contains real cases.

## What is read

- `interview__diagnostics`, `interview__actions`, `interview__comments`, `interview__errors`
- `assignment__actions`
- the household cover (province, island, area council, EA, round, result, GPS)
- the member roster, for a count of persons listed
- value labels from the Stata `.do` file, when the export includes one

Household result codes and province names come from those labels. If a province column is numeric and unlabeled, codes 1–6 are read as Torba, Sanma, Penama, Malampa, Shefa, and Tafea.

## Quality flags

- Very short: submitted interview under 50 minutes of active time
- Short: 50–89 minutes
- Missing or weak GPS, or a point outside Vanuatu
- Validation errors, repeated rejection
- Still in the field after 10 days, waiting on a supervisor after 5, waiting on headquarters after 7

## Regenerate the demonstration extract

```bash
npm run generate-demo
npm test
```
