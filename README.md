# Facility Compliance Hub

Commercial operations and compliance platform for Irish commercial buildings.

Facility Compliance Hub is a multi-tenant SaaS-style platform for facilities teams managing recurring operational checks across fire safety, parking, and swimming pool environments. It replaces paper logs, spreadsheets, and fragmented contractor updates with one workflow for assigning work, collecting mobile evidence, reviewing submissions, and generating audit-ready records.

## Commercial Positioning

Irish commercial and enterprise buildings need repeatable proof that operational checks are being completed correctly. Facility managers often need to answer questions like:

- Were fire safety checks completed today?
- Was the parking area inspected before opening?
- Were pool water readings captured and reviewed?
- Who completed the work, when, and with what evidence?
- Can we prove this quickly during an audit, insurance review, or incident investigation?

Facility Compliance Hub answers those questions with a web dashboard for managers, a native Android APK for field workers, and a PostgreSQL-backed audit trail.

## Target Users

- Facilities management companies
- Office and enterprise buildings
- Hotels and leisure centres
- Shopping centres and retail parks
- Apartment and mixed-use developments
- Fire safety contractors
- Parking operators
- Pool and leisure operators

## Product Modules

- FireOps: extinguisher inspections, exit route checks, corrective actions.
- ParkOps: parking patrols, barrier checks, disabled bay checks, EV charger readiness.
- PoolOps: water quality checks, poolside safety walks, chemistry correction tasks.

The key platform idea is one backend with multiple vertical workflows. Fire, parking, and pool operations share the same task, evidence, audit, reporting, user, site, asset, and monitoring foundations.

## What The Platform Does

- Creates recurring and one-off operational tasks.
- Assigns work by site, asset, team, and user.
- Provides checklist templates by vertical.
- Lets field workers submit evidence from Android.
- Captures checklist answers, notes, timestamps, and photo evidence.
- Moves submitted work into manager review.
- Creates corrective tasks when failed checklist evidence is detected.
- Tracks customers, contracts, sites, assets, users, teams, devices, and telemetry events.
- Produces compliance exports and report history.
- Exposes Prometheus metrics and Grafana dashboards.
- Includes backup and restore scripts for operational resilience.

## Commercial Value

- Reduces dependency on paper logs and informal messaging.
- Gives managers live visibility across multiple sites.
- Creates defensible evidence for audits and insurance reviews.
- Improves response time when a check fails.
- Supports multi-site and multi-customer operating models.
- Demonstrates an enterprise-ready platform pattern without requiring separate products per vertical.

## Architecture

```text
Android Field APK
       |
React Web Dashboard
       |
Node.js / Express API
       |
PostgreSQL + Upload Storage
       |
Prometheus + Grafana + Backups
       |
Docker / Nginx Proxy Manager / Hetzner-style VPS deployment
```

## Tech Stack

- Backend: Node.js, Express, TypeScript, PostgreSQL.
- Web: React, TypeScript, Vite.
- Mobile: Native Android APK plus Expo prototype.
- Infrastructure: Docker Compose, Nginx Proxy Manager, backup scripts.
- Observability: Prometheus, Grafana, postgres-exporter, node-exporter, cAdvisor.
- Security model: organization-aware data access, roles, audit logs, environment-based secrets.

## Repository Structure

- `apps/api`: Express + PostgreSQL backend.
- `apps/web`: React manager dashboard.
- `apps/field-apk`: native Android field-worker APK.
- `apps/mobile`: Expo mobile prototype.
- `packages/shared`: shared types.
- `packages/verticals`: FireOps, ParkOps, PoolOps template definitions.
- `infra`: Docker, Nginx, backups, observability.
- `docs`: deployment, backup, enterprise roadmap, and publication safety notes.

## Demo Flow

1. Manager opens the web dashboard and reviews active FireOps, ParkOps, and PoolOps tasks.
2. Field worker opens the Android APK and selects a task.
3. Worker completes checklist fields and attaches photo evidence.
4. API stores the submission, updates task status to `awaiting_review`, and logs evidence.
5. Manager reviews the task and either approves it or reopens it.
6. Compliance evidence remains available for audit and reporting.
7. Grafana shows operational health of the platform.

## Quick Start

```bash
npm install
cp .env.example .env
docker compose -f infra/docker/docker-compose.yml up -d db
npm --workspace @operationhub/api run seed
npm run dev
```

Default seeded local demo credentials:

- Admin: `admin@example.com` / `DemoAdmin2026!`
- Manager: `manager@example.com` / `DemoManager2026!`
- Worker: `worker@example.com` / `DemoWorker2026!`

These are public demo credentials only. Replace them before any real deployment.

## Documentation

- `docs/commercial-case-study.md`: commercial portfolio case study.
- `docs/deployment.md`: deployment notes.
- `docs/backup-restore.md`: backup and restore runbook.
- `docs/enterprise-gap.md`: enterprise readiness roadmap.
- `SECURITY.md`: public repository safety rules.

## Portfolio Note

This project was built as a production-style platform engineering showcase: web app, API, database, mobile APK, monitoring, backup/restore, containerized deployment, and multi-vertical commercial workflow design.

It is intentionally positioned as a commercial building operations platform, not a generic task manager.
