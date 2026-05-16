"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Search,
  Activity,
  Plus,
  Pencil,
  Trash2,
  Target,
  Filter,
} from "lucide-react";
import clsx from "clsx";
import { api, type AuditEntry } from "@/lib/api";
import { useSSE } from "@/hooks/useSSE";
import Avatar from "@/components/Avatar";
import { Skeleton } from "@/components/Skeleton";
import { relativeTime } from "@/lib/format";

function actionVisual(action: string) {
  if (action.startsWith("check_in"))    return { Icon: Activity, color: "text-brand-300", bg: "bg-indigo-500/15" };
  if (action.endsWith(".created"))      return { Icon: Plus,     color: "text-emerald-300", bg: "bg-emerald-500/15" };
  if (action.endsWith(".updated"))      return { Icon: Pencil,   color: "text-sky-300",   bg: "bg-sky-500/15" };
  if (action.endsWith(".deleted"))      return { Icon: Trash2,   color: "text-rose-300",  bg: "bg-rose-500/15" };
  return { Icon: Target, color: "text-ink-2", bg: "bg-bg-3" };
}

function safeParse(v: unknown): Record<string, any> | null {
  if (v == null) return null;
  if (typeof v === "object") return v as any;
  try { return JSON.parse(String(v)); } catch { return null; }
}

function Diff({ before, after }: { before: unknown; after: unknown }) {
  const b = safeParse(before);
  const a = safeParse(after);
  const keys = Array.from(new Set([...(b ? Object.keys(b) : []), ...(a ? Object.keys(a) : [])]));
  if (keys.length === 0) return null;
  return (
    <div className="grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-1 text-[11px] font-mono">
      <div className="text-[9px] uppercase tracking-wider text-ink-3 col-span-3 mb-1">
        before → after
      </div>
      {keys.map((k) => {
        const bv = b?.[k];
        const av = a?.[k];
        const changed = JSON.stringify(bv) !== JSON.stringify(av);
        return (
          <div key={k} className="contents">
            <div className="text-ink-3">{k}</div>
            <div className={clsx("truncate", changed ? "text-rose-300 line-through" : "text-ink-3")}>
              {bv === undefined ? "—" : String(bv)}
            </div>
            <div className={clsx("truncate", changed ? "text-emerald-300" : "text-ink-3")}>
              {av === undefined ? "—" : String(av)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AuditPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("");
  const [entityType, setEntityType] = useState("all");

  const entries = useQuery({
    queryKey: ["audit"],
    queryFn: api.listAudit,
    refetchInterval: 30_000,
  });

  useSSE((name) => {
    if (name === "check_in.created" || name.startsWith("objective.") || name.startsWith("key_result.")) {
      qc.invalidateQueries({ queryKey: ["audit"] });
    }
  });

  const filtered = useMemo(() => {
    return (entries.data || []).filter((e: AuditEntry) => {
      const matchesFilter = filter
        ? e.action.includes(filter) || e.entity_type.includes(filter) || e.actor_id.includes(filter)
        : true;
      const matchesEntity = entityType === "all" ? true : e.entity_type === entityType;
      return matchesFilter && matchesEntity;
    });
  }, [entries.data, filter, entityType]);

  const entityTypes = Array.from(
    new Set((entries.data || []).map((e) => e.entity_type)),
  );

  return (
    <div className="space-y-7">
      <header>
        <div className="text-[11px] uppercase tracking-[0.14em] text-ink-3 font-semibold mb-2">
          Compliance · Postgres
        </div>
        <h1 className="text-[32px] font-semibold tracking-tightish leading-none text-gradient">
          Audit log
        </h1>
        <p className="text-sm text-ink-2 mt-3 max-w-2xl leading-relaxed">
          Immutable, monthly-partitioned, insert-only. Every mutation captured with before/after JSONB —
          the same source we would hand to SOC 2 reviewers.
        </p>
      </header>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-3" />
          <input
            className="input pl-8"
            placeholder="filter by action / entity / actor…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-ink-3" />
          {[{ id: "all", label: "All" }, ...entityTypes.map((t) => ({ id: t, label: t }))].map((t) => (
            <button
              key={t.id}
              onClick={() => setEntityType(t.id)}
              className={clsx(
                "px-2.5 py-1.5 rounded-full text-xs border transition-all",
                entityType === t.id
                  ? "bg-brand-600/25 border-brand-500/60 text-white shadow-glow"
                  : "border-line bg-bg-2 text-ink-2 hover:text-ink-1 hover:border-line-strong",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {entries.isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card"><Skeleton className="h-12" /></div>
          ))}
        </div>
      )}

      <ol className="relative space-y-3 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-line">
        {filtered.map((e) => {
          const v = actionVisual(e.action);
          const Icon = v.Icon;
          return (
            <li key={e.id} className="relative pl-12">
              <div
                className={clsx(
                  "absolute left-2 top-3 w-7 h-7 rounded-md grid place-items-center ring-4 ring-bg-0",
                  v.bg,
                  v.color,
                )}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="card">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Avatar id={e.actor_id} name={e.actor_id.replace(/^user_/, "")} size="xs" />
                    <span className="text-ink-1 font-medium truncate">
                      {e.actor_id.replace(/^user_/, "")}
                    </span>
                    <code className="text-[11px] text-ink-2">{e.action}</code>
                    <span className="text-ink-3">·</span>
                    <span className="text-ink-3 truncate">{e.entity_type}</span>
                  </div>
                  <div className="text-ink-3 shrink-0">{relativeTime(e.created_at)}</div>
                </div>
                <div className="mt-3">
                  <Diff before={e.before_state} after={e.after_state} />
                </div>
              </div>
            </li>
          );
        })}
        {!entries.isLoading && filtered.length === 0 && (
          <li className="card text-center py-10 text-sm text-ink-3 italic">No matching entries.</li>
        )}
      </ol>
    </div>
  );
}
