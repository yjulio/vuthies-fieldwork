import { daysBetween } from "@/lib/suso/table";

export const DEMO_AS_OF = "2026-10-21";
export const DEMO_FILE_NAME = "VUTHIES_2026_demo_tabular.zip";
const ROUND_ZERO = "2026-03-16";
const HOUSEHOLDS_PER_EA = 6;

type Island = {
  name: string;
  councils: string[];
  lat: number;
  lon: number;
  urban?: boolean;
};

type Province = {
  code: number;
  name: string;
  eas: number;
  islands: Island[];
};

const PROVINCES: Province[] = [
  {
    code: 1,
    name: "Torba",
    eas: 8,
    islands: [
      { name: "Torres", councils: ["Torres"], lat: -13.25, lon: 166.6 },
      { name: "Vanua Lava", councils: ["Vanua Lava"], lat: -13.85, lon: 167.47 },
      { name: "Mota Lava", councils: ["Mota Lava"], lat: -13.66, lon: 167.66 },
      { name: "Gaua", councils: ["Gaua"], lat: -14.28, lon: 167.51 },
    ],
  },
  {
    code: 2,
    name: "Sanma",
    eas: 22,
    islands: [
      {
        name: "Santo",
        councils: ["North Santo", "West Santo", "South Santo", "East Santo", "Canal-Fanafo"],
        lat: -15.3,
        lon: 166.95,
      },
      { name: "Luganville", councils: ["Luganville"], lat: -15.52, lon: 167.18, urban: true },
      { name: "Malo", councils: ["Malo"], lat: -15.7, lon: 167.17 },
    ],
  },
  {
    code: 3,
    name: "Penama",
    eas: 14,
    islands: [
      { name: "Ambae", councils: ["North Ambae", "West Ambae", "East Ambae"], lat: -15.39, lon: 167.84 },
      { name: "Maewo", councils: ["Maewo"], lat: -15.1, lon: 168.13 },
      {
        name: "Pentecost",
        councils: ["North Pentecost", "Central Pentecost", "South Pentecost"],
        lat: -15.75,
        lon: 168.19,
      },
    ],
  },
  {
    code: 4,
    name: "Malampa",
    eas: 16,
    islands: [
      {
        name: "Malekula",
        councils: [
          "North West Malekula",
          "North East Malekula",
          "Central Malekula",
          "South East Malekula",
          "South West Malekula",
        ],
        lat: -16.2,
        lon: 167.45,
      },
      {
        name: "Ambrym",
        councils: ["North Ambrym", "West Ambrym", "South East Ambrym"],
        lat: -16.25,
        lon: 168.12,
      },
      { name: "Paama", councils: ["Paama"], lat: -16.47, lon: 168.23 },
    ],
  },
  {
    code: 5,
    name: "Shefa",
    eas: 24,
    islands: [
      { name: "Epi", councils: ["Vermaul", "Vermali"], lat: -16.73, lon: 168.25 },
      { name: "Tongoa", councils: ["Tongariki"], lat: -16.9, lon: 168.55 },
      { name: "Efate", councils: ["North Efate", "Nguna-Pele", "Eratap", "Mele"], lat: -17.68, lon: 168.38 },
      { name: "Port Vila", councils: ["Port Vila"], lat: -17.74, lon: 168.32, urban: true },
    ],
  },
  {
    code: 6,
    name: "Tafea",
    eas: 16,
    islands: [
      { name: "Erromango", councils: ["North Erromango", "South Erromango"], lat: -18.8, lon: 169.15 },
      {
        name: "Tanna",
        councils: ["North Tanna", "West Tanna", "Middle Bush", "Whitesands", "South West Tanna"],
        lat: -19.52,
        lon: 169.33,
      },
      { name: "Aniwa", councils: ["Aniwa"], lat: -19.25, lon: 169.6 },
      { name: "Futuna", councils: ["Futuna"], lat: -19.53, lon: 170.22 },
      { name: "Aneityum", councils: ["Aneityum"], lat: -20.19, lon: 169.78 },
    ],
  },
];

const INTERVIEWERS: Record<string, string[]> = {
  Torba: ["int.torba.01", "int.torba.02"],
  Sanma: ["int.sanma.01", "int.sanma.02", "int.sanma.03", "int.sanma.04", "int.sanma.05"],
  Penama: ["int.penama.01", "int.penama.02", "int.penama.03"],
  Malampa: ["int.malampa.01", "int.malampa.02", "int.malampa.03", "int.malampa.04"],
  Shefa: ["int.shefa.01", "int.shefa.02", "int.shefa.03", "int.shefa.04", "int.shefa.05", "int.shefa.06"],
  Tafea: ["int.tafea.01", "int.tafea.02", "int.tafea.03", "int.tafea.04"],
};

const COMMENT_BANK = [
  "Diary day 3 is blank. Revisit or record the away-from-home code.",
  "Roster age and date of birth disagree for one member.",
  "Food away from home is missing for two members.",
  "GPS was captured on the road. Recapture at the dwelling.",
  "Wage job is recorded with zero hours worked.",
  "A required question in the housing module is still empty.",
  "The household result and the roster count do not agree.",
];

const ERROR_BANK = [
  ["age", "Age is lower than the age reported for a child of this person."],
  ["diary_day", "A diary day has no purchases and no explanation code."],
  ["hh_size", "Household size does not match the number of roster rows."],
  ["hours_worked", "Wage income is recorded but days worked are missing."],
  ["gps", "GPS accuracy is above 30 metres."],
  ["rent", "Rent is recorded for a dwelling the household owns."],
  ["school", "School attendance is yes, but the level is blank."],
];

type EaPlan = {
  assignmentId: string;
  province: Province;
  island: Island;
  council: string;
  ea: string;
  round: number;
  interviewer: string;
  supervisor: string;
  opened: boolean;
};

type Step = {
  action: number;
  who: "int" | "sup" | "hq" | "lead";
  responsible: "int" | "sup" | "hq";
};

export function buildDemoFiles(): Record<string, string> {
  const rng = mulberry32(20261021);
  const plans = planEnumerationAreas();
  const cover: Record<string, string | number>[] = [];
  const members: Record<string, string | number>[] = [];
  const diagnostics: Record<string, string | number>[] = [];
  const actions: Record<string, string | number>[] = [];
  const comments: Record<string, string | number>[] = [];
  const errors: Record<string, string | number>[] = [];
  const assignmentRows: Record<string, string | number>[] = [];

  plans.forEach((plan, index) => {
    const createdOn = addDays(roundStart(plan.round), -14);
    assignmentRows.push({
      assignment__id: plan.assignmentId,
      date: createdOn < "2026-02-01" ? "2026-02-01" : createdOn,
      time: clock(rng),
      action: 1,
      originator: "hq.lead",
      role: 3,
      responsible_name: plan.supervisor,
      responsible_role: 2,
      old__value: "",
      new__value: HOUSEHOLDS_PER_EA,
      comment: `Round ${plan.round} · province ${plan.province.name} · island ${plan.island.name} · EA ${plan.ea}`,
    });
    if (!plan.opened) return;

    assignmentRows.push({
      assignment__id: plan.assignmentId,
      date: roundStart(plan.round),
      time: clock(rng),
      action: 4,
      originator: plan.interviewer,
      role: 1,
      responsible_name: plan.interviewer,
      responsible_role: 1,
      old__value: "",
      new__value: "",
      comment: "",
    });

    for (let hh = 1; hh <= HOUSEHOLDS_PER_EA; hh++) {
      const n = index * HOUSEHOLDS_PER_EA + hh;
      const id = n.toString(16).padStart(32, "0");
      const key = interviewKey(n);
      const span = daysBetween(roundStart(plan.round), DEMO_AS_OF);
      const status = chooseStatus(span, plan, rng);
      const rejectCycle = shouldReject(plan, status, rng);
      const steps = stepsFor(status, rejectCycle);
      const dates = placeDates(steps.length, roundStart(plan.round), DEMO_AS_OF, status, rng);
      const names = {
        int: plan.interviewer,
        sup: plan.supervisor,
        hq: index % 2 === 0 ? "hq.review.01" : "hq.review.02",
        lead: "hq.lead",
      };
      const roles = { int: 1, sup: 2, hq: 3, lead: 3 };

      steps.forEach((step, stepIndex) => {
        actions.push({
          interview__key: key,
          interview__id: id,
          date: dates[stepIndex],
          time: clock(rng),
          action: step.action,
          originator: names[step.who],
          role: roles[step.who],
          responsible_name: names[step.responsible],
          responsible_role: roles[step.responsible],
        });
        if (step.action === 7 || step.action === 8) {
          const note = COMMENT_BANK[Math.floor(rng() * COMMENT_BANK.length)];
          comments.push({
            interview__key: key,
            interview__id: id,
            variable: step.action === 8 ? "diary_day" : "hh_size",
            order: comments.length + 1,
            date: dates[stepIndex],
            time: clock(rng),
            originator: names[step.who],
            role: roles[step.who],
            comment: note,
          });
        }
      });

      const started = steps.some((step) => step.action === 2);
      const submitted = [100, 120, 125, 130].includes(status);
      const result = submitted ? chooseResult(rng) : "";
      const duration = started ? chooseDuration(plan, submitted, status, rng) : null;
      const point = started ? chooseGps(plan, n, hh, rng) : null;
      const errorCount = submitted ? chooseErrors(rng) : 0;
      for (let e = 0; e < Math.min(errorCount, 6); e++) {
        const item = ERROR_BANK[e % ERROR_BANK.length];
        errors.push({
          interview__key: key,
          interview__id: id,
          variable: item[0],
          type: 2,
          message__number: e + 1,
          message: item[1],
        });
      }

      if (started) {
        const size = 2 + Math.floor(rng() * 5);
        for (let person = 1; person <= size; person++) {
          const sex = rng() < 0.49 ? 1 : 2;
          members.push({
            interview__id: id,
            interview__key: key,
            hh_members__id: person,
            sex,
            age: person === 1 ? 24 + Math.floor(rng() * 42) : Math.floor(rng() * 70),
            relationship: person === 1 ? 1 : person === 2 ? 2 : 3,
          });
        }
      }

      const rejectionsSup = steps.filter((step) => step.action === 7).length;
      const rejectionsHq = steps.filter((step) => step.action === 8).length;
      const responsible = names[steps[steps.length - 1].responsible];

      cover.push({
        interview__id: id,
        interview__key: key,
        assignment__id: plan.assignmentId,
        province: plan.province.code,
        island: plan.island.name,
        area_council: plan.council,
        ea: plan.ea,
        locality: `Block ${hh}`,
        urban_rural: plan.island.urban ? 1 : 2,
        subround: plan.round,
        hh_serial: hh,
        result,
        gps__Latitude: point ? point.lat.toFixed(5) : "",
        gps__Longitude: point ? point.lon.toFixed(5) : "",
        gps__Accuracy: point ? point.accuracy.toFixed(1) : "",
        gps__Altitude: point ? Math.round(8 + rng() * 40) : "",
        consent: started ? 1 : "",
      });

      diagnostics.push({
        interview__key: key,
        interview__id: id,
        interview__status: status,
        responsible,
        interviewers: 1,
        rejections__sup: rejectionsSup,
        rejections__hq: rejectionsHq,
        entities__errors: errorCount,
        interview__duration: duration == null ? "" : formatDuration(duration),
      });
    }
  });

  const diary = [
    {
      interview__id: cover[0]?.interview__id ?? "0",
      interview__key: cover[0]?.interview__key ?? "00-00-00-00",
      diary_food__id: 1,
      item_code: 101,
      amount_vatu: 350,
    },
  ];

  return {
    "export__readme.txt": readme(),
    "export__info.json": JSON.stringify(
      {
        questionnaireName: "VUTHIES 2026",
        version: 2,
        exportDate: "2026-10-21T22:58:00Z",
        software: "Survey Solutions 25.04.2",
      },
      null,
      2,
    ),
    "VUTHIES_2026.do": doFile(),
    "VUTHIES_2026.tab": toTsv(
      [
        "interview__id",
        "interview__key",
        "assignment__id",
        "province",
        "island",
        "area_council",
        "ea",
        "locality",
        "urban_rural",
        "subround",
        "hh_serial",
        "result",
        "gps__Latitude",
        "gps__Longitude",
        "gps__Accuracy",
        "gps__Altitude",
        "consent",
      ],
      cover,
    ),
    "hh_members.tab": toTsv(
      ["interview__id", "interview__key", "hh_members__id", "sex", "age", "relationship"],
      members,
    ),
    "diary_food.tab": toTsv(
      ["interview__id", "interview__key", "diary_food__id", "item_code", "amount_vatu"],
      diary,
    ),
    "interview__diagnostics.tab": toTsv(
      [
        "interview__key",
        "interview__id",
        "interview__status",
        "responsible",
        "interviewers",
        "rejections__sup",
        "rejections__hq",
        "entities__errors",
        "interview__duration",
      ],
      diagnostics,
    ),
    "interview__actions.tab": toTsv(
      [
        "interview__key",
        "interview__id",
        "date",
        "time",
        "action",
        "originator",
        "role",
        "responsible_name",
        "responsible_role",
      ],
      actions,
    ),
    "interview__comments.tab": toTsv(
      [
        "interview__key",
        "interview__id",
        "variable",
        "order",
        "date",
        "time",
        "originator",
        "role",
        "comment",
      ],
      comments,
    ),
    "interview__errors.tab": toTsv(
      ["interview__key", "interview__id", "variable", "type", "message__number", "message"],
      errors,
    ),
    "assignment__actions.tab": toTsv(
      [
        "assignment__id",
        "date",
        "time",
        "action",
        "originator",
        "role",
        "responsible_name",
        "responsible_role",
        "old__value",
        "new__value",
        "comment",
      ],
      assignmentRows,
    ),
  };
}

function planEnumerationAreas(): EaPlan[] {
  const plans: EaPlan[] = [];
  let serial = 0;
  for (const province of PROVINCES) {
    const crew = INTERVIEWERS[province.name];
    for (let i = 0; i < province.eas; i++) {
      const island = province.islands[i % province.islands.length];
      const council = island.councils[i % island.councils.length];
      const round = (serial % 20) + 1;
      const prefix = province.name.slice(0, 3).toUpperCase();
      plans.push({
        assignmentId: String(1000 + serial),
        province,
        island,
        council,
        ea: `${prefix}-${String(round).padStart(2, "0")}-${String((i % 9) + 1).padStart(2, "0")}`,
        round,
        interviewer: crew[i % crew.length],
        supervisor: `sup.${province.name.toLowerCase()}`,
        opened: true,
      });
      serial += 1;
    }
  }

  const futureProvinces = ["Shefa", "Sanma", "Malampa", "Tafea", "Penama"];
  futureProvinces.forEach((name, index) => {
    const province = PROVINCES.find((item) => item.name === name)!;
    for (let copy = 0; copy < 2; copy++) {
      const round = 21 + (index + copy) % 2;
      const island = province.islands[copy % province.islands.length];
      const prefix = province.name.slice(0, 3).toUpperCase();
      plans.push({
        assignmentId: String(2000 + index * 2 + copy),
        province,
        island,
        council: island.councils[0],
        ea: `${prefix}-${String(round).padStart(2, "0")}-F${copy + 1}`,
        round,
        interviewer: INTERVIEWERS[name][0],
        supervisor: `sup.${name.toLowerCase()}`,
        opened: false,
      });
    }
  });
  return plans;
}

function chooseStatus(span: number, plan: EaPlan, rng: () => number): number {
  const u = rng();
  const slow = plan.supervisor === "sup.malampa";
  if (span < 6) {
    if (u < 0.55) return 60;
    if (u < 0.9) return 85;
    return 100;
  }
  if (span < 14) {
    if (u < 0.22) return 60;
    if (u < 0.55) return 85;
    if (u < 0.68) return 65;
    if (u < 0.9) return 100;
    return 120;
  }
  if (span < 28) {
    if (u < (slow ? 0.32 : 0.1)) return 100;
    if (u < 0.24) return 65;
    if (u < 0.32) return 85;
    if (u < 0.58) return 120;
    if (u < 0.68) return 125;
    return 130;
  }
  if (u < (slow ? 0.16 : 0.04)) return 100;
  if (u < 0.08) return 125;
  if (u < 0.2) return 120;
  return 130;
}

function shouldReject(plan: EaPlan, status: number, rng: () => number): boolean {
  if (![100, 120, 130].includes(status)) return false;
  if (plan.interviewer === "int.shefa.04") return rng() < 0.55;
  return rng() < 0.07;
}

function stepsFor(status: number, rejectCycle: boolean): Step[] {
  const steps: Step[] = [
    { action: 12, who: "lead", responsible: "hq" },
    { action: 0, who: "lead", responsible: "sup" },
    { action: 1, who: "sup", responsible: "int" },
  ];
  if (status === 60) return steps;
  steps.push({ action: 13, who: "int", responsible: "int" });
  if (status === 85) {
    steps.push({ action: 2, who: "int", responsible: "int" });
    return steps;
  }
  steps.push({ action: 2, who: "int", responsible: "int" });
  steps.push({ action: 3, who: "int", responsible: "sup" });
  if (status === 65) {
    steps.push({ action: 7, who: "sup", responsible: "int" });
    steps.push({ action: 4, who: "int", responsible: "int" });
    return steps;
  }
  if (rejectCycle) {
    steps.push({ action: 7, who: "sup", responsible: "int" });
    steps.push({ action: 4, who: "int", responsible: "int" });
    steps.push({ action: 3, who: "int", responsible: "sup" });
  }
  if (status === 100) return steps;
  steps.push({ action: 5, who: "sup", responsible: "hq" });
  if (status === 125) {
    steps.push({ action: 8, who: "hq", responsible: "sup" });
    return steps;
  }
  if (status === 120) return steps;
  if (rejectCycle && rngGate(status)) {
    steps.push({ action: 8, who: "hq", responsible: "sup" });
    steps.push({ action: 5, who: "sup", responsible: "hq" });
  }
  steps.push({ action: 6, who: "hq", responsible: "hq" });
  return steps;
}

function rngGate(status: number): boolean {
  return status === 130;
}

function chooseResult(rng: () => number): number {
  const u = rng();
  if (u < 0.78) return 1;
  if (u < 0.86) return 2;
  if (u < 0.92) return 3;
  if (u < 0.96) return 4;
  if (u < 0.985) return 5;
  return 6;
}

function chooseDuration(plan: EaPlan, submitted: boolean, status: number, rng: () => number): number {
  const base = submitted || status === 100 ? 140 + rng() * 120 : 20 + rng() * 70;
  const factor = plan.interviewer === "int.tafea.02" ? 0.24 : 1;
  return Math.round(base * factor);
}

function chooseGps(
  plan: EaPlan,
  n: number,
  hh: number,
  rng: () => number,
): { lat: number; lon: number; accuracy: number } | null {
  if (plan.interviewer === "int.penama.02" && rng() < 0.72) return null;
  if (rng() < 0.05) return null;
  if (n === 103 && hh === 1) return { lat: 0, lon: 0, accuracy: 8 };
  const lat = plan.island.lat + (rng() - 0.5) * 0.14;
  const lon = plan.island.lon + (rng() - 0.5) * 0.14;
  const accuracy = rng() < 0.08 ? 30 + rng() * 70 : 3 + rng() * 14;
  return { lat, lon, accuracy };
}

function chooseErrors(rng: () => number): number {
  const u = rng();
  if (u < 0.025) return 8 + Math.floor(rng() * 5);
  if (u < 0.12) return 1 + Math.floor(rng() * 3);
  return 0;
}

function placeDates(
  count: number,
  start: string,
  asOf: string,
  status: number,
  rng: () => number,
): string[] {
  const span = Math.max(0, daysBetween(start, asOf));
  let endOffset = span;
  if (status === 130) endOffset = Math.min(span, 14 + Math.floor(rng() * 8));
  else if (status === 120 || status === 125) endOffset = Math.min(span, 7 + Math.floor(rng() * 6));
  else if (status === 100 || status === 65) endOffset = Math.min(span, 4 + Math.floor(rng() * 4));
  else endOffset = Math.min(span, Math.max(0, span - Math.floor(rng() * 2)));

  const end = addDays(start, endOffset);
  const width = Math.max(0, daysBetween(start, end));
  const dates: string[] = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1);
    dates.push(addDays(start, Math.round(t * width)));
  }
  return dates;
}

function roundStart(round: number): string {
  return addDays(ROUND_ZERO, (round - 1) * 11);
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function interviewKey(n: number): string {
  const s = String(10_000_000 + n);
  return `${s.slice(0, 2)}-${s.slice(2, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes * 60));
  const days = Math.floor(total / 86_400);
  const rest = total % 86_400;
  const hours = Math.floor(rest / 3600);
  const mins = Math.floor((rest % 3600) / 60);
  const seconds = rest % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(days)}.${pad(hours)}:${pad(mins)}:${pad(seconds)}`;
}

function clock(rng: () => number): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(7 + Math.floor(rng() * 11))}:${pad(Math.floor(rng() * 60))}:${pad(Math.floor(rng() * 60))}`;
}

function toTsv(headers: string[], rows: Record<string, string | number>[]): string {
  const lines = [headers.join("\t")];
  for (const row of rows) {
    lines.push(
      headers
        .map((header) => String(row[header] ?? "").replace(/\t/g, " ").replace(/\n/g, " "))
        .join("\t"),
    );
  }
  return `${lines.join("\n")}\n`;
}

function readme(): string {
  return `Survey Solutions 25.04.2 (build 26021)
Export date: 2026-10-21T22:58:00Z

Questionnaire: VUTHIES 2026 (version 2)

DEMONSTRATION EXTRACT
This archive imitates a Survey Solutions Headquarters tabular export so the fieldwork desk can be reviewed without microdata. It is not the file VUTHIES_2026_2_Tabular_All_20261021T2258Z.zip and it is not an official VNSO progress report.

Files:
1. VUTHIES_2026.tab — household cover
2. hh_members.tab — household roster
3. diary_food.tab — one decoy diary row, ignored by the desk
4. interview__diagnostics.tab
5. interview__actions.tab
6. interview__comments.tab
7. interview__errors.tab
8. assignment__actions.tab
`;
}

function doFile(): string {
  return `label define province 1 "Torba" 2 "Sanma" 3 "Penama" 4 "Malampa" 5 "Shefa" 6 "Tafea", replace
label values province province
label define urban_rural 1 "Urban" 2 "Rural", replace
label values urban_rural urban_rural
label define result 1 "Complete" 2 "Partial" 3 "Refused" 4 "No contact" 5 "Vacant" 6 "Other", replace
label values result result
label define sex 1 "Male" 2 "Female", replace
label values sex sex
`;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
