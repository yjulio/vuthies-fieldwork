export function MatBand({ id, className }: { id: string; className?: string }) {
  const teeth = [0, 12, 24, 36, 48, 60, 72];
  return (
    <svg className={className} aria-hidden="true">
      <defs>
        <pattern id={id} width="84" height="44" patternUnits="userSpaceOnUse">
          <rect width="84" height="44" fill="#102824" />
          {teeth.map((x, index) => (
            <polygon
              key={`top-${x}`}
              points={`${x},0 ${x + 6},8 ${x + 12},0`}
              fill={index % 2 ? "#b8432f" : "#f4e7cc"}
            />
          ))}
          {teeth.map((x, index) => (
            <polygon
              key={`bottom-${x}`}
              points={`${x},44 ${x + 6},36 ${x + 12},44`}
              fill={index % 2 ? "#f4e7cc" : "#b8432f"}
            />
          ))}
          <Diamond cx={14} cy={22} fill="#f4e7cc" inner="#b8432f" />
          <Diamond cx={42} cy={22} fill="#1a1612" inner="#e2b15a" />
          <Diamond cx={70} cy={22} fill="#b8432f" inner="#f4e7cc" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

export function SandMark({ className }: { className?: string }) {
  const dots = [20, 36, 52, 68];
  return (
    <svg viewBox="0 0 88 88" className={className} aria-hidden="true">
      <rect width="88" height="88" rx="12" fill="#d9c4a0" />
      <rect x="1.25" y="1.25" width="85.5" height="85.5" rx="11" fill="none" stroke="#6a432c" strokeWidth="1.5" />
      {dots.map((y) =>
        dots.map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.35" fill="#3b2a1c" />),
      )}
      <path
        d="M44 12 Q74 12 74 44 Q74 76 44 76 Q14 76 14 44 Q14 22 44 22 Q64 22 64 44 Q64 64 44 64 Q24 64 24 44 Q24 32 44 32 Q56 32 56 44 Q56 56 44 56"
        fill="none"
        stroke="#24180f"
        strokeWidth="2.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Diamond({
  cx,
  cy,
  fill,
  inner,
}: {
  cx: number;
  cy: number;
  fill: string;
  inner: string;
}) {
  const outer = `${cx},${cy - 9} ${cx + 10},${cy} ${cx},${cy + 9} ${cx - 10},${cy}`;
  const hole = `${cx},${cy - 4.2} ${cx + 4.6},${cy} ${cx},${cy + 4.2} ${cx - 4.6},${cy}`;
  return (
    <g>
      <polygon points={outer} fill={fill} stroke="#f4e7cc" strokeWidth="0.7" />
      <polygon points={hole} fill={inner} />
    </g>
  );
}
