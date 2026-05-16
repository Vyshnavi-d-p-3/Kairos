"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Plus,
  Target,
  Trash2,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import clsx from "clsx";
import { api, type KeyResult, type Objective } from "@/lib/api";
import { useSSE } from "@/hooks/useSSE";
import CheckInForm from "@/components/CheckInForm";
import StatusPill from "@/components/StatusPill";
import ProgressRing from "@/components/ProgressRing";
import Avatar from "@/components/Avatar";
import Sparkline from "@/components/Sparkline";
import { ObjectiveCardSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { compactNumber } from "@/lib/format";
import { accentColor } from "@/lib/avatar";

function KrSparkline({ kr, color }: { kr: KeyResult; color?: string }) {
  // KR history for sparkline
  const q = useQuery({
    queryKey: ["check-ins", kr.id],
    queryFn: () => api.listCheckIns(kr.id),
  });
  const values =
    q.data && q.data.length > 0
      ? [...q.data].reverse().map((c) => Number(c.newValue))
      : [Number(kr.currentValue ?? 0)];
  if (kr.startValue != null && values.length >= 1 && values[0] !== Number(kr.startValue)) {
    values.unshift(Number(kr.startValue));
  }
  return <Sparkline values={values} color={color} />;
}

function KeyResultRow({ kr, accent }: { kr: KeyResult; accent: string }) {
  const progress = Number(kr.progress);
  const [openCheckIn, setOpenCheckIn] = useState(false);
  return (
    <div className="surface-2 p-3.5 hover:bg-bg-3 transition group">
      <div className="flex items-start gap-3">
        <ProgressRing value={progress} size={48} stroke={5} color={accent} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm text-ink-1 leading-snug">{kr.title}</div>
              <div className="text-[11px] text-ink-3 mt-1 tabular">
                <span className="text-ink-1 font-medium">
                  {compactNumber(Number(kr.currentValue), { unit: kr.unit })}
                </span>
                <span className="mx-1.5 text-ink-3">→</span>
                {compactNumber(Number(kr.targetValue), { unit: kr.unit })}
                <span className="mx-1.5 text-ink-3">·</span>
                confidence <span className="text-ink-2">{Number(kr.confidence).toFixed(2)}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden sm:block opacity-95">
                <KrSparkline kr={kr} color={accent} />
              </div>
              <StatusPill status={kr.status} />
            </div>
          </div>
          {!openCheckIn ? (
            <button
              className="btn-ghost btn-xs mt-2 opacity-0 group-hover:opacity-100 transition"
              onClick={() => setOpenCheckIn(true)}
            >
              <Sparkles className="w-3 h-3" />
              Check in
            </button>
          ) : (
            <CheckInForm kr={kr} onClose={() => setOpenCheckIn(false)} />
          )}
        </div>
      </div>
    </div>
  );
}

function ObjectiveCard({ o }: { o: Objective }) {
  const qc = useQueryClient();
  const toast = useToast();
  const accent = accentColor(o.id);
  const [expanded, setExpanded] = useState(true);
  const [showAddKr, setShowAddKr] = useState(false);
  const [krTitle, setKrTitle] = useState("");
  const [target, setTarget] = useState("100");
  const [start, setStart] = useState("0");
  const [unit, setUnit] = useState("%");
  const [metric, setMetric] = useState("percentage");

  const addKr = useMutation({
    mutationFn: () =>
      api.addKeyResult(o.id, {
        title: krTitle,
        targetValue: parseFloat(target),
        startValue: parseFloat(start),
        unit: unit || undefined,
        metricType: metric,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["objectives"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast.show({ tone: "success", title: "Key result added" });
      setShowAddKr(false);
      setKrTitle("");
    },
    onError: (e: any) => toast.show({ tone: "error", title: "Failed", description: e?.message }),
  });

  const remove = useMutation({
    mutationFn: () => api.deleteObjective(o.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["objectives"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast.show({ tone: "info", title: "Objective deleted" });
    },
    onError: (e: any) => toast.show({ tone: "error", title: "Delete failed", description: e?.message }),
  });

  return (
    <article
      className="card hover-lift space-y-4 relative overflow-hidden"
      style={{ ["--accent" as any]: accent }}
    >
      {/* gradient accent bar at the top */}
      <div
        className="absolute top-0 inset-x-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, ${accent}, ${accent}33 60%, transparent)` }}
      />
      {/* corner aura */}
      <div
        className="absolute -top-16 -right-16 w-40 h-40 rounded-full blur-3xl pointer-events-none opacity-40"
        style={{ background: `radial-gradient(closest-side, ${accent}55, transparent 70%)` }}
      />

      <header className="relative flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-1 text-ink-3 hover:text-ink-1 transition-colors"
            aria-label="toggle"
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-[16px] font-semibold text-ink-1 tracking-tightish">{o.title}</h3>
              <StatusPill status={o.status} />
              <span className="text-[10px] text-ink-3 uppercase tracking-[0.1em]">{o.quarter}</span>
            </div>
            {o.description && <p className="mt-1.5 text-sm text-ink-2 leading-relaxed">{o.description}</p>}
            <div className="mt-2.5 flex items-center gap-2 text-xs text-ink-3">
              <Avatar id={o.ownerId} size="xs" />
              <span className="text-ink-2">{o.ownerId.replace(/^user_/, "")}</span>
              <span>·</span>
              <span>
                {o.keyResults.length} {o.keyResults.length === 1 ? "key result" : "key results"}
              </span>
            </div>
          </div>
        </div>
        <ProgressRing value={Number(o.progress)} size={72} stroke={7} color={accent} />
      </header>

      {expanded && (
        <>
          <div className="space-y-2">
            {o.keyResults.length === 0 && (
              <div className="text-xs text-ink-3 italic text-center py-4 surface-2">
                No key results yet. Add one to start tracking.
              </div>
            )}
            {o.keyResults.map((kr) => <KeyResultRow key={kr.id} kr={kr} accent={accent} />)}
          </div>

          {!showAddKr ? (
            <div className="flex items-center justify-between">
              <button className="btn-ghost btn-xs" onClick={() => setShowAddKr(true)}>
                <Plus className="w-3 h-3" /> Add key result
              </button>
              <button
                className="btn-ghost btn-xs text-rose-300 hover:text-rose-200 hover:bg-rose-500/10"
                onClick={() => {
                  if (confirm(`Delete "${o.title}"?`)) remove.mutate();
                }}
                disabled={remove.isPending}
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          ) : (
            <form
              className="surface-2 p-3.5 space-y-3 fade-up"
              onSubmit={(e) => {
                e.preventDefault();
                addKr.mutate();
              }}
            >
              <div>
                <label className="label">Title</label>
                <input
                  className="input"
                  value={krTitle}
                  onChange={(e) => setKrTitle(e.target.value)}
                  required
                  autoFocus
                  placeholder="e.g. Reduce p95 latency to 250ms"
                />
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="label">Start</label>
                  <input className="input" type="number" step="any" value={start} onChange={(e) => setStart(e.target.value)} />
                </div>
                <div>
                  <label className="label">Target</label>
                  <input className="input" type="number" step="any" value={target} onChange={(e) => setTarget(e.target.value)} required />
                </div>
                <div>
                  <label className="label">Unit</label>
                  <input className="input" value={unit} onChange={(e) => setUnit(e.target.value)} />
                </div>
                <div>
                  <label className="label">Metric</label>
                  <select className="input" value={metric} onChange={(e) => setMetric(e.target.value)}>
                    <option value="number">number</option>
                    <option value="percentage">percentage</option>
                    <option value="currency">currency</option>
                    <option value="boolean">boolean</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" className="btn-ghost btn-xs" onClick={() => setShowAddKr(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary btn-xs" disabled={addKr.isPending}>
                  {addKr.isPending ? "Adding…" : "Add key result"}
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </article>
  );
}

export default function ObjectivesPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const list = useQuery({ queryKey: ["objectives"], queryFn: api.listObjectives });

  useSSE((name) => {
    if (name.startsWith("objective.") || name.startsWith("key_result.") || name === "check_in.created") {
      qc.invalidateQueries({ queryKey: ["objectives"] });
    }
  });

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [owner, setOwner] = useState("user_demo");
  const [quarter, setQuarter] = useState("2026-Q2");
  const [filter, setFilter] = useState<string>("all");

  const create = useMutation({
    mutationFn: () => api.createObjective({ title, description: description || undefined, ownerId: owner, quarter }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["objectives"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast.show({ tone: "success", title: "Objective created" });
      setShowForm(false);
      setTitle("");
      setDescription("");
    },
    onError: (e: any) => toast.show({ tone: "error", title: "Create failed", description: e?.message }),
  });

  const filtered = (list.data || []).filter((o) =>
    filter === "all" ? true : filter === "active" ? o.status === "active" : o.status === filter,
  );

  const quarters = Array.from(new Set((list.data || []).map((o) => o.quarter)));

  return (
    <div className="space-y-7">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.14em] text-ink-3 font-semibold mb-2">
            Workspace · Acme Robotics
          </div>
          <h1 className="text-[32px] font-semibold tracking-tightish leading-none text-gradient">
            Objectives & Key Results
          </h1>
          <p className="text-sm text-ink-2 mt-3 max-w-2xl leading-relaxed">
            Create OKRs, add measurable key results, and submit progress check-ins. Every submission
            recomputes the rollup on the parent objective and broadcasts an SSE event.
          </p>
        </div>
        {!showForm && (
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> New objective
          </button>
        )}
      </header>

      {/* Filter chips */}
      <div className="flex items-center gap-2 text-xs flex-wrap">
        {[
          { id: "all",       label: `All (${list.data?.length ?? 0})` },
          { id: "active",    label: "Active" },
          { id: "completed", label: "Completed" },
          { id: "cancelled", label: "Cancelled" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={clsx(
              "px-3 py-1.5 rounded-full border transition-all",
              filter === f.id
                ? "bg-brand-600/25 border-brand-500/60 text-white shadow-glow"
                : "border-line bg-bg-2 text-ink-2 hover:text-ink-1 hover:border-line-strong",
            )}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-ink-3">
          {quarters.length > 0 ? `Quarters: ${quarters.join(", ")}` : null}
        </span>
      </div>

      {showForm && (
        <form
          className="card space-y-3 fade-up"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-brand-300" />
            <div className="text-sm font-semibold text-ink-1">New objective</div>
          </div>
          <div>
            <label className="label">Title</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
              placeholder="e.g. Reach NPS 50 in Q2"
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input min-h-[64px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why this matters this quarter…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Owner</label>
              <input className="input" value={owner} onChange={(e) => setOwner(e.target.value)} required />
            </div>
            <div>
              <label className="label">Quarter</label>
              <input className="input" value={quarter} onChange={(e) => setQuarter(e.target.value)} required />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost btn-xs" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary btn-xs" disabled={create.isPending}>
              {create.isPending ? "Creating…" : "Create objective"}
            </button>
          </div>
        </form>
      )}

      {list.isLoading && (
        <div className="grid xl:grid-cols-2 gap-6">
          <ObjectiveCardSkeleton />
          <ObjectiveCardSkeleton />
        </div>
      )}

      {list.error && (
        <div className="card border-rose-500/40 text-rose-300 text-sm">
          {(list.error as Error).message}
        </div>
      )}

      <div className="grid xl:grid-cols-2 gap-6">
        {filtered.map((o) => <ObjectiveCard key={o.id} o={o} />)}
      </div>

      {!list.isLoading && filtered.length === 0 && (
        <div className="card-padded text-center py-14 relative overflow-hidden">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-40 rounded-full blur-3xl opacity-40"
               style={{ background: "radial-gradient(closest-side, rgba(99,102,241,0.4), transparent 70%)" }} />
          <div className="relative">
            <div className="mx-auto w-14 h-14 grid place-items-center rounded-2xl bg-bg-2 ring-1 ring-line text-brand-300 mb-3">
              <Target className="w-6 h-6" />
            </div>
            <div className="text-base text-ink-1 font-medium">No objectives match this filter</div>
            <div className="text-sm text-ink-3 mt-1">Try a different status or create your first objective.</div>
            <button className="btn-primary mt-5" onClick={() => { setFilter("all"); setShowForm(true); }}>
              <Plus className="w-4 h-4" /> Create an objective
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
