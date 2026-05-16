"use client";

import { Search, Bell, Sparkles } from "lucide-react";
import Avatar from "./Avatar";
import { TENANT } from "@/lib/api";
import { useSSE } from "@/hooks/useSSE";
import { useState } from "react";

export default function TopBar() {
  const [eventCount, setEventCount] = useState(0);
  useSSE((name) => { if (name !== "connected") setEventCount((n) => n + 1); });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl border-b border-line" style={{ backgroundColor: "color-mix(in srgb, var(--bg-0) 75%, transparent)" }}>
      <div className="mx-auto max-w-7xl px-8 py-3.5 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="text-sm text-ink-2 flex items-center gap-1.5 flex-wrap">
            <Sparkles className="w-3.5 h-3.5 text-brand-300" />
            {greeting}, <span className="text-ink-1 font-medium">Demo</span>
            <span className="text-ink-3 mx-1">·</span>
            <span className="text-ink-3">Q2 2026</span>
            <span className="text-ink-3 mx-1">·</span>
            <span className="text-ink-2">Acme Robotics</span>
          </div>
        </div>

        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-3" />
          <input
            disabled
            placeholder="Search objectives, members…"
            className="input pl-8 pr-14 w-80 text-xs disabled:opacity-60 cursor-not-allowed"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 kbd">⌘ K</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg glass border border-line text-[11px] text-ink-2">
            <span className="live-dot" />
            <span className="text-ink-1 tabular font-medium">{eventCount}</span>
            <span className="text-ink-3">events</span>
          </div>
          <button
            className="btn-ghost p-2 relative"
            aria-label="notifications"
            title={`${eventCount} SSE events received this session`}
          >
            <Bell className="w-4 h-4" />
            {eventCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
            )}
          </button>
          <div className="ml-1 pl-3 border-l border-line flex items-center gap-2">
            <Avatar id={TENANT.userId} name="Demo User" size="sm" />
            <div className="hidden lg:block leading-tight">
              <div className="text-xs text-ink-1 font-medium">Demo User</div>
              <div className="text-[10px] text-ink-3">owner</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
