-- V2: FORCE RLS for owning role; NULL-safe current_workspace_id(); audit partitions Jul–Dec 2026; demo seed.

CREATE OR REPLACE FUNCTION current_workspace_id() RETURNS UUID AS $$
    SELECT CASE
      WHEN coalesce(current_setting('app.current_workspace', true), '') = '' THEN NULL
      ELSE current_setting('app.current_workspace')::UUID
    END;
$$ LANGUAGE SQL STABLE;

ALTER TABLE workspace_members FORCE ROW LEVEL SECURITY;
ALTER TABLE objectives        FORCE ROW LEVEL SECURITY;
ALTER TABLE key_results       FORCE ROW LEVEL SECURITY;
ALTER TABLE check_ins         FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_log         FORCE ROW LEVEL SECURITY;

-- Extra audit partitions (V1 had Jan–Jun 2026).
CREATE TABLE IF NOT EXISTS audit_log_2026_07 PARTITION OF audit_log
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE IF NOT EXISTS audit_log_2026_08 PARTITION OF audit_log
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE IF NOT EXISTS audit_log_2026_09 PARTITION OF audit_log
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE IF NOT EXISTS audit_log_2026_10 PARTITION OF audit_log
    FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE IF NOT EXISTS audit_log_2026_11 PARTITION OF audit_log
    FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE IF NOT EXISTS audit_log_2026_12 PARTITION OF audit_log
    FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

-- Demo seed (idempotent).

INSERT INTO workspaces (id, name, slug, plan)
VALUES ('11111111-1111-1111-1111-111111111111', 'Acme Robotics', 'acme', 'pro')
ON CONFLICT (id) DO NOTHING;

INSERT INTO workspaces (id, name, slug, plan)
VALUES ('22222222-2222-2222-2222-222222222222', 'Globex Inc', 'globex', 'free')
ON CONFLICT (id) DO NOTHING;

-- Flyway runs as Acme tenant so RLS allows child inserts.
SELECT set_config('app.current_workspace', '11111111-1111-1111-1111-111111111111', false);

INSERT INTO workspace_members (workspace_id, user_id, email, display_name, role, accepted_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'user_demo',  'demo@acme.test',  'Demo User',  'owner',  now()),
  ('11111111-1111-1111-1111-111111111111', 'user_alice', 'alice@acme.test', 'Alice Chen', 'admin',  now()),
  ('11111111-1111-1111-1111-111111111111', 'user_bob',   'bob@acme.test',   'Bob Patel',  'member', now())
ON CONFLICT DO NOTHING;

INSERT INTO objectives (id, workspace_id, title, description, owner_id, quarter, status, progress)
VALUES
  ('aaaa1111-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111',
   'Hit $1M ARR by end of Q2',
   'Drive growth via outbound + improved activation funnel.',
   'user_demo', '2026-Q2', 'active', 42.50),
  ('aaaa1111-0000-0000-0000-000000000002',
   '11111111-1111-1111-1111-111111111111',
   'Ship multi-tenant analytics GA',
   'Cohort retention dashboards available to all paid workspaces.',
   'user_alice', '2026-Q2', 'active', 65.00),
  ('aaaa1111-0000-0000-0000-000000000003',
   '11111111-1111-1111-1111-111111111111',
   'Reduce p95 API latency under 250 ms',
   'Profile hot endpoints; add Redis caching where appropriate.',
   'user_bob', '2026-Q2', 'active', 15.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO key_results
  (id, objective_id, workspace_id, title, metric_type, start_value, target_value, current_value, unit, confidence, status)
VALUES
  -- ARR objective
  ('bbbb2222-0000-0000-0000-000000000101',
   'aaaa1111-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111',
   'Close $1,000,000 in new ARR', 'currency', 0, 1000000, 425000, 'USD', 0.60, 'on_track'),
  ('bbbb2222-0000-0000-0000-000000000102',
   'aaaa1111-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111',
   'Land 25 net-new logos', 'number', 0, 25, 11, 'logos', 0.55, 'on_track'),
  ('bbbb2222-0000-0000-0000-000000000103',
   'aaaa1111-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111',
   'Lift activation rate to 60%', 'percentage', 28, 60, 41, '%', 0.50, 'at_risk'),

  -- Analytics objective
  ('bbbb2222-0000-0000-0000-000000000201',
   'aaaa1111-0000-0000-0000-000000000002',
   '11111111-1111-1111-1111-111111111111',
   'Ship retention dashboard MVP', 'percentage', 0, 100, 80, '%', 0.85, 'on_track'),
  ('bbbb2222-0000-0000-0000-000000000202',
   'aaaa1111-0000-0000-0000-000000000002',
   '11111111-1111-1111-1111-111111111111',
   'Onboard 10 design partners', 'number', 0, 10, 5, 'partners', 0.70, 'on_track'),

  -- Latency objective
  ('bbbb2222-0000-0000-0000-000000000301',
   'aaaa1111-0000-0000-0000-000000000003',
   '11111111-1111-1111-1111-111111111111',
   'p95 latency under 250 ms', 'number', 480, 250, 410, 'ms', 0.40, 'behind'),
  ('bbbb2222-0000-0000-0000-000000000302',
   'aaaa1111-0000-0000-0000-000000000003',
   '11111111-1111-1111-1111-111111111111',
   'Cache hit ratio above 80%', 'percentage', 20, 80, 55, '%', 0.55, 'on_track')
ON CONFLICT (id) DO NOTHING;

INSERT INTO check_ins
  (id, key_result_id, workspace_id, author_id, previous_value, new_value, confidence, note, created_at)
VALUES
  ('cccc3333-0000-0000-0000-000000000001',
   'bbbb2222-0000-0000-0000-000000000101',
   '11111111-1111-1111-1111-111111111111',
   'user_demo',  380000, 425000, 0.60, 'Closed Enterprise Co. ($45K ACV).', now() - interval '2 days'),
  ('cccc3333-0000-0000-0000-000000000002',
   'bbbb2222-0000-0000-0000-000000000201',
   '11111111-1111-1111-1111-111111111111',
   'user_alice',     70,     80, 0.85, 'Retention chart shipped to staging.', now() - interval '1 day'),
  ('cccc3333-0000-0000-0000-000000000003',
   'bbbb2222-0000-0000-0000-000000000301',
   '11111111-1111-1111-1111-111111111111',
   'user_bob',      450,    410, 0.40, 'New connection pool sized; more profiling needed.', now() - interval '4 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO audit_log (workspace_id, actor_id, action, entity_type, entity_id, before_state, after_state, created_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'user_demo',
   'objective.created', 'objective', 'aaaa1111-0000-0000-0000-000000000001',
   NULL,
   '{"title":"Hit $1M ARR by end of Q2","status":"active"}'::jsonb,
   now() - interval '7 days'),
  ('11111111-1111-1111-1111-111111111111', 'user_alice',
   'check_in.created', 'check_in', 'cccc3333-0000-0000-0000-000000000002',
   NULL,
   '{"previousValue":"70","newValue":"80","note":"Retention chart shipped to staging."}'::jsonb,
   now() - interval '1 day');

-- Clear GUC after seed so later statements are not scoped to Acme.
SELECT set_config('app.current_workspace', '', false);
