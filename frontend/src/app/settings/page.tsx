"use client";

import { Copy, Database, KeyRound, Server, Shield, Terminal } from "lucide-react";
import { useState } from "react";
import { TENANT } from "@/lib/api";
import { useToast } from "@/components/Toast";

function CopyField({ value, label }: { value: string; label: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div className="label">{label}</div>
      <div className="flex items-center gap-2">
        <code className="flex-1 font-mono text-sm bg-bg-2 border border-line rounded-lg px-3 py-2 truncate">
          {value}
        </code>
        <button
          className="btn-outline btn-xs"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              toast.show({ tone: "success", title: "Copied" });
              setTimeout(() => setCopied(false), 1500);
            } catch {
              toast.show({ tone: "error", title: "Copy failed" });
            }
          }}
        >
          <Copy className="w-3 h-3" />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-7">
      <header>
        <div className="text-[11px] uppercase tracking-[0.14em] text-ink-3 font-semibold mb-2">
          Workspace · Identity
        </div>
        <h1 className="text-[32px] font-semibold tracking-tightish leading-none text-gradient">
          Settings
        </h1>
        <p className="text-sm text-ink-2 mt-3 max-w-2xl leading-relaxed">
          Demo workspace identity. In production this comes from Clerk JWT claims; for now
          the same shape is passed via headers, so swapping in real auth is one filter change.
        </p>
      </header>

      <section className="grid lg:grid-cols-2 gap-6">
        <div className="card space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink-1">
            <Shield className="w-4 h-4 text-brand-300" /> Identity
          </div>
          <CopyField label="Workspace ID" value={TENANT.workspaceId} />
          <CopyField label="Acting user" value={TENANT.userId} />
          <p className="text-xs text-ink-3 leading-relaxed">
            Every request from this UI carries{" "}
            <code className="kbd">X-Workspace-Id</code> and{" "}
            <code className="kbd">X-User-Id</code>. The backend uses them to set{" "}
            <code className="kbd">app.current_workspace</code> on the JDBC connection;
            Postgres RLS policies read it to scope every query. Mutating endpoints additionally accept{" "}
            <code className="kbd">Idempotency-Key</code>.
          </p>
        </div>

        <div className="card space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink-1">
            <Server className="w-4 h-4 text-brand-300" /> Infrastructure
          </div>
          <ul className="text-sm space-y-3">
            <li className="flex items-start gap-3">
              <Database className="w-4 h-4 mt-0.5 text-emerald-300 shrink-0" />
              <div>
                <div className="text-ink-1">Postgres 16</div>
                <div className="text-xs text-ink-3">
                  Row-Level Security with <code className="kbd">FORCE&nbsp;RLS</code>, monthly-partitioned audit log
                </div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <KeyRound className="w-4 h-4 mt-0.5 text-sky-300 shrink-0" />
              <div>
                <div className="text-ink-1">Redis 7</div>
                <div className="text-xs text-ink-3">
                  Idempotency cache + sliding-window rate-limit (sorted sets)
                </div>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <section className="card">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink-1 mb-3">
          <Terminal className="w-4 h-4 text-brand-300" /> Try the API directly
        </div>
        <pre className="font-mono text-[12px] whitespace-pre-wrap text-ink-2 bg-bg-2 border border-line rounded-lg p-4 overflow-x-auto leading-relaxed">
{`# Dashboard summary (Acme — has data)
curl http://localhost:8080/api/v1/dashboard/summary \\
  -H "X-Workspace-Id: ${TENANT.workspaceId}" \\
  -H "X-User-Id: ${TENANT.userId}"

# Same endpoint, different tenant → RLS returns zero rows
curl http://localhost:8080/api/v1/dashboard/summary \\
  -H "X-Workspace-Id: 22222222-2222-2222-2222-222222222222"

# Submit a check-in → triggers rollup + SSE broadcast
curl -X POST http://localhost:8080/api/v1/key-results/<KR-ID>/check-ins \\
  -H "X-Workspace-Id: ${TENANT.workspaceId}" \\
  -H "X-User-Id: ${TENANT.userId}" \\
  -H "Idempotency-Key: $(uuidgen)" \\
  -H "Content-Type: application/json" \\
  -d '{"newValue": 700000, "confidence": 0.8, "note": "Big deal closed"}'`}
        </pre>
      </section>
    </div>
  );
}
