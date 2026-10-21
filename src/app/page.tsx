import { readFileSync } from "node:fs";
import path from "node:path";
import { Desk } from "@/components/dashboard/desk";
import type { FieldworkSnapshot } from "@/lib/fieldwork/types";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const raw = readFileSync(path.join(process.cwd(), "public", "data", "fieldwork.json"), "utf8");
  const snapshot = JSON.parse(raw) as FieldworkSnapshot;
  return <Desk initial={snapshot} />;
}
