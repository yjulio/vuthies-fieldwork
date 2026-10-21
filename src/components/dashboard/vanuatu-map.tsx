"use client";

import { bucketClass } from "@/components/dashboard/format";
import { BUCKET_LABEL } from "@/lib/suso/codes";
import { insideVanuatu } from "@/lib/fieldwork/metrics";
import type { Interview } from "@/lib/fieldwork/types";

const BOUNDS = { minLat: -20.55, maxLat: -12.85, minLon: 166.25, maxLon: 170.55 };

const DOT: Record<string, string> = {
  hqApproved: "#1f7a4d",
  awaitingHq: "#0f6e62",
  awaitingSupervisor: "#b7791f",
  hqRejected: "#b45309",
  returned: "#b4532a",
  inProgress: "#2c5f8a",
  restarted: "#2c5f8a",
  notStarted: "#8a8478",
  notAssigned: "#8a8478",
  created: "#8a8478",
};

function project(lat: number, lon: number) {
  const x = ((lon - BOUNDS.minLon) / (BOUNDS.maxLon - BOUNDS.minLon)) * 320 + 28;
  const y = ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * 560 + 24;
  return { x, y };
}

export function VanuatuMap({
  interviews,
  onSelect,
}: {
  interviews: Interview[];
  onSelect: (id: string) => void;
}) {
  const plotted = interviews.filter(insideVanuatu);
  const labels = new Map<string, { lat: number; lon: number; n: number }>();
  for (const interview of plotted) {
    const current = labels.get(interview.island) ?? { lat: 0, lon: 0, n: 0 };
    current.lat += interview.latitude!;
    current.lon += interview.longitude!;
    current.n += 1;
    labels.set(interview.island, current);
  }

  return (
    <figure className="flex h-full flex-col">
      <svg viewBox="0 0 380 640" role="img" aria-label="Vanuatu map of interview GPS points" className="h-auto w-full">
        <rect x="0" y="0" width="380" height="640" rx="18" fill="#e7f0ee" />
        <text x="28" y="22" fill="#3e5c58" fontSize="11" fontFamily="var(--font-source), sans-serif">
          N
        </text>
        <line x1="32" y1="28" x2="32" y2="48" stroke="#3e5c58" strokeWidth="1.2" />
        <path d="M32 28 L28 36 L36 36 Z" fill="#3e5c58" />
        {[ -14, -16, -18, -20 ].map((lat) => {
          const y = project(lat, BOUNDS.minLon).y;
          return (
            <g key={lat}>
              <line x1="24" y1={y} x2="348" y2={y} stroke="#c5d6d2" strokeWidth="0.6" />
              <text x="352" y={y + 3} fill="#6d8380" fontSize="9">
                {lat}°
              </text>
            </g>
          );
        })}
        {plotted.map((interview) => {
          const { x, y } = project(interview.latitude!, interview.longitude!);
          return (
            <circle
              key={interview.id}
              cx={x}
              cy={y}
              r="3.2"
              fill={DOT[interview.bucket] ?? "#5c6570"}
              opacity="0.85"
              className="cursor-pointer"
              onClick={() => onSelect(interview.id)}
            >
              <title>{`${interview.key} · ${interview.island} · ${BUCKET_LABEL[interview.bucket] ?? interview.statusLabel}`}</title>
            </circle>
          );
        })}
        {[...labels.entries()].map(([name, value]) => {
          const { x, y } = project(value.lat / value.n, value.lon / value.n);
          return (
            <text
              key={name}
              x={x + 6}
              y={y - 6}
              fill="#1c3a36"
              fontSize="9"
              fontFamily="var(--font-source), sans-serif"
              style={{ pointerEvents: "none" }}
            >
              {name}
            </text>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>{plotted.length} points inside Vanuatu</span>
        <span className={bucketClass("hqApproved") + " rounded-full px-2 py-0.5"}>HQ approved</span>
        <span className={bucketClass("awaitingSupervisor") + " rounded-full px-2 py-0.5"}>In review</span>
        <span className={bucketClass("inProgress") + " rounded-full px-2 py-0.5"}>In the field</span>
      </figcaption>
    </figure>
  );
}
