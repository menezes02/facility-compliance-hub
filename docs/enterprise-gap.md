# Enterprise Gap and Showcase Model

Facility Compliance Hub is currently a functional showcase of a Taskmaster-style operating environment: one shared platform, multiple vertical products, compliance evidence, customer scoping, monitoring, and recoverability.

## Current Capability

| Area | Status | Notes |
| --- | --- | --- |
| Multi-tenant workspace | Built | Organization-scoped data model with customer scoping for viewer users. |
| Vertical products | Built | FireOps, ParkOps, and PoolOps share the same platform with different templates and operating assets. |
| Task lifecycle | Built | Create, start, submit evidence, await review, approve, reopen, close, overdue. |
| Checklist templates | Built | Required fields, checkbox, number, text, choice, photo evidence prompts. |
| Corrective actions | Built | Failed checklist evidence can create child corrective tasks automatically. |
| Customer/auditor portal | Built | Viewer role is read-only and scoped to its assigned customer. |
| Evidence management | Built | Submission payloads, notes, uploaded evidence, generated reports. |
| Compliance reporting | Built | PDF reports, CSV exports, report history. |
| Audit trail | Built | Important platform actions are recorded with user, resource, and details. |
| Monitoring | Built | Prometheus, Grafana, Postgres exporter, cAdvisor, node-exporter. |
| Backup/restore | Built | Database plus uploaded evidence archive, restore script, runbook. |
| Android app | Deferred | Planned last for Pixel 6 testing. |

## Enterprise Gaps

| Area | Gap | Priority |
| --- | --- | --- |
| SSO/SAML/OIDC | Enterprise customers expect identity provider integration and enforceable MFA. | High |
| Fine-grained RBAC | Current roles are broad; enterprise needs permission policies per module, customer, site, team, and action. | High |
| Offline mobile sync | Field workers need resilient offline queues, conflict handling, and retry visibility. | High |
| SLA escalation engine | Current notification policies are basic; enterprise needs escalation ladders, business hours, on-call schedules, and acknowledgement deadlines. | High |
| Sensor ingestion contracts | Simulated telemetry exists; enterprise needs stable device API keys, webhook ingestion, deduplication, and replay protection. | High |
| Tenant administration | Needs subscription plans, tenant lifecycle, quotas, billing status, and tenant-level configuration. | Medium |
| Immutable audit retention | Current audit is queryable; enterprise needs retention policies, tamper-evident exports, and legal hold controls. | Medium |
| File storage backend | Local uploads work for single server; enterprise should move evidence/reports to S3-compatible object storage. | Medium |
| Alerting from Grafana | Dashboards exist; enterprise should add alert rules for API down, DB down, disk pressure, and high 5xx rate. | Medium |
| CI/CD hardening | Needs migration checks, test gates, image build pipeline, rollback strategy, and environment promotion. | Medium |
| Secrets management | Current demo uses env vars; enterprise should use Vault, SOPS, or cloud secret manager. | Medium |
| DR drills | Backup script exists; enterprise needs scheduled restore tests and documented RTO/RPO evidence. | Medium |
| White-label packaging | Vertical skins exist conceptually; enterprise needs tenant-specific branding, domains, email templates, and report branding. | Low |

## Recommended Build Order

1. Finish web/platform showcase and demo script.
2. Add Grafana alerts and backup cron.
3. Build Android field-worker app.
4. Add offline queue and photo sync.
5. Add SSO/OIDC and stronger RBAC.
6. Add sensor API key ingestion model.
7. Move uploads/reports to S3-compatible storage.
8. Add billing/tenant administration.

## Interview Narrative

The important architectural point is that FireOps, ParkOps, and PoolOps are not separate apps. They are vertical configurations on one platform:

- Same data model: organizations, customers, sites, assets, devices, tasks, submissions, reports.
- Same workflow engine: schedule, assign, execute, review, correct, prove.
- Same platform operations: metrics, dashboards, backups, restore, proxy, containers.
- Different product surfaces: templates, terminology, reports, assets, telemetry rules.

That is the core Taskmaster-style environment this project demonstrates.
