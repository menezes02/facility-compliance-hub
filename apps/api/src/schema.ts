export const schemaSql = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  domain TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  vertical TEXT NOT NULL CHECK (vertical IN ('fire', 'parking', 'pool')),
  contact_name TEXT,
  contact_email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, name)
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'worker', 'viewer')),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, email)
);

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  vertical TEXT NOT NULL CHECK (vertical IN ('fire', 'parking', 'pool')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, name)
);

CREATE TABLE IF NOT EXISTS team_members (
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_role TEXT NOT NULL DEFAULT 'member' CHECK (member_role IN ('lead', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS service_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  vertical TEXT NOT NULL CHECK (vertical IN ('fire', 'parking', 'pool')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'expired')),
  start_date DATE,
  end_date DATE,
  sla_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  vertical TEXT CHECK (vertical IN ('fire', 'parking', 'pool')),
  trigger_source TEXT NOT NULL CHECK (trigger_source IN ('telemetry', 'task_overdue')),
  event_type TEXT,
  comparator TEXT CHECK (comparator IN ('lt', 'gt', 'outside_range', 'equals', 'any')),
  threshold_min DOUBLE PRECISION,
  threshold_max DOUBLE PRECISION,
  severity_filter TEXT CHECK (severity_filter IN ('info', 'warning', 'critical')),
  task_status TEXT CHECK (task_status IN ('pending', 'in_progress', 'awaiting_review', 'overdue')),
  action_type TEXT NOT NULL CHECK (action_type IN ('create_task', 'notify', 'mark_overdue')),
  action_title TEXT NOT NULL,
  action_message TEXT NOT NULL,
  target_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  address TEXT,
  vertical TEXT NOT NULL CHECK (vertical IN ('fire', 'parking', 'pool')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  vertical TEXT NOT NULL CHECK (vertical IN ('fire', 'parking', 'pool')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'attention', 'offline')),
  serial_number TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  device_type TEXT NOT NULL,
  vertical TEXT NOT NULL CHECK (vertical IN ('fire', 'parking', 'pool')),
  status TEXT NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'warning', 'offline')),
  identifier TEXT,
  last_seen TIMESTAMPTZ,
  latest_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  vertical TEXT NOT NULL CHECK (vertical IN ('fire', 'parking', 'pool')),
  recurrence TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  template_id UUID REFERENCES checklist_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  vertical TEXT NOT NULL CHECK (vertical IN ('fire', 'parking', 'pool')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'awaiting_review', 'closed', 'completed', 'overdue')),
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  schedule_type TEXT NOT NULL DEFAULT 'one_time' CHECK (schedule_type IN ('one_time', 'recurring')),
  recurrence_rule TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT
);

CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notes TEXT,
  payload JSONB NOT NULL DEFAULT '[]'::jsonb,
  photo_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  related_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  notification_type TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('in_app', 'email', 'sms', 'slack')),
  target_role TEXT CHECK (target_role IN ('admin', 'manager', 'worker', 'viewer')),
  delay_minutes INTEGER NOT NULL DEFAULT 0,
  repeat_count INTEGER NOT NULL DEFAULT 1,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  policy_id UUID REFERENCES notification_policies(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('in_app', 'email', 'sms', 'slack')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent')),
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  report_type TEXT NOT NULL,
  vertical TEXT,
  period_days INTEGER NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('pdf', 'csv')),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS telemetry_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  vertical TEXT NOT NULL CHECK (vertical IN ('fire', 'parking', 'pool')),
  event_type TEXT NOT NULL,
  reading_value DOUBLE PRECISION,
  reading_text TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_org_email ON users(org_id, email);
CREATE INDEX IF NOT EXISTS idx_teams_org_vertical ON teams(org_id, vertical);
CREATE INDEX IF NOT EXISTS idx_customers_org_vertical ON customers(org_id, vertical);
CREATE INDEX IF NOT EXISTS idx_contracts_org_customer ON service_contracts(org_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_rules_org_trigger ON automation_rules(org_id, trigger_source, enabled);
CREATE INDEX IF NOT EXISTS idx_notification_policies_org ON notification_policies(org_id, enabled);
CREATE INDEX IF NOT EXISTS idx_assets_org_site ON assets(org_id, site_id);
CREATE INDEX IF NOT EXISTS idx_devices_org_site ON devices(org_id, site_id);
CREATE INDEX IF NOT EXISTS idx_templates_org_vertical ON checklist_templates(org_id, vertical);
CREATE INDEX IF NOT EXISTS idx_tasks_org_status ON tasks(org_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_org_vertical ON tasks(org_id, vertical);
CREATE INDEX IF NOT EXISTS idx_tasks_org_due_date ON tasks(org_id, due_date);
CREATE INDEX IF NOT EXISTS idx_submissions_org ON submissions(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_org_user ON notifications(org_id, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_org_status ON notification_deliveries(org_id, status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created ON audit_logs(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_runs_org_created ON report_runs(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_org_device ON telemetry_events(org_id, device_id, created_at DESC);

ALTER TABLE sites ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES assets(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS schedule_type TEXT NOT NULL DEFAULT 'one_time';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_rule TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS review_notes TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks
  ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('pending', 'in_progress', 'awaiting_review', 'closed', 'completed', 'overdue'));
`;
