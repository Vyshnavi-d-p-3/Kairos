export default function ProgressRing({
  value,
  size = 56,
  stroke = 6,
  label,
  color,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  color?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (v / 100) * c;
  const autoColor =
    v >= 70 ? "#10b981" : v >= 40 ? "#6366f1" : v >= 20 ? "#f59e0b" : "#f43f5e";
  const stroke1 = color ?? autoColor;

  // Lighten the stop a touch by overlaying onto white-ish; keeps a one-off lookup simple.
  const gid = `ring-${stroke1.replace("#", "")}-${size}`;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 overflow-visible">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={stroke1} stopOpacity={0.95} />
            <stop offset="100%" stopColor={stroke1} stopOpacity={0.55} />
          </linearGradient>
          <filter id={`${gid}-glow`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--bg-3)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={`url(#${gid})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          filter={v > 0 ? `url(#${gid}-glow)` : undefined}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(.2,.7,.2,1), stroke 200ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <div className="text-xs font-semibold tabular">
          {Math.round(v)}
          <span className="text-ink-3 text-[10px] ml-0.5">%</span>
        </div>
        {label && <div className="text-[8px] uppercase tracking-wider text-ink-3 mt-0.5">{label}</div>}
      </div>
    </div>
  );
}
