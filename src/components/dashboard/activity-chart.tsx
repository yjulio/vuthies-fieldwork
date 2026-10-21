"use client";

import { formatDate } from "@/components/dashboard/format";
import type { DayRow } from "@/lib/fieldwork/metrics";

export function ActivityChart({ days }: { days: DayRow[] }) {
  const width = 640;
  const height = 180;
  const pad = { l: 28, r: 8, t: 16, b: 28 };
  const max = Math.max(1, ...days.map((day) => Math.max(day.completed, day.hqApproved)));
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const step = innerW / days.length;

  const line = days
    .map((day, index) => {
      const x = pad.l + index * step + step / 2;
      const y = pad.t + innerH - (day.hqApproved / max) * innerH;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const ticks = [0, Math.floor(days.length / 2), days.length - 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Daily completions and headquarters approvals" className="h-auto w-full">
      {[0.25, 0.5, 0.75, 1].map((share) => {
        const y = pad.t + innerH - share * innerH;
        return <line key={share} x1={pad.l} x2={width - pad.r} y1={y} y2={y} stroke="#e4ddd0" strokeWidth="1" />;
      })}
      {days.map((day, index) => {
        const h = (day.completed / max) * innerH;
        const x = pad.l + index * step + 0.4;
        return (
          <rect
            key={day.date}
            x={x}
            y={pad.t + innerH - h}
            width={Math.max(step - 0.8, 0.6)}
            height={h}
            fill="#0f6e62"
            opacity={day.completed ? 0.85 : 0.15}
          >
            <title>{`${formatDate(day.date)}: ${day.completed} completed, ${day.hqApproved} HQ approved, ${day.rejected} rejected`}</title>
          </rect>
        );
      })}
      <path d={line} fill="none" stroke="#b7791f" strokeWidth="1.6" />
      {ticks.map((index) => (
        <text key={days[index].date} x={pad.l + index * step} y={height - 8} fill="#6b645b" fontSize="11">
          {formatDate(days[index].date).replace(/ 2026/, "")}
        </text>
      ))}
      <text x={pad.l} y="12" fill="#6b645b" fontSize="11">
        Teal bars are interviewer completions. The gold line is headquarters approvals.
      </text>
    </svg>
  );
}
