-- ============================================================
-- KAIROS DATABASE SCHEMA
-- Multi-tenant with Row-Level Security
-- ============================================================

-- RLS helper: reads the session variable set by TenantContextFilter
CREATE OR REPLACE FUNCTION current_workspace_id() RETURNS UUID AS $$
    SELECT current_setting('app.current_workspace', true)::UUID;
$$ LANGUAGE SQL STABLE;

-- Workspaces (tenants)
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    plan TEXT DEFAULT 'free' CHECK (plan IN ('free','pro','enterprise')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Members
CREATE TABLE workspace_members (
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    email TEXT NOT NULL,
    display_name TEXT,
    role TEXT NOT NULL CHECK (role IN ('owner','admin','member','viewer')),
    invited_at TIMESTAMPTZ DEFAULT now(),
    accepted_at TIMESTAMPTZ,
    PRIMARY KEY (workspace_id, user_id)
);
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY workspace_members_policy ON workspace_members
    USING (workspace_id = current_workspace_id());

-- Objectives
CREATE TABLE objectives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    owner_id TEXT NOT NULL,
    quarter TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
    progress DECIMAL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;
CREATE POLICY objectives_policy ON objectives
    USING (workspace_id = current_workspace_id());

-- Key Results
CREATE TABLE key_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    objective_id UUID NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id),
    title TEXT NOT NULL,
    metric_type TEXT DEFAULT 'number' CHECK (metric_type IN ('number','percentage','currency','boolean')),
    start_value DECIMAL DEFAULT 0,
    target_value DECIMAL NOT NULL,
    current_value DECIMAL DEFAULT 0,
    unit TEXT,
    confidence DECIMAL DEFAULT 0.5 CHECK (confidence BETWEEN 0 AND 1),
    status TEXT DEFAULT 'on_track' CHECK (status IN ('on_track','at_risk','behind','completed')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE key_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY key_results_policy ON key_results
    USING (workspace_id = current_workspace_id());

-- Check-ins
CREATE TABLE check_ins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_result_id UUID NOT NULL REFERENCES key_results(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id),
    author_id TEXT NOT NULL,
    previous_value DECIMAL NOT NULL,
    new_value DECIMAL NOT NULL,
    confidence DECIMAL CHECK (confidence BETWEEN 0 AND 1),
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
CREATE POLICY check_ins_policy ON check_ins
    USING (workspace_id = current_workspace_id());

-- Audit log (partitioned by month, insert-only)
CREATE TABLE audit_log (
    id UUID DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    actor_id TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    before_state JSONB,
    after_state JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE audit_log_2026_01 PARTITION OF audit_log FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE audit_log_2026_02 PARTITION OF audit_log FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE audit_log_2026_03 PARTITION OF audit_log FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE audit_log_2026_04 PARTITION OF audit_log FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE audit_log_2026_05 PARTITION OF audit_log FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE audit_log_2026_06 PARTITION OF audit_log FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_log_policy ON audit_log
    USING (workspace_id = current_workspace_id());

CREATE INDEX idx_audit_workspace_created ON audit_log(workspace_id, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
