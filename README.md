# OperationHub

OperationHub is a multi-tenant operations platform with shared core workflows and vertical packs for:

- Fire safety inspections
- Smart parking rounds
- Swimming pool water quality checks

This repository contains:

- `apps/api`: Express + PostgreSQL backend
- `apps/web`: React admin dashboard
- `apps/mobile`: Expo Android app for field operators
- `packages/shared`: shared types and constants
- `packages/verticals`: default vertical templates and branding
- `infra`: Docker Compose, Nginx, deployment examples

## Included observability

- `GET /health` for uptime checks
- `GET /metrics` for Prometheus scraping
- Prometheus in Docker Compose on port `9090`
- Grafana in Docker Compose on port `3001`
- Platform dashboards for API, containers, host, and PostgreSQL metrics

## Backup and restore

- `infra/backup/backup.sh` creates a PostgreSQL + uploads archive
- `infra/backup/restore.sh --confirm <archive>` restores database and evidence files
- See `docs/backup-restore.md` for the operational runbook

## Enterprise roadmap

- See `docs/enterprise-gap.md` for the current capability map, remaining enterprise gaps, and recommended build order

## Reverse proxy options

- Current lightweight path: host Nginx
- Containerized option: Nginx Proxy Manager on port `81`

## Deployment target

- Production-style target: Hetzner Cloud VPS
- Reverse proxy: Nginx Proxy Manager
- Domain: configure your own subdomain, for example `operations.example.com`

## Quick start

```bash
npm install
cp apps/api/.env.example apps/api/.env
docker compose -f infra/docker/docker-compose.yml up -d db
npm --workspace @operationhub/api run seed
npm run dev
```

Default seeded local login:

- Email: `admin@example.com`
- Password: `DemoAdmin2026!`

Do not reuse local seed credentials in a public or production deployment.

## MVP scope

- Organization-aware authentication
- Tasks, checklist templates, submissions
- Seeded packs for fire, parking, and pool
- Web dashboard for managers
- Android-ready mobile app for field workers

## Publishing safely

Before making this repository public, read:

- `SECURITY.md`
- `docs/github-publication-checklist.md`

The public repo should not include real `.env` files, database dumps, uploaded evidence, APK build outputs, Android signing keys, SSH keys, SMTP credentials, or production infrastructure credentials.
