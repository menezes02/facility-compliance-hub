# Deployment

## Target

- Domain: `operations.example.com`
- Host: Hetzner Cloud

## Containerized proxy option

The stack also supports `Nginx Proxy Manager`:

- Admin UI: `http://SERVER_IP:81`
- Default login: `admin@example.com` / `changeme`
- Proxy target for OperationHub web: `http://SERVER_IP:5173`
- Proxy target for OperationHub API: `http://SERVER_IP:5000`

## DNS

Create an `A` record:

- Host: `operations`
- Value: your Hetzner server IPv4

## Server bootstrap

```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-plugin nginx certbot python3-certbot-nginx
sudo usermod -aG docker $USER
```

## Run the stack

```bash
cd /opt
git clone <your-repo-url> operationhub
cd operationhub
cp apps/api/.env.example apps/api/.env
npm install
docker compose -f infra/docker/docker-compose.yml up -d
```

The API container seeds the schema and default workspace automatically on startup.

## Nginx

Copy `infra/nginx/operationhub.conf` to `/etc/nginx/sites-available/operationhub`, enable it, and reload nginx.

If you use `Nginx Proxy Manager`, you can skip host-level nginx entirely and manage the domain through the container UI instead.

## SSL

```bash
sudo certbot --nginx -d operations.example.com
```

## Default access

- Web login: `admin@example.com`
- Password: `change-me-before-production`
- Prometheus: `http://SERVER_IP:9090`
- Grafana: `http://SERVER_IP:3001` with your configured admin password

## Backup and restore

Create a backup:

```bash
cd /opt/operationhub
./infra/backup/backup.sh
```

Restore a backup:

```bash
cd /opt/operationhub
./infra/backup/restore.sh --confirm ./backups/<backup-file>.tar.gz
```

See `docs/backup-restore.md` for retention, verification, and cron guidance.
