"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Target,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Plus,
  Pencil,
  Trash2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { api, type Summary } from "@/lib/api";
import { useSSE } from "@/hooks/useSSE";
import StatCard from "@/components/StatCard";
import { StatCardSkeleton } from "@/components/Skeleton";
import StatusPill from "@/components/StatusPill";
import Avatar from "@/components/Avatar";
import ProgressTimeline from "@/components/ProgressTimeline";
import { compactNumber, pct, relativeTime } from "@/lib/format";
import { accentColor } from "@/lib/avatar";

type FeedEvent = { id: number; name: string; data: any; at: string };

function progressColor(p: number) {
  if (p >= 70) return "#10b981";
  if (p >= 40) return "#6366f1";
  if (p >= 20) return "#f59e0b";
  return "#f43f5e";
}

function eventVisual(name: string) {
  if (name.startsWith("check_in"))      return { Icon: Activity, color: "text-indigo-300",  bg: "bg-indigo-500/15", label: "Check-in" };
  if (name === "objective.created")     return { Icon: Plus,     color: "text-emerald-300", bg: "bg-emerald-500/15", label: "Created" };
  if (name === "objective.updated")     return { Icon: Pencil,   color: "text-sky-300",     bg: "bg-sky-500/15",    label: "Updated" };
  if (name === "objective.deleted")     return { Icon: Trash2,   color: "text-rose-300",    bg: "bg-rose-500/15",   label: "Deleted" };
  if (name === "key_result.created")    return { Icon: Target,   color: "text-violet-300",  bg: "bg-violet-500/15", label: "New KR" };
  return { Icon: Activity, color: "text-ink-2", bg: "bg-bg-3", label: name };
}

export default function DashboardPage() {
  const qc = useQueryClient();
  const [feed, setFeed] = useState<FeedEvent[]>([]);
  const [prevAvg, setPrevAvg] = useState<number | null>(null);
  const [currentAvg, setCurrentAvg] = useState<number | null>(null);

  const summary = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: api.dashboardSummary,
    refetchInterval: 30_000,
  });
  const audit = useQuery({ queryKey: ["audit"], queryFn: api.listAudit, refetchInterval: 30_000 });

  useSSE((name, data) => {
    if (name === "connected") return;
    setFeed((prev) =>
      [{ id: Date.now() + Math.random(), name, data, at: new Date().toISOString() }, ...prev].slice(0, 10),
    );
    qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
    qc.invalidateQueries({ queryKey: ["objectives"] });
    qc.invalidateQueries({ queryKey: ["audit"] });
  });

  useEffect(() => {
    if (summary.data?.avgProgress == null) return;
    const next = Number(summary.data.avgProgress);
    setCurrentAvg((cur) => {
      if (cur !== null && cur !== next) setPrevAvg(cur);
      return next;
    });
  }, [summary.data?.avgProgress]);

  const s: Summary | undefined = summary.data;
  const delta = currentAvg !== null && prevAvg !== null ? currentAvg - prevAvg : null;
  const avgPct = s ? Number(s.avgProgress) : 0;

  const chartData =
    s?.objectives.map((o) => ({
      id: o.id,
      name: o.title.length > 22 ? o.title.slice(0, 20) + "…" : o.title,
      progress: Number(o.progress),
    })) || [];

  const statusData = s
    ? (() => {
        const completed = s.completed;
        const atRisk = s.atRisk;
        const onTrack = Math.max(0, s.active - s.atRisk);
        return [
          { name: "On track",  value: onTrack,  color: "#10b981" },
          { name: "At risk",   value: atRisk,   color: "#f59e0b" },
          { name: "Completed", value: completed, color: "#6366f1" },
        ].filter((d) => d.value > 0);
      })()
    : [];

  return (
    <div className="space-y-7">
      <section className="card-padded relative overflow-hidden">
        <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-70"
             style={{ background: "radial-gradient(closest-side, rgba(168,85,247,0.35), transparent 70%)" }} />
        <div className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-60"
             style={{ background: "radial-gradient(closest-side, rgba(99,102,241,0.35), transparent 70%)" }} />

        <div className="relative flex items-start justify-between gap-6 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[11px] text-ink-3 uppercase tracking-[0.14em] font-semibold mb-2.5">
              <span className="live-dot" /> Live workspace · Acme Robotics
            </div>
            <h1 className="text-[34px] sm:text-[40px] font-semibold tracking-tightish leading-[1.05] text-gradient">
              Q2 momentum at a glance.
            </h1>
            <p className="text-sm text-ink-2 mt-3 max-w-xl leading-relaxed">
              Real-time OKR rollups computed from key-result check-ins. Every mutation is{" "}
              <span className="text-ink-1">tenant-isolated</span> by Postgres RLS, audited,
              and streamed to this view via Server-Sent Events.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <Link href="/objectives" className="btn-primary">
                <Plus className="w-4 h-4" /> New objective
              </Link>
              <Link href="/audit" className="btn-outline">
                <Activity className="w-4 h-4" /> View audit log
              </Link>
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-center gap-2">
            <div className="text-[11px] uppercase tracking-[0.12em] text-ink-3 font-semibold">Avg progress</div>
            <div className="relative">
              <div className="absolute inset-0 rounded-full blur-2xl opacity-50"
                   style={{ background: `radial-gradient(closest-side, ${progressColor(avgPct)}55, transparent 70%)` }} />
              <div className="relative w-[148px] h-[148px] grid place-items-center">
                <svg width={148} height={148} className="-rotate-90 overflow-visible">
                  <defs>
                    <linearGradient id="heroRing" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={progressColor(avgPct)} stopOpacity={1} />
                      <stop offset="100%" stopColor={progressColor(avgPct)} stopOpacity={0.45} />
                    </linearGradient>
                  </defs>
                  <circle cx={74} cy={74} r={64} stroke="var(--bg-3)" strokeWidth={10} fill="none" />
                  <circle
                    cx={74} cy={74} r={64}
                    stroke="url(#heroRing)"
                    strokeWidth={10}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 64}
                    strokeDashoffset={2 * Math.PI * 64 - (Math.min(100, avgPct) / 100) * 2 * Math.PI * 64}
                    style={{ transition: "stroke-dashoffset 800ms cubic-bezier(.2,.7,.2,1)" }}
                  />
                </svg>
                <div className="absolute inset-0 grid place-items-center">
                  <div className="text-center leading-none">
                    <div className="text-[32px] font-semibold tabular text-gradient-brand">
                      {avgPct.toFixed(1)}<span className="text-ink-3 text-lg ml-0.5">%</span>
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-ink-3 mt-1">
                      {s?.totalObjectives ?? 0} objectives
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {delta != null && delta !== 0 && (
              <div className={`text-[11px] tabular font-medium ${delta >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(2)}% since last sync
              </div>
            )}
          </div>
        </div>
      </section>

      {summary.error && (
        <div className="card border-rose-500/40">
          <div className="text-sm text-rose-300">
            Could not reach the backend. Is <code className="kbd">./mvnw spring-boot:run</code> running on :8080?
          </div>
        </div>
      )}

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summary.isLoading ? (
          <>
            <StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton />
          </>
        ) : s ? (
          <>
            <StatCard
              label="Objectives"
              numericValue={s.totalObjectives}
              sub={`${s.active} active`}
              icon={Target}
              accent="indigo"
            />
            <StatCard
              label="Avg progress"
              numericValue={Number(s.avgProgress)}
              decimals={1}
              suffix="%"
              sub="across all OKRs"
              icon={TrendingUp}
              accent="sky"
              delta={delta}
            />
            <StatCard
              label="Completed"
              numericValue={s.completed}
              sub="this quarter"
              icon={CheckCircle2}
              accent="emerald"
            />
            <StatCard
              label="At risk"
              numericValue={s.atRisk}
              sub="below 30% progress"
              icon={AlertTriangle}
              accent={s.atRisk > 0 ? "amber" : "indigo"}
            />
          </>
        ) : null}
      </section>

      <section className="grid lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2 hover-lift">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-ink-1">Progress by objective</h2>
              <p className="text-xs text-ink-3 mt-0.5">Rollup from key-result check-ins</p>
            </div>
            <span className="text-xs text-ink-3">{chartData.length} objectives</span>
          </div>
          <div className="h-72">
            {chartData.length === 0 ? (
              <EmptyState icon={Target} title="No objectives yet" hint="Create one to see progress." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 12, right: 12, left: -8, bottom: 24 }}>
                  <defs>
                    {chartData.map((d) => {
                      const c = accentColor(d.id);
                      return (
                        <linearGradient key={d.id} id={`bar-${d.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={c} stopOpacity={1} />
                          <stop offset="100%" stopColor={c} stopOpacity={0.55} />
                        </linearGradient>
                      );
                    })}
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="var(--text-3)"
                    tick={{ fontSize: 11, fill: "var(--text-3)" }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={50}
                    tickLine={false}
                    axisLine={{ stroke: "var(--border)" }}
                  />
                  <YAxis
                    stroke="var(--text-3)"
                    tick={{ fontSize: 11, fill: "var(--text-3)" }}
                    domain={[0, 100]}
                    unit="%"
                    tickLine={false}
                    axisLine={{ stroke: "var(--border)" }}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(99,102,241,0.07)" }}
                    contentStyle={{
                      background: "var(--bg-1)",
                      border: "1px solid var(--border-strong)",
                      borderRadius: 10,
                      color: "var(--text-1)",
                      fontSize: 12,
                      boxShadow: "var(--shadow-lg)",
                    }}
                    formatter={(v: number) => [`${v.toFixed(1)}%`, "progress"]}
                  />
                  <Bar dataKey="progress" radius={[8, 8, 0, 0]} maxBarSize={48}>
                    {chartData.map((d) => <Cell key={d.id} fill={`url(#bar-${d.id})`} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card hover-lift">
          <h2 className="text-sm font-semibold text-ink-1">Status mix</h2>
          <p className="text-xs text-ink-3 mt-0.5 mb-3">By objective health</p>
          <div className="h-52 relative">
            {statusData.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="No data yet" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      stroke="var(--bg-1)"
                      strokeWidth={2}
                    >
                      {statusData.map((d) => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--bg-1)",
                        border: "1px solid var(--border-strong)",
                        borderRadius: 10,
                        color: "var(--text-1)",
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 grid place-items-center pointer-events-none">
                  <div className="text-center">
                    <div className="text-2xl font-semibold tabular leading-none">{s?.totalObjectives ?? 0}</div>
                    <div className="text-[10px] uppercase tracking-wider text-ink-3 mt-1">total</div>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="mt-3 space-y-1.5">
            {statusData.map((d) => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: d.color }} />
                <span className="text-ink-2 flex-1">{d.name}</span>
                <span className="tabular text-ink-1 font-medium">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ProgressTimeline />

      <section className="grid lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-ink-1">Objective progress</h2>
            <Link href="/objectives" className="text-xs text-brand-300 hover:underline">
              View all →
            </Link>
          </div>
          <ul className="divide-y divide-line">
            {s?.objectives.map((o) => {
              const c = accentColor(o.id);
              const p = Math.min(100, Number(o.progress));
              return (
                <li key={o.id} className="py-3.5 flex items-center gap-4">
                  <span className="w-1 h-9 rounded-full shrink-0" style={{ background: `linear-gradient(180deg, ${c}, ${c}55)` }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <StatusPill status={o.status} />
                      <span className="text-[10px] text-ink-3 uppercase tracking-wider">{o.quarter}</span>
                    </div>
                    <div className="text-sm text-ink-1 truncate">{o.title}</div>
                  </div>
                  <div className="flex items-center gap-3 min-w-[220px]">
                    <div className="flex-1 h-2 bg-bg-3 rounded-full overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all duration-700"
                        style={{
                          width: `${p}%`,
                          background: `linear-gradient(90deg, ${c}, ${c}88)`,
                          boxShadow: `0 0 12px ${c}55`,
                        }}
                      />
                    </div>
                    <span className="tabular text-sm text-ink-1 font-medium w-12 text-right">
                      {Math.round(p)}%
                    </span>
                  </div>
                </li>
              );
            })}
            {s?.objectives.length === 0 && (
              <li className="py-10">
                <EmptyState icon={Sparkles} title="No objectives yet" hint="Head to Objectives to create your first OKR." />
              </li>
            )}
          </ul>
        </div>

        <div className="card flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-ink-1">Live activity</h2>
            <span className="text-[10px] text-ink-3 uppercase tracking-wider flex items-center gap-1.5">
              <span className="live-dot" /> SSE
            </span>
          </div>
          <ul className="space-y-2 flex-1 min-h-[200px]">
            {feed.length === 0 && (audit.data?.length ?? 0) === 0 && (
              <li className="text-xs text-ink-3 italic mt-4">
                Waiting for events. Submit a check-in on the Objectives page.
              </li>
            )}
            {feed.map((e) => {
              const v = eventVisual(e.name);
              const Icon = v.Icon;
              return (
                <li key={e.id} className="surface-2 px-3 py-2.5 fade-up flex items-start gap-2.5">
                  <div className={`w-7 h-7 rounded-md grid place-items-center ${v.bg} ${v.color} shrink-0`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-ink-1">
                      {v.label}
                      {e.data?.previousValue != null && e.data?.newValue != null && (
                        <span className="text-ink-3 ml-1.5 tabular">
                          {compactNumber(Number(e.data.previousValue))} → {compactNumber(Number(e.data.newValue))}
                        </span>
                      )}
                    </div>
                    {e.data?.objectiveProgress != null && (
                      <div className="text-[11px] text-ink-3 mt-0.5">
                        objective now {Number(e.data.objectiveProgress).toFixed(1)}%
                      </div>
                    )}
                    <div className="text-[10px] text-ink-3 mt-0.5 flex items-center gap-1">
                      <span className="live-dot" /> live · just now
                    </div>
                  </div>
                </li>
              );
            })}
            {audit.data?.slice(0, 6).map((a) => {
              const v = eventVisual(a.action);
              return (
                <li key={a.id} className="px-3 py-2.5 flex items-start gap-2.5">
                  <Avatar id={a.actor_id} name={a.actor_id.replace(/^user_/, "")} size="xs" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-ink-2">
                      <span className="text-ink-1 font-medium">{a.actor_id.replace(/^user_/, "")}</span>
                      <span className="text-ink-3 mx-1">·</span>
                      <code className="text-[11px] text-ink-2">{a.action}</code>
                    </div>
                    <div className="text-[10px] text-ink-3 mt-0.5">{relativeTime(a.created_at)}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </div>
  );
}

function EmptyState({ icon: Icon, title, hint }: { icon: any; title: string; hint?: string }) {
  return (
    <div className="h-full grid place-items-center text-center px-6">
      <div>
        <div className="mx-auto w-12 h-12 grid place-items-center rounded-xl bg-bg-2 ring-1 ring-line text-ink-3 mb-2">
          <Icon className="w-5 h-5" />
        </div>
        <div className="text-sm text-ink-1">{title}</div>
        {hint && <div className="text-xs text-ink-3 mt-1">{hint}</div>}
      </div>
    </div>
  );
}
