# Backup and Restore Runbook

Facility Compliance Hub stores compliance data in two places:

- PostgreSQL: organizations, users, tasks, submissions, audit logs, reports metadata.
- `apps/api/uploads`: evidence files, generated PDFs, and CSV exports.

The backup scripts package both into one timestamped archive.

## Create a Backup

From the project root on the server:

```bash
cd /opt/operationhub
./infra/backup/backup.sh
```

The archive is written to:

```text
/opt/operationhub/backups/operationhub-backup-YYYYmmddTHHMMSSZ.tar.gz
```

Default local retention is 14 days. Override it when needed:

```bash
RETENTION_DAYS=30 ./infra/backup/backup.sh
```

## Restore a Backup

Restores are destructive. The script stops the API, restores PostgreSQL, replaces uploaded evidence/report files, then starts the API again.

```bash
cd /opt/operationhub
./infra/backup/restore.sh --confirm ./backups/operationhub-backup-YYYYmmddTHHMMSSZ.tar.gz
```

## Verify After Restore

```bash
curl http://localhost:5000/health
docker compose -f infra/docker/docker-compose.yml ps api db
docker compose -f infra/docker/docker-compose.yml exec db psql -U operationhub -d operationhub -c "SELECT COUNT(*) FROM tasks;"
```

Then check the web app:

- Login works.
- Recent tasks and submissions are present.
- Evidence links open from task detail/report history.
- Compliance PDF generation still works.

## Suggested Cron

Daily backup at 02:15 UTC:

```cron
15 2 * * * cd /opt/operationhub && RETENTION_DAYS=14 ./infra/backup/backup.sh >> /var/log/operationhub-backup.log 2>&1
```

The repo includes a ready-to-install cron file:

```bash
sudo cp /opt/operationhub/infra/backup/operationhub-backup.cron /etc/cron.d/operationhub-backup
sudo chmod 0644 /etc/cron.d/operationhub-backup
```

Check backup logs:

```bash
sudo tail -n 50 /var/log/operationhub-backup.log
```

## Recovery Objectives

- RPO: 24 hours with daily backups.
- RTO: under 30 minutes for single-server restore.
- Restore priority: database first, uploads second, API/web health third.

## Off-Server Copy

For production, copy archives off the VPS after creation. Examples:

```bash
scp /opt/operationhub/backups/operationhub-backup-*.tar.gz user@backup-host:/backups/operationhub/
```

or use object storage with a dedicated backup user.
