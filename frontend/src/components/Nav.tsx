"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Target,
  Users,
  History,
  Settings,
  Zap,
  ChevronsUpDown,
  Shield,
} from "lucide-react";
import clsx from "clsx";

const links = [
  { href: "/dashboard",  label: "Dashboard",  icon: LayoutDashboard },
  { href: "/objectives", label: "Objectives", icon: Target },
  { href: "/team",       label: "Team",       icon: Users },
  { href: "/audit",      label: "Audit log",  icon: History },
  { href: "/settings",   label: "Settings",   icon: Settings },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <aside
      className="w-60 shrink-0 border-r border-line backdrop-blur-xl flex flex-col relative"
      style={{ backgroundColor: "color-mix(in srgb, var(--bg-1) 80%, transparent)" }}
    >
      {/* faint top brand glow */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-48 rounded-full blur-3xl opacity-40"
           style={{ background: "radial-gradient(closest-side, rgba(99,102,241,0.35), transparent 70%)" }} />

      <div className="px-5 pt-6 pb-5 relative">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <span className="grid place-items-center w-9 h-9 rounded-xl shadow-glow ring-1 ring-white/10"
                style={{ background: "linear-gradient(135deg, #6366f1, #a855f7 60%, #d946ef)" }}>
            <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
          </span>
          <div>
            <div className="text-[15px] font-semibold tracking-tightish leading-none text-gradient-brand">Kairos</div>
            <div className="text-[10px] text-ink-3 mt-1 uppercase tracking-[0.12em]">OKR platform</div>
          </div>
        </Link>
      </div>

      <div className="px-3 relative">
        <button className="w-full surface-2 px-3 py-2.5 flex items-center gap-2.5 hover:bg-bg-3 transition text-left">
          <span className="w-7 h-7 rounded-md grid place-items-center text-white text-[10px] font-bold"
                style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}>
            A
          </span>
          <span className="flex-1 min-w-0">
            <div className="text-[13px] text-ink-1 font-medium truncate">Acme Robotics</div>
            <div className="text-[10px] text-ink-3 uppercase tracking-wider">Pro plan</div>
          </span>
          <ChevronsUpDown className="w-3.5 h-3.5 text-ink-3" />
        </button>
      </div>

      <nav className="flex-1 px-3 mt-5 space-y-0.5 relative">
        <div className="text-[10px] text-ink-3 uppercase tracking-[0.12em] font-semibold px-2 mb-2">
          Workspace
        </div>
        {links.map((l) => {
          const active = pathname?.startsWith(l.href);
          const Icon = l.icon;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={clsx(
                "relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                active
                  ? "bg-bg-2 text-ink-1 ring-1 ring-line-strong"
                  : "text-ink-2 hover:bg-bg-2 hover:text-ink-1",
              )}
            >
              {active && (
                <span
                  className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r"
                  style={{ background: "linear-gradient(180deg, #a5b4fc, #6366f1)" }}
                />
              )}
              <Icon
                className={clsx("w-4 h-4 ml-0.5", active ? "text-brand-300" : "text-ink-3")}
                strokeWidth={active ? 2.25 : 2}
              />
              {l.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-line relative">
        <div className="flex items-center gap-2 text-[10px] text-ink-2">
          <Shield className="w-3.5 h-3.5 text-emerald-400" strokeWidth={2.25} />
          <span className="uppercase tracking-[0.12em] font-semibold">Postgres RLS</span>
          <span className="ml-auto live-dot" />
        </div>
        <div className="text-[10px] text-ink-3 mt-1.5 leading-snug">
          Tenant isolation enforced by <code className="kbd">FORCE&nbsp;RLS</code>.
        </div>
      </div>
    </aside>
  );
}
