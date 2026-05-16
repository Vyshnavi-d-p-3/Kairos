"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { api, type AuditEntry } from "@/lib/api";

// Rough daily activity from audit_log timestamps (demo).
export default function ProgressTimeline() {
  const audit = useQuery({ queryKey: ["audit"], queryFn: api.listAudit });

  const data = (() => {
    const days = 30;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const buckets = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      buckets.set(d.toISOString().slice(0, 10), 0);
    }
    (audit.data || []).forEach((e: AuditEntry) => {
      if (!e.action?.startsWith("check_in")) return;
      const day = (e.created_at || "").slice(0, 10);
      if (buckets.has(day)) buckets.set(day, (buckets.get(day) ?? 0) + 1);
    });

    let cum = 0;
    return Array.from(buckets.entries()).map(([day, count]) => {
      cum += count;
      const d = new Date(day + "T00:00:00Z");
      return {
        day,
        label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        checkins: count,
        cumulative: cum,
      };
    });
  })();

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-ink-1">Check-in velocity</h2>
          <p className="text-xs text-ink-3 mt-0.5">Daily volume — last 30 days</p>
        </div>
        <div className="text-[11px] text-ink-3 tabular flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm bg-indigo-400" /> per day
          <span className="w-2 h-2 rounded-sm bg-emerald-400 ml-2" /> cumulative
        </div>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="ttCheckins" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a5b4fc" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="ttCum" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="var(--text-3)"
              tick={{ fontSize: 10, fill: "var(--text-3)" }}
              interval="preserveStartEnd"
              minTickGap={28}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
            />
            <YAxis
              stroke="var(--text-3)"
              tick={{ fontSize: 10, fill: "var(--text-3)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: "var(--bg-1)",
                border: "1px solid var(--border-strong)",
                borderRadius: 10,
                color: "var(--text-1)",
                fontSize: 12,
                boxShadow: "var(--shadow-lg)",
              }}
              labelStyle={{ color: "var(--text-2)", marginBottom: 4 }}
            />
            <Area
              type="monotone"
              dataKey="cumulative"
              stroke="#10b981"
              strokeWidth={1.5}
              fill="url(#ttCum)"
            />
            <Area
              type="monotone"
              dataKey="checkins"
              stroke="#a5b4fc"
              strokeWidth={2}
              fill="url(#ttCheckins)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
