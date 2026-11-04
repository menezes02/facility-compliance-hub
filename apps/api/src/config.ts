import dotenv from "dotenv";
import path from "node:path";

dotenv.config();

/**
 * Fail fast on missing or weak secrets. The API must never start with a
 * guessable signing key or with database credentials baked into the source.
 */
function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable ${name}. See .env.example.`);
  }
  return value;
}

function requireJwtSecret(): string {
  const secret = requireEnv("JWT_SECRET");
  if (secret.length < 32 || /change-?me|secret|password/i.test(secret)) {
    throw new Error(
      "JWT_SECRET must be at least 32 characters and must not be a placeholder. " +
        "Generate one with: openssl rand -base64 48"
    );
  }
  return secret;
}

function parseOrigins(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

const appUrl = (process.env.APP_URL ?? "http://localhost:5173").replace(/\/$/, "");

export const config = {
  port: Number(process.env.PORT ?? 5000),
  databaseUrl: requireEnv("DATABASE_URL"),
  jwtSecret: requireJwtSecret(),
  appUrl,
  // Browser origins allowed to call the API (the web app plus anything listed in CORS_ORIGINS).
  corsOrigins: Array.from(new Set([new URL(appUrl).origin, ...parseOrigins(process.env.CORS_ORIGINS)])),
  uploadDir: path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? "uploads"),
  defaultDomain: process.env.DEFAULT_DOMAIN ?? "localhost",
  smtp: {
    enabled: process.env.SMTP_ENABLED === "true",
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: process.env.SMTP_SECURE !== "false",
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER
  }
};
