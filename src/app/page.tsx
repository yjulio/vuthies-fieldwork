import { Desk } from "@/components/dashboard/desk";
import type { FieldworkSnapshot } from "@/lib/fieldwork/types";
import snapshotJson from "../../public/data/fieldwork.json";

export default function HomePage() {
  return <Desk initial={snapshotJson as FieldworkSnapshot} />;
}
