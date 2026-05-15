# GitHub Publication Checklist

Use this checklist before making OperationHub public.

## Must Not Be Public

- Real `.env` files
- Production passwords or API tokens
- VPS/root credentials
- SSH private keys
- Hetzner API tokens
- Gmail app passwords
- Grafana admin credentials
- Nginx Proxy Manager credentials
- PostgreSQL dumps or backup archives
- Uploaded evidence files or customer photos
- Android release keystore files
- Generated APK/AAB files unless intentionally published as releases

## High-Risk References Found In This Workspace

These are not printed here as values. Review and sanitize the relevant files before publishing:

- Production domain references in web/mobile/API configuration.
- Demo login credentials in seed/demo documentation.
- Placeholder passwords in Docker Compose defaults.
- Generated Android debug keystore.
- Generated APK build output.
- API uploads directory.
- Compiled `dist` folders.

## Recommended Public Repo Shape

Publish:

- Source code
- Safe `.env.example`
- Docker Compose with environment-variable placeholders
- Architecture docs
- Case study docs
- Screenshots with no private customer data

Do not publish:

- Real deployment state
- Live database data
- Live uploaded evidence
- Server access details
- Private keys
- Production backup files

## Secret Rotation Before Public Launch

Rotate these before going public if they were ever used in files, terminal history, chat, screenshots, or APKs:

- VPS root password
- Production app user passwords
- PostgreSQL password
- JWT secret
- Grafana admin password
- Nginx Proxy Manager password
- SMTP/Gmail app password
- Hetzner API token

## Suggested Public Wording

Use a portfolio-safe deployment line:

> Production-style deployment tested on a Hetzner VPS behind Nginx Proxy Manager.

Avoid publishing exact server access details or administrative credentials.
