import { query, pool } from "../db.js";
import { schemaSql } from "../schema.js";
import { verticalTemplates } from "@operationhub/verticals";
import { hashPassword } from "../auth.js";
import crypto from "node:crypto";

// Demo account passwords come from the environment (SEED_ADMIN_PASSWORD, SEED_MANAGER_PASSWORD,
// SEED_WORKER_PASSWORD). If unset, a random one is generated and printed once, only for accounts
// that are actually created by this run. No password is stored in the repository.
const generatedPasswords: Array<{ email: string; password: string }> = [];

function seedPassword(envName: string, email: string): string {
  const fromEnv = process.env[envName]?.trim();
  if (fromEnv) {
    if (fromEnv.length < 12) {
      throw new Error(`${envName} must be at least 12 characters`);
    }
    return fromEnv;
  }
  const password = crypto.randomBytes(15).toString("base64url");
  generatedPasswords.push({ email, password });
  return password;
}

async function seed() {
  await query(schemaSql);

  const org = await query<{ id: string }>(
    `INSERT INTO organizations (name, slug, domain)
     VALUES ('Facility Compliance Hub Demo', 'facility-compliance-hub-demo', 'localhost')
     ON CONFLICT (slug) DO UPDATE SET domain = EXCLUDED.domain
     RETURNING id`
  );

  const orgId = org.rows[0].id;
  const demoUsers = [
    { email: "admin@example.com", env: "SEED_ADMIN_PASSWORD", first: "Demo", last: "Admin", role: "admin" },
    { email: "manager@example.com", env: "SEED_MANAGER_PASSWORD", first: "Mara", last: "Manager", role: "manager" },
    { email: "worker@example.com", env: "SEED_WORKER_PASSWORD", first: "Wes", last: "Worker", role: "worker" }
  ];

  for (const user of demoUsers) {
    const existing = await query(`SELECT 1 FROM users WHERE org_id = $1 AND email = $2`, [orgId, user.email]);
    if (existing.rowCount) continue;
    const hash = await hashPassword(seedPassword(user.env, user.email));
    await query(
      `INSERT INTO users (org_id, email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (org_id, email) DO NOTHING`,
      [orgId, user.email, hash, user.first, user.last, user.role]
    );
  }

  const teams = [
    ["Fire Response Alpha", "fire", "Primary fire inspection and compliance team"],
    ["Parking Operations", "parking", "Parking patrol and enforcement dispatch team"],
    ["Pool Safety Unit", "pool", "Pool chemistry and lifeguard compliance team"]
  ];

  for (const [name, vertical, description] of teams) {
    await query(
      `INSERT INTO teams (org_id, name, vertical, description)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (org_id, name) DO NOTHING`,
      [orgId, name, vertical, description]
    );
  }

  const customers = [
    ["City Fire Authority", "fire", "Ava Marshal", "fire@authority.example", "+353-1-555-1001", "Municipal fire compliance customer"],
    ["Riverside Parking Holdings", "parking", "Niall O'Brien", "parking@holdings.example", "+353-1-555-2002", "Managed parking operations contract"],
    ["Harbor Leisure Trust", "pool", "Sinead Walsh", "pool@trust.example", "+353-1-555-3003", "Public leisure and aquatic safety customer"]
  ];

  for (const [name, vertical, contactName, contactEmail, phone, notes] of customers) {
    await query(
      `INSERT INTO customers (org_id, name, vertical, contact_name, contact_email, phone, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (org_id, name) DO NOTHING`,
      [orgId, name, vertical, contactName, contactEmail, phone, notes]
    );
  }

  const sites = [
    ["Central Fire Station", "12 Safety Way", "fire", "Primary response station and appliance bay"],
    ["Riverside Parking Deck", "88 City Centre", "parking", "Multi-level city parking facility"],
    ["Harbor Leisure Pool", "7 Marina Park", "pool", "Public swimming pool and changing complex"]
  ];

  for (const [name, address, vertical, description] of sites) {
    await query(
      `INSERT INTO sites (org_id, name, address, vertical, description)
       SELECT $1, $2, $3, $4, $5
       WHERE NOT EXISTS (
         SELECT 1 FROM sites WHERE org_id = $1 AND name = $2
       )`,
      [orgId, name, address, vertical, description]
    );
  }

  await query(
    `UPDATE sites
     SET customer_id = customers.id
     FROM customers
     WHERE sites.org_id = $1
       AND customers.org_id = $1
       AND sites.vertical = customers.vertical
       AND sites.customer_id IS NULL`,
    [orgId]
  );

  const assets = [
    ["Central Fire Station", "Engine Bay Extinguisher A", "extinguisher", "fire", "FE-001", "Dry powder extinguisher near bay door"],
    ["Central Fire Station", "North Exit Route", "exit-route", "fire", "EX-002", "Emergency exit corridor and door hardware"],
    ["Riverside Parking Deck", "Barrier Gate 01", "barrier-gate", "parking", "PK-101", "Entry lane barrier motor and arm"],
    ["Riverside Parking Deck", "EV Charger Pod A", "ev-charger", "parking", "PK-203", "Dual-head fast charger on level 2"],
    ["Harbor Leisure Pool", "Main Pool Chemistry Point", "water-test-point", "pool", "PL-301", "Primary chemistry sampling station"],
    ["Harbor Leisure Pool", "Lifeguard Rescue Kit", "safety-kit", "pool", "PL-302", "Poolside rescue and response equipment"]
  ];

  for (const [siteName, name, assetType, vertical, serialNumber, description] of assets) {
    await query(
      `INSERT INTO assets (org_id, site_id, name, asset_type, vertical, serial_number, description)
       SELECT $1, sites.id, $2, $3, $4, $5, $6
       FROM sites
       WHERE sites.org_id = $1
         AND sites.name = $7
         AND NOT EXISTS (
           SELECT 1 FROM assets WHERE org_id = $1 AND name = $2
         )`,
      [orgId, name, assetType, vertical, serialNumber, description, siteName]
    );
  }

  const devices = [
    ["Central Fire Station", "Engine Bay Extinguisher A", "Extinguisher Pressure Sensor", "fire-sensor", "fire", "FD-1001"],
    ["Riverside Parking Deck", "Barrier Gate 01", "Barrier Controller", "parking-gate", "parking", "PK-2001"],
    ["Riverside Parking Deck", "EV Charger Pod A", "Bay Occupancy Sensor", "parking-bay-sensor", "parking", "PK-2002"],
    ["Harbor Leisure Pool", "Main Pool Chemistry Point", "Pool Chemistry Probe", "pool-probe", "pool", "PL-3001"]
  ];

  for (const [siteName, assetName, name, deviceType, vertical, identifier] of devices) {
    await query(
      `INSERT INTO devices (org_id, site_id, asset_id, name, device_type, vertical, identifier, status, last_seen)
       SELECT $1, sites.id, assets.id, $2, $3, $4, $5, 'online', NOW()
       FROM sites
       LEFT JOIN assets ON assets.org_id = $1 AND assets.site_id = sites.id AND assets.name = $6
       WHERE sites.org_id = $1
         AND sites.name = $7
         AND NOT EXISTS (
           SELECT 1 FROM devices WHERE org_id = $1 AND name = $2
         )`,
      [orgId, name, deviceType, vertical, identifier, assetName, siteName]
    );
  }

  for (const template of verticalTemplates) {
    await query(
      `INSERT INTO checklist_templates (org_id, name, description, category, vertical, recurrence, items)
       SELECT $1, $2, $3, $4, $5, $6, $7::jsonb
       WHERE NOT EXISTS (
         SELECT 1 FROM checklist_templates WHERE org_id = $1 AND name = $2
       )`,
      [
        orgId,
        template.name,
        template.description,
        template.category,
        template.vertical,
        template.recurrence,
        JSON.stringify(template.items)
      ]
    );
  }

  const admin = await query<{ id: string }>(
    `SELECT id FROM users WHERE org_id = $1 AND email = 'admin@example.com'`,
    [orgId]
  );
  const manager = await query<{ id: string }>(
    `SELECT id FROM users WHERE org_id = $1 AND email = 'manager@example.com'`,
    [orgId]
  );
  const worker = await query<{ id: string }>(
    `SELECT id FROM users WHERE org_id = $1 AND email = 'worker@example.com'`,
    [orgId]
  );
  const siteRows = await query<{ id: string; vertical: string }>(
    `SELECT id, vertical FROM sites WHERE org_id = $1`,
    [orgId]
  );
  const teamRows = await query<{ id: string; vertical: string; name: string }>(
    `SELECT id, vertical, name FROM teams WHERE org_id = $1`,
    [orgId]
  );
  const customerRows = await query<{ id: string; vertical: string; name: string }>(
    `SELECT id, vertical, name FROM customers WHERE org_id = $1`,
    [orgId]
  );
  const ruleTeamByVertical = Object.fromEntries(teamRows.rows.map((team) => [team.vertical, team.id])) as Record<string, string>;
  const assetRows = await query<{ id: string; vertical: string; site_id: string }>(
    `SELECT id, vertical, site_id FROM assets WHERE org_id = $1`,
    [orgId]
  );
  const templateRows = await query<{ id: string; vertical: string; name: string; recurrence: string | null }>(
    `SELECT id, vertical, name, recurrence FROM checklist_templates WHERE org_id = $1`,
    [orgId]
  );

  for (const site of siteRows.rows) {
    const template = templateRows.rows.find(
      (row: { id: string; vertical: string; name: string }) => row.vertical === site.vertical
    );
    if (!template) continue;

    await query(
      `INSERT INTO tasks (org_id, site_id, asset_id, template_id, title, description, vertical, assigned_to, due_date, schedule_type, recurrence_rule)
       SELECT $1, $2, $3, $4, $5, $6, $7, $8, NOW() + INTERVAL '1 day', 'recurring', $9
       WHERE NOT EXISTS (
         SELECT 1 FROM tasks WHERE org_id = $1 AND title = $5
       )`,
      [
        orgId,
        site.id,
        assetRows.rows.find((asset) => asset.site_id === site.id && asset.vertical === site.vertical)?.id ?? null,
        template.id,
        `${template.name} - ${site.vertical.toUpperCase()}`,
        `Seeded starter task for ${site.vertical} operations`,
        site.vertical,
        admin.rows[0].id,
        template.recurrence ?? null
      ]
    );
  }

  const membershipRows = [
    [teamRows.rows.find((row) => row.vertical === "fire")?.id, manager.rows[0]?.id, "lead"],
    [teamRows.rows.find((row) => row.vertical === "fire")?.id, worker.rows[0]?.id, "member"],
    [teamRows.rows.find((row) => row.vertical === "parking")?.id, manager.rows[0]?.id, "lead"],
    [teamRows.rows.find((row) => row.vertical === "parking")?.id, worker.rows[0]?.id, "member"],
    [teamRows.rows.find((row) => row.vertical === "pool")?.id, manager.rows[0]?.id, "lead"],
    [teamRows.rows.find((row) => row.vertical === "pool")?.id, worker.rows[0]?.id, "member"]
  ];

  for (const [teamId, userId, memberRole] of membershipRows) {
    if (!teamId || !userId) continue;
    await query(
      `INSERT INTO team_members (team_id, user_id, member_role)
       VALUES ($1, $2, $3)
       ON CONFLICT (team_id, user_id) DO NOTHING`,
      [teamId, userId, memberRole]
    );
  }

  await query(
    `UPDATE tasks
     SET team_id = teams.id
     FROM sites, teams
     WHERE tasks.org_id = $1
       AND tasks.site_id = sites.id
       AND teams.org_id = $1
       AND teams.vertical = sites.vertical
       AND tasks.team_id IS NULL`,
    [orgId]
  );

  const contracts = [
    ["City Fire Compliance Retainer", "fire", "2026-01-01", "2026-12-31", "Monthly inspections and reactive follow-up support"],
    ["Parking Operations SLA", "parking", "2026-01-01", "2026-12-31", "Daily patrols, occupancy checks, and barrier response"],
    ["Aquatic Safety Programme", "pool", "2026-01-01", "2026-12-31", "Water chemistry monitoring and safety kit inspections"]
  ];

  for (const [name, vertical, startDate, endDate, slaNotes] of contracts) {
    const customerId = customerRows.rows.find((row) => row.vertical === vertical)?.id;
    if (!customerId) continue;

    await query(
      `INSERT INTO service_contracts (org_id, customer_id, name, vertical, status, start_date, end_date, sla_notes)
       SELECT $1, $2, $3, $4, 'active', $5, $6, $7
       WHERE NOT EXISTS (
         SELECT 1 FROM service_contracts WHERE org_id = $1 AND name = $3
       )`,
      [orgId, customerId, name, vertical, startDate, endDate, slaNotes]
    );
  }

  const rules = [
    [
      "Pool pH out of range",
      "pool",
      "telemetry",
      "ph",
      "outside_range",
      7,
      7.8,
      "warning",
      null,
      "create_task",
      "Pool chemistry correction required",
      "Automatic corrective task created because pool pH moved outside the accepted range.",
      ruleTeamByVertical.pool
    ],
    [
      "Parking occupancy alert",
      "parking",
      "telemetry",
      "occupancy",
      "gt",
      0,
      null,
      "warning",
      null,
      "create_task",
      "Parking occupancy enforcement check",
      "Automatic enforcement task created because the occupancy signal exceeded the configured threshold.",
      ruleTeamByVertical.parking
    ],
    [
      "Fire pressure drop",
      "fire",
      "telemetry",
      "pressure",
      "lt",
      20,
      null,
      "critical",
      null,
      "create_task",
      "Fire asset pressure check required",
      "Automatic corrective task created because extinguisher pressure fell below threshold.",
      ruleTeamByVertical.fire
    ],
    [
      "Escalate overdue fire work",
      "fire",
      "task_overdue",
      null,
      "any",
      null,
      null,
      null,
      "pending",
      "mark_overdue",
      "Fire task overdue",
      "A scheduled fire operations task is overdue and requires immediate follow-up.",
      ruleTeamByVertical.fire
    ],
    [
      "Escalate overdue parking work",
      "parking",
      "task_overdue",
      null,
      "any",
      null,
      null,
      null,
      "pending",
      "mark_overdue",
      "Parking task overdue",
      "A scheduled parking operations task is overdue and requires dispatcher attention.",
      ruleTeamByVertical.parking
    ],
    [
      "Escalate overdue pool work",
      "pool",
      "task_overdue",
      null,
      "any",
      null,
      null,
      null,
      "pending",
      "mark_overdue",
      "Pool task overdue",
      "A scheduled pool operations task is overdue and requires immediate review.",
      ruleTeamByVertical.pool
    ]
  ];

  for (const [
    name,
    vertical,
    triggerSource,
    eventType,
    comparator,
    thresholdMin,
    thresholdMax,
    severityFilter,
    taskStatus,
    actionType,
    actionTitle,
    actionMessage,
    targetTeamId
  ] of rules) {
    await query(
      `INSERT INTO automation_rules (
         org_id, name, vertical, trigger_source, event_type, comparator, threshold_min, threshold_max,
         severity_filter, task_status, action_type, action_title, action_message, target_team_id, enabled
       )
       SELECT $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, TRUE
       WHERE NOT EXISTS (
         SELECT 1 FROM automation_rules WHERE org_id = $1 AND name = $2
       )`,
      [
        orgId,
        name,
        vertical,
        triggerSource,
        eventType,
        comparator,
        thresholdMin,
        thresholdMax,
        severityFilter,
        taskStatus,
        actionType,
        actionTitle,
        actionMessage,
        targetTeamId ?? null
      ]
    );
  }

  const notificationPolicies = [
    ["Rule email to managers", "rule", "email", "manager", 0, 1],
    ["Rule slack alert", "rule", "slack", "manager", 0, 1],
    ["Escalation sms to managers", "escalation", "sms", "manager", 5, 2],
    ["Telemetry email digest", "telemetry", "email", "manager", 0, 1]
  ];

  for (const [name, notificationType, channel, targetRole, delayMinutes, repeatCount] of notificationPolicies) {
    await query(
      `INSERT INTO notification_policies (org_id, name, notification_type, channel, target_role, delay_minutes, repeat_count, enabled)
       SELECT $1, $2, $3, $4, $5, $6, $7, TRUE
       WHERE NOT EXISTS (
         SELECT 1 FROM notification_policies WHERE org_id = $1 AND name = $2
       )`,
      [orgId, name, notificationType, channel, targetRole, delayMinutes, repeatCount]
    );
  }
}

seed()
  .then(async () => {
    await pool.end();
    console.log("Seed completed");
    if (generatedPasswords.length) {
      console.log("Generated demo credentials (shown once; set SEED_*_PASSWORD to choose your own):");
      for (const { email, password } of generatedPasswords) {
        console.log(`  ${email}  ${password}`);
      }
    }
  })
  .catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });
