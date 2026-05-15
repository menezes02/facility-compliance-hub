# OperationHub Commercial Case Study

## Summary

OperationHub is a multi-tenant operations and compliance platform designed for the Irish commercial buildings market. It helps facilities teams digitize recurring checks across fire safety, parking operations, and swimming pool compliance.

The project demonstrates how one platform can support multiple operational verticals through shared infrastructure, shared data models, and vertical-specific workflows.

## Market Problem

Many building operations teams still depend on a mix of:

- Paper inspection sheets.
- WhatsApp messages.
- Spreadsheets.
- Contractor emails.
- Photos stored outside the workflow.
- Manual report preparation before audits.

This creates operational risk because evidence is fragmented. When an incident, audit, insurance review, or compliance question appears, managers need to prove what happened quickly.

## Target Market

The platform is aimed at:

- Commercial office buildings.
- Enterprise campuses.
- Hotels and leisure centres.
- Shopping centres.
- Apartment complexes.
- Facilities management providers.
- Fire safety contractors.
- Parking and pool operators.

## Product Concept

OperationHub provides one operating system for recurring building checks.

Managers use the web dashboard to create and review work. Field workers use the Android APK to complete checklist tasks and capture evidence. The backend stores submissions, audit history, and reportable compliance data.

## Vertical Workflows

### Fire Safety

- Daily extinguisher inspection.
- Emergency exit route checks.
- Photo evidence of gauges and access paths.
- Failed checklist evidence can create corrective tasks.

### Parking

- Morning patrol rounds.
- Barrier and signage checks.
- Disabled bay availability.
- EV charger readiness checks.

### Swimming Pool

- Water quality tests.
- pH, chlorine, and temperature capture.
- Poolside safety walks.
- Corrective tasks for unsafe readings.

## Platform Capabilities

- Multi-tenant organization model.
- Role-based web access.
- Manager dashboard.
- Native Android field app.
- Checklist templates.
- Task lifecycle and review workflow.
- Evidence submission with notes and photos.
- Corrective task creation.
- Sites, assets, customers, contracts, teams, users.
- Audit logs.
- Compliance exports.
- Prometheus metrics.
- Grafana dashboards.
- Dockerized deployment.
- Backup and restore automation.

## Technical Architecture

```text
React Web Dashboard
Native Android Field APK
        |
Node.js / Express API
        |
PostgreSQL
        |
Docker Compose
        |
Nginx Proxy Manager
        |
Prometheus / Grafana / Backup Scripts
```

## Platform Engineering Highlights

- Built as a multi-service containerized system.
- Uses PostgreSQL as the source of truth.
- Uses organization-aware queries for tenant separation.
- Provides Prometheus `/metrics` and Grafana dashboards.
- Includes operational backup and restore scripts.
- Supports mobile field workflows through a real installable APK.
- Keeps secrets out of source through environment examples and security documentation.

## Commercial Value Proposition

OperationHub helps facilities teams:

- Prove checks were completed.
- Reduce paper-based operational risk.
- Respond faster to failed inspections.
- Improve visibility across sites and contractors.
- Prepare audit evidence without manual searching.
- Standardize workflows across different building services.

## Interview Pitch

I built OperationHub as a production-style platform engineering project for commercial building operations. The goal was to demonstrate more than CRUD development: multi-tenancy, mobile field workflows, evidence capture, auditability, monitoring, backups, and containerized deployment.

The commercial angle is the Irish facilities market, where fire safety, parking, and pool compliance checks require repeatable proof. OperationHub shows how one platform can support several verticals with shared infrastructure and vertical-specific workflows.

## Demo Script

1. Show the web dashboard with FireOps, ParkOps, and PoolOps active.
2. Open the Android APK as a worker.
3. Complete a checklist with evidence.
4. Show the evidence arriving in the web dashboard.
5. Review and approve the submitted task as a manager.
6. Show audit/reporting capability.
7. Show Grafana dashboards and backup scripts as operational proof.

## Roadmap

- Signed release APK.
- Offline mobile submission queue.
- SSO and granular RBAC.
- Immutable audit log storage.
- Customer-facing portal polish.
- Stripe billing for SaaS packaging.
- Sensor integrations for telemetry-driven tasks.
- CI/CD deployment pipeline.
