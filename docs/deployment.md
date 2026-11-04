# Deployment

## Target

- Domain: `operations.example.com`
- Host: Hetzner Cloud

## Containerized proxy option

The stack also supports `Nginx Proxy Manager`:

- Admin UI: `http://SERVER_IP:81`
- First login: follow the Nginx Proxy Manager documentation for its initial account and change it immediately
- Proxy target for Facility Compliance Hub web: `http://SERVER_IP:5173`
- Proxy target for Facility Compliance Hub API: `http://SERVER_IP:5000`

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
cp apps/api/.env.example apps/api/.env       # set DATABASE_URL and JWT_SECRET
cp infra/docker/.env.example infra/docker/.env   # fill in every empty value
npm install
docker compose -f infra/docker/docker-compose.yml --env-file infra/docker/.env up -d
```

The API container seeds the schema and default workspace automatically on startup. Compose refuses to start while required secrets are empty, and the API refuses to start with a missing or weak `JWT_SECRET`.

Set `APP_URL` and `CORS_ORIGINS` to the public origin(s) of the web app (for example `https://operations.example.com`); browser requests from any other origin are rejected.

## Nginx

Copy `infra/nginx/operationhub.conf` to `/etc/nginx/sites-available/operationhub`, enable it, and reload nginx.

If you use `Nginx Proxy Manager`, you can skip host-level nginx entirely and manage the domain through the container UI instead.

## SSL

```bash
sudo certbot --nginx -d operations.example.com
```

## Default access

- Web login: `admin@example.com`
- Password: the value of `SEED_ADMIN_PASSWORD`, or the generated one printed once by `docker compose logs api` on first start
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
