import { CheckCircle2, Circle, AlertTriangle, TriangleAlert, Pause } from "lucide-react";

const map = {
  active:    { cls: "pill-sky",     icon: Circle,          label: "Active" },
  completed: { cls: "pill-emerald", icon: CheckCircle2,    label: "Completed" },
  cancelled: { cls: "pill-slate",   icon: Pause,           label: "Cancelled" },
  on_track:  { cls: "pill-emerald", icon: CheckCircle2,    label: "On track" },
  at_risk:   { cls: "pill-amber",   icon: AlertTriangle,   label: "At risk" },
  behind:    { cls: "pill-rose",    icon: TriangleAlert,   label: "Behind" },
} as const;

export default function StatusPill({ status }: { status: string }) {
  const cfg = (map as any)[status] || { cls: "pill-slate", icon: Circle, label: status };
  const Icon = cfg.icon;
  return (
    <span className={cfg.cls}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}
