"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, X } from "lucide-react";
import { api, type KeyResult } from "@/lib/api";
import { useToast } from "./Toast";
import { compactNumber } from "@/lib/format";

export default function CheckInForm({
  kr,
  onClose,
}: {
  kr: KeyResult;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [newValue, setNewValue] = useState<string>(String(kr.currentValue ?? 0));
  const [confidence, setConfidence] = useState<string>(String(kr.confidence ?? 0.5));
  const [note, setNote] = useState("");

  const m = useMutation({
    mutationFn: () =>
      api.submitCheckIn(kr.id, {
        newValue: parseFloat(newValue),
        confidence: parseFloat(confidence),
        note: note || undefined,
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["objectives"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
      qc.invalidateQueries({ queryKey: ["check-ins", kr.id] });
      qc.invalidateQueries({ queryKey: ["audit"] });
      toast.show({
        tone: "success",
        title: "Check-in recorded",
        description: `Objective progress is now ${Number(res.objectiveProgress).toFixed(1)}%`,
      });
      onClose();
    },
    onError: (e: any) => {
      toast.show({ tone: "error", title: "Check-in failed", description: e?.message });
    },
  });

  const projected = (() => {
    const v = parseFloat(newValue);
    if (Number.isNaN(v) || !kr.targetValue) return null;
    const start = kr.startValue ?? 0;
    const range = kr.targetValue - start;
    if (range === 0) return v >= kr.targetValue ? 100 : 0;
    return Math.max(0, Math.min(100, ((v - start) / range) * 100));
  })();

  return (
    <form
      className="mt-2 surface-2 p-3.5 space-y-3 fade-up"
      onSubmit={(e) => {
        e.preventDefault();
        m.mutate();
      }}
    >
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-ink-1">Submit check-in</div>
        <button type="button" onClick={onClose} className="text-ink-3 hover:text-ink-1">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className="label">New value</label>
          <input
            className="input"
            type="number"
            step="any"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            required
            autoFocus
          />
          <div className="text-[10px] text-ink-3 mt-1 tabular">
            from {compactNumber(Number(kr.currentValue), { unit: kr.unit })} of{" "}
            {compactNumber(Number(kr.targetValue), { unit: kr.unit })}
          </div>
        </div>
        <div>
          <label className="label">Confidence</label>
          <input
            className="input"
            type="number"
            step="0.05"
            min={0}
            max={1}
            value={confidence}
            onChange={(e) => setConfidence(e.target.value)}
          />
          <div className="text-[10px] text-ink-3 mt-1 tabular">0 – 1</div>
        </div>
      </div>

      {projected != null && (
        <div className="text-[11px] text-ink-3">
          Projected KR progress after submit:{" "}
          <span className="text-ink-1 font-medium tabular">{projected.toFixed(1)}%</span>
        </div>
      )}

      <div>
        <label className="label">Note (optional)</label>
        <input
          className="input"
          placeholder="What changed since last check-in?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className="btn-ghost btn-xs" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn-primary btn-xs" disabled={m.isPending}>
          <Send className="w-3 h-3" />
          {m.isPending ? "Submitting…" : "Submit"}
        </button>
      </div>
    </form>
  );
}
