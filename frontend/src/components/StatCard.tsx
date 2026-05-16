import clsx from "clsx";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import CountUp from "./CountUp";

type Accent = "indigo" | "emerald" | "amber" | "rose" | "sky" | "violet" | "teal";

const accentMap: Record<Accent, { from: string; to: string; text: string; ring: string; glow: string }> = {
  indigo:  { from: "from-indigo-500/30",  to: "to-indigo-500/0",  text: "text-indigo-300",  ring: "ring-indigo-500/40",  glow: "rgba(99,102,241,0.25)" },
  emerald: { from: "from-emerald-500/30", to: "to-emerald-500/0", text: "text-emerald-300", ring: "ring-emerald-500/40", glow: "rgba(16,185,129,0.22)" },
  amber:   { from: "from-amber-500/30",   to: "to-amber-500/0",   text: "text-amber-300",   ring: "ring-amber-500/40",   glow: "rgba(245,158,11,0.22)" },
  rose:    { from: "from-rose-500/30",    to: "to-rose-500/0",    text: "text-rose-300",    ring: "ring-rose-500/40",    glow: "rgba(244,63,94,0.22)" },
  sky:     { from: "from-sky-500/30",     to: "to-sky-500/0",     text: "text-sky-300",     ring: "ring-sky-500/40",     glow: "rgba(56,189,248,0.22)" },
  violet:  { from: "from-violet-500/30",  to: "to-violet-500/0",  text: "text-violet-300",  ring: "ring-violet-500/40",  glow: "rgba(168,85,247,0.22)" },
  teal:    { from: "from-teal-500/30",    to: "to-teal-500/0",    text: "text-teal-300",    ring: "ring-teal-500/40",    glow: "rgba(20,184,166,0.22)" },
};

export default function StatCard({
  label,
  value,
  numericValue,
  decimals = 0,
  suffix,
  prefix,
  sub,
  icon: Icon,
  accent = "indigo",
  delta,
  children,
}: {
  label: string;
  value?: ReactNode;
  numericValue?: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  sub?: string;
  icon?: LucideIcon;
  accent?: Accent;
  delta?: number | null;
  children?: ReactNode;
}) {
  const a = accentMap[accent];
  const positive = (delta ?? 0) >= 0;

  return (
    <div className="card hover-lift relative overflow-hidden">
      {/* radial glow */}
      <div
        className="absolute -top-16 -right-16 w-44 h-44 rounded-full blur-3xl pointer-events-none"
        style={{ background: `radial-gradient(closest-side, ${a.glow}, transparent 70%)` }}
      />
      {/* bottom-left subtle counter-glow */}
      <div
        className="absolute -bottom-20 -left-12 w-40 h-40 rounded-full blur-3xl pointer-events-none opacity-60"
        style={{ background: `radial-gradient(closest-side, ${a.glow}, transparent 70%)` }}
      />

      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="text-[10.5px] uppercase tracking-[0.1em] font-semibold text-ink-3">{label}</div>
          {Icon && (
            <div className={clsx("w-9 h-9 rounded-xl grid place-items-center bg-bg-2 ring-1 backdrop-blur-sm", a.ring, a.text)}>
              <Icon className="w-4 h-4" strokeWidth={2.25} />
            </div>
          )}
        </div>
        <div className="mt-3.5 flex items-baseline gap-2">
          <div className="text-[34px] font-semibold tracking-tightish leading-none">
            {numericValue != null ? (
              <CountUp value={numericValue} decimals={decimals} prefix={prefix} suffix={suffix} />
            ) : (
              value
            )}
          </div>
          {delta != null && delta !== 0 && (
            <span
              className={clsx(
                "inline-flex items-center gap-0.5 text-[11px] font-medium tabular px-1.5 py-0.5 rounded-md",
                positive
                  ? "text-emerald-300 bg-emerald-500/10 ring-1 ring-emerald-500/30"
                  : "text-rose-300 bg-rose-500/10 ring-1 ring-rose-500/30",
              )}
            >
              {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(delta).toFixed(1)}
            </span>
          )}
        </div>
        {sub && <div className="mt-1.5 text-xs text-ink-3">{sub}</div>}
        {children && <div className="mt-3">{children}</div>}
      </div>
    </div>
  );
}
