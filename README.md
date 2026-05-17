# Kairos

Multi-tenant OKR tracker. Tenant isolation is enforced in PostgreSQL with
Row-Level Security, not in application code — a missed `WHERE` clause in the
API still can't leak data across workspaces.

Spring Boot API, Next.js UI, Postgres + Redis. Built as a study of how far you
can push tenant isolation into the database layer.

## Stack

| Layer | Tech |
|---|---|
| API | Java 21, Spring Boot 3.3, Spring Data JPA, Flyway |
| DB | PostgreSQL 16 — Row-Level Security with `FORCE RLS` |
| Cache | Redis 7 — idempotency cache + sliding-window rate limit |
| UI | Next.js 14 (App Router), TypeScript, Tailwind, TanStack Query, Recharts |
| Observability | OpenTelemetry → Jaeger, Micrometer → Prometheus → Grafana |

## How tenant isolation works

Every tenant table (`objectives`, `key_results`, `check_ins`, `workspace_members`,
`audit_log`) has an RLS policy: `workspace_id = current_workspace_id()`. The
`current_workspace_id()` function reads a Postgres session variable,
`app.current_workspace`.

That variable is set by `RlsDataSourceConfig`, which wraps the HikariCP pool:
on connection checkout it runs `set_config('app.current_workspace', <id>, false)`,
and a proxy clears it on `close()` so a pooled connection can't carry tenant
context to the next borrower.

`FORCE ROW LEVEL SECURITY` is on because the app and Flyway connect as the role
that owns the tables — without `FORCE`, RLS policies don't apply to a table's
owner, so they'd be a no-op.

The app layer also checks the workspace header (`TenantContextFilter`), but that
is for clean error messages. RLS is the actual guarantee.

## Run locally

```bash
docker compose up -d        # postgres, redis, jaeger, prometheus, grafana

cd backend && ./mvnw spring-boot:run     # Flyway migrates + seeds Acme/Globex
cd frontend && npm install && npm run dev
```

| URL | What |
|---|---|
| http://localhost:3000 | App |
| http://localhost:8080 | REST + SSE |
| http://localhost:16686 | Jaeger |
| http://localhost:3001 | Grafana (Kairos — Overview dashboard) |
| http://localhost:9090 | Prometheus |

Seeded: **Acme** (`1111…`) has data; **Globex** (`2222…`) is empty — two curls
against `/api/v1/dashboard/summary` with each workspace ID show RLS filtering.

## Idempotency and rate limiting

`Idempotency-Key` on POST/PUT/PATCH: a successful (2xx) response is cached in
Redis for 24h per workspace+key; a retry replays it with `Idempotency-Replayed: true`.
Rate limiting is a per-workspace sliding window over a Redis sorted set.

Both fail **open** if Redis is down — they're optimisations, not correctness
guarantees, so a cache outage degrades the limiter rather than taking down the API.

## Audit log

Insert-only `audit_log`, monthly-partitioned on `created_at`, storing
before/after JSONB per mutation. The Audit page diffs them.

## Status and limitations

This is a working project built to explore the RLS pattern, not production
software. Known limitations:

- **Auth is stubbed.** `X-Workspace-Id` / `X-User-Id` headers stand in for
  verified JWT claims. A JWT verifier would replace `TenantContextFilter`;
  nothing downstream changes, since everything reads `TenantContext`.
- **SSE is single-instance.** Emitters are held in memory in one JVM. Scaling
  to multiple API instances needs Redis Pub/Sub to fan broadcasts across them.
- **The `workspaces` table is intentionally not RLS-scoped** (`GET /api/v1/workspaces`
  returns every row; the demo UI still hard-codes Acme). In a real product that
  listing would be auth-gated.
- **Audit partitions are pre-created through end of 2026**; production needs
  an automated partition job.
- Integration tests need Docker (Testcontainers); they skip without it.

## CI

GitHub Actions (`.github/workflows/ci.yml`): backend runs `./mvnw package -DskipTests`
then `./mvnw verify` (Java 21; tests use Testcontainers Postgres). Frontend:
`npm ci` + `npm run build`.

## License

MIT
