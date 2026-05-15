# Security Policy

## Public Repository Rules

Do not commit real production secrets to this repository.

Never publish:

- `.env` files
- database passwords
- JWT secrets
- Hetzner API tokens
- SSH private keys
- Gmail app passwords or SMTP credentials
- Grafana or Nginx Proxy Manager admin passwords
- production database dumps
- backup archives
- uploaded customer evidence/photos
- Android signing keystores
- generated APK/AAB files unless intentionally released

Use `.env.example` for safe placeholder values.

## If A Secret Is Exposed

Deleting the file is not enough if it was committed. Rotate the secret immediately and clean the Git history before making the repository public.

Secrets to rotate after exposure include:

- VPS/root access credentials
- database passwords
- JWT signing secrets
- SMTP app passwords
- Hetzner API tokens
- Grafana/Nginx Proxy Manager credentials
- Android release keystores

## Reporting

This is a portfolio/demo project. If you find a security issue, open a private discussion with the repository owner rather than posting live credentials or exploit details publicly.
