<div align="center">

# Kairos

**Multi-Tenant Team OKR & Analytics Platform**

[![CI](https://github.com/Vyshnavi-d-p-3/kairos/actions/workflows/ci.yml/badge.svg)](https://github.com/Vyshnavi-d-p-3/kairos/actions)
[![Java 21](https://img.shields.io/badge/Java-21-orange.svg)](https://openjdk.org/)
[![Spring Boot 3](https://img.shields.io/badge/Spring%20Boot-3.3-green.svg)](https://spring.io/)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

*Production-grade multi-tenant SaaS with Postgres Row-Level Security,*
*idempotent APIs, SSE real-time dashboards, and end-to-end observability.*

[Architecture](#architecture) · [Quick Start](#quick-start) · [Design Decisions](#key-design-decisions) · [Tech Stack](#tech-stack) · [Roadmap](#roadmap)

</div>

---

## Why Kairos

Google invented OKRs. Building a production OKR platform demonstrates enterprise engineering patterns that separate a real product from a tutorial: tenant isolation that's structurally impossible to bypass, idempotent writes safe for retry storms, real-time dashboards that scale, and observability that answers "which request is slow and why" in under 30 seconds.

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Tenant isolation | Postgres RLS (row-level security) | A missed WHERE clause can't leak data when the database enforces isolation. Application-layer filtering is a bug waiting to happen |
| RLS mechanism | `SET LOCAL app.current_workspace` per JDBC connection | Connection-level context via HikariCP customizer ensures every query is scoped — no opt-in required |
| Idempotency | Redis-backed Idempotency-Key header (Stripe pattern) | Prevents double-submits from frontend retries. 24h TTL, cached response returned on replay |
| Rate limiting | Sliding window via Redis sorted sets (ZADD/ZRANGEBYSCORE) | Per-workspace throttling. Sorted set pattern gives O(log N) accuracy without fixed windows |
| Real-time | SSE via Spring SseEmitter + Redis pub/sub | SSE is simpler than WebSocket for unidirectional server→client updates. Redis pub/sub fans out across backend instances |
| Audit log | Partitioned by month, insert-only, before/after JSONB | Immutable audit trail. Monthly partitions keep queries fast and enable cheap archival |

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                  NEXT.JS 14 FRONTEND (Vercel)                    │
│                                                                  │
│  /dashboard    Real-time OKR progress, team heatmap              │
│  /objectives   CRUD, key results, check-ins                      │
│  /team         Member management, invites, RBAC                  │
│  /audit        Searchable audit log with before/after diff       │
│  /settings     Workspace config                                  │
│                                                                  │
│  Real-time: EventSource (SSE) for live dashboard updates         │
│  Auth: Clerk → JWT in Authorization header                       │
└────────────────────────┬───────────────┬─────────────────────────┘
                         │ REST          │ SSE
                         ▼               ▼
┌──────────────────────────────────────────────────────────────────┐
│                  SPRING BOOT 3 BACKEND (Fly.io)                  │
│                                                                  │
│  Request Pipeline (Filters):                                     │
│  ┌─────────┐ ┌──────────┐ ┌────────┐ ┌────────────┐ ┌────────┐ │
│  │ Clerk   │►│ Tenant   │►│  RLS   │►│Idempotency │►│ Rate   │ │
│  │ JWT     │ │ Context  │ │Connection│ │  Check     │ │ Limit  │ │
│  │ Verify  │ │ Resolve  │ │SET LOCAL│ │  (Redis)   │ │(Redis) │ │
│  └─────────┘ └──────────┘ └────────┘ └────────────┘ └────────┘ │
│                                                                  │
│  Controllers:                                                    │
│  WorkspaceController · ObjectiveController · CheckInController   │
│  DashboardController (SSE) · AuditController                     │
│                                                                  │
│  Services:                                                       │
│  OKRRollupService · AuditService · SSEBroadcaster                │
│                                                                  │
│  OpenTelemetry: auto-instrumented traces + custom spans          │
└──────────┬──────────────────┬──────────────────┬─────────────────┘
           ▼                  ▼                  ▼
┌──────────────────┐  ┌──────────────┐  ┌──────────────────────┐
│  PostgreSQL 16   │  │   Redis 7    │  │   Observability      │
│                  │  │              │  │                      │
│  RLS on all      │  │  Rate limit  │  │  Jaeger (traces)     │
│  tables          │  │  Idempotency │  │  Prometheus (metrics) │
│  Partitioned     │  │  SSE pub/sub │  │  Grafana (dashboards) │
│  audit_log       │  │  Cache       │  │                      │
│  Flyway mgmt     │  │              │  │                      │
└──────────────────┘  └──────────────┘  └──────────────────────┘
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 14, TypeScript, Tailwind, shadcn/ui | SPA with Server Components |
| Data Fetching | TanStack Query v5 | Cache invalidation, optimistic updates |
| Charts | Recharts | OKR progress visualizations, heatmaps |
| Backend | Spring Boot 3, Java 21 | REST API + SSE streaming |
| ORM | Spring Data JPA + Hibernate | Database access |
| Migrations | Flyway | Versioned schema migrations |
| Auth | Clerk | JWT with refresh token rotation |
| Database | PostgreSQL 16 with RLS | Tenant-isolated data store |
| Cache | Redis 7 | Rate limiting, SSE fanout, idempotency keys |
| Observability | OpenTelemetry → Jaeger + Prometheus → Grafana | Distributed traces + metrics |
| CI/CD | GitHub Actions | Lint, test, build, deploy |
| Deploy | Fly.io + Vercel + Neon + Upstash | Production hosting |

## Quick Start

```bash
git clone https://github.com/Vyshnavi-d-p-3/kairos.git
cd kairos

# Infrastructure
docker compose up -d  # Postgres + Redis

# Backend
cd backend
./mvnw spring-boot:run

# Frontend (separate terminal)
cd frontend
npm install && npm run dev
```

## Project Structure

```
kairos/
├── backend/
│   └── src/main/java/com/kairos/
│       ├── KairosApplication.java
│       ├── controller/             # REST + SSE endpoints
│       ├── service/                # OKRRollup, Audit, SSEBroadcaster
│       ├── model/                  # JPA entities with RLS
│       ├── repository/             # Spring Data JPA repos
│       ├── filter/                 # TenantContext, Idempotency, RateLimit
│       └── config/                 # DataSource, Redis, OpenTelemetry
├── frontend/                       # Next.js 14 App Router
│   └── src/app/                    # dashboard, objectives, team, audit
├── db/migrations/                  # Flyway SQL migrations
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## Roadmap

- [x] Architecture design + database schema with RLS
- [x] Flyway migrations with RLS policies
- [x] JPA entities + tenant context filter
- [x] Idempotency, rate limiting, and audit filters
- [x] OKR rollup service
- [ ] SSE real-time dashboard updates
- [ ] Next.js frontend (dashboard, objectives, team, audit)
- [ ] OpenTelemetry instrumentation
- [ ] Playwright E2E tests
- [ ] Deploy: Fly.io + Vercel + Neon
- [ ] Blog post: *"Building multi-tenant SaaS with Postgres RLS"*

## License

MIT

---

<div align="center">
<sub>Built by <a href="https://github.com/Vyshnavi-d-p-3">Vyshnavi D P</a></sub>
</div>
