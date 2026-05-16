// Lightweight SVG sparkline.

function smooth(points: Array<readonly [number, number]>): string {
  if (points.length < 2) return "";
  const d: string[] = [`M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d.push(`C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`);
  }
  return d.join(" ");
}

export default function Sparkline({
  values,
  width = 110,
  height = 32,
  color = "#a5b4fc",
  fill,
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: string;
}) {
  if (!values || values.length === 0) {
    return <div className="text-[10px] text-ink-3 italic">no history</div>;
  }
  if (values.length === 1) values = [values[0], values[0]];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);
  const pts = values.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / span) * (height - 4) - 2;
    return [x, y] as const;
  });
  const line = smooth(pts);
  const last = pts[pts.length - 1];

  // gradient id unique per render call
  const gid = `spark-${Math.random().toString(36).slice(2, 8)}`;
  const fillFinal = fill ?? color;

  return (
    <svg width={width} height={height} aria-hidden="true" className="overflow-visible">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillFinal} stopOpacity={0.35} />
          <stop offset="100%" stopColor={fillFinal} stopOpacity={0} />
        </linearGradient>
      </defs>
      {/* filled area under the curve */}
      <path d={`${line} L ${width} ${height} L 0 ${height} Z`} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={2.6} fill={color} />
      <circle cx={last[0]} cy={last[1]} r={5.5} fill={color} opacity={0.18} />
    </svg>
  );
}
