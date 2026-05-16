"use client";

import { useQuery } from "@tanstack/react-query";
import { Mail, Shield, UserCheck, Users } from "lucide-react";
import { api } from "@/lib/api";
import Avatar from "@/components/Avatar";
import { Skeleton } from "@/components/Skeleton";
import clsx from "clsx";

const roleStyles: Record<string, string> = {
  owner: "pill-violet",
  admin: "pill-sky",
  member: "pill-emerald",
  viewer: "pill-slate",
};

export default function TeamPage() {
  const members = useQuery({ queryKey: ["members"], queryFn: api.listMembers });

  return (
    <div className="space-y-7">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.14em] text-ink-3 font-semibold mb-2">
            People · RLS scoped
          </div>
          <h1 className="text-[32px] font-semibold tracking-tightish leading-none text-gradient">
            Team
          </h1>
          <p className="text-sm text-ink-2 mt-3 max-w-2xl leading-relaxed">
            Workspace members. Rows are filtered by Postgres RLS — other tenants’ members
            never reach the client, even on a SELECT *.
          </p>
        </div>
        <div className="text-xs text-ink-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full surface-2">
          <Users className="w-3.5 h-3.5 text-ink-3" /> {members.data?.length ?? 0} members
        </div>
      </header>

      {members.isLoading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {members.error && (
        <div className="card border-rose-500/40 text-rose-300 text-sm">
          {(members.error as Error).message}
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.data?.map((m) => (
          <div key={m.userId} className="card hover-lift flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <Avatar id={m.userId} name={m.displayName} size="lg" ring />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-ink-1 truncate">
                    {m.displayName ?? m.userId.replace(/^user_/, "")}
                  </div>
                  <span className={clsx(roleStyles[m.role] ?? "pill-slate", "shrink-0")}>
                    {m.role === "owner" && <Shield className="w-3 h-3" />}
                    {m.role}
                  </span>
                </div>
                <div className="text-[11px] text-ink-3 font-mono mt-0.5 truncate">{m.userId}</div>
              </div>
            </div>
            <div className="text-xs text-ink-2 flex items-center gap-1.5 truncate">
              <Mail className="w-3.5 h-3.5 text-ink-3" /> {m.email}
            </div>
            <div className="text-[10px] text-ink-3 flex items-center gap-1.5 mt-auto">
              <UserCheck className="w-3 h-3" />
              {m.acceptedAt
                ? `Joined ${new Date(m.acceptedAt).toLocaleDateString()}`
                : "Invite pending"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
