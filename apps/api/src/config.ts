import dotenv from "dotenv";
import path from "node:path";

dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 5000),
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgres://operationhub:operationhub@localhost:5432/operationhub",
  jwtSecret: process.env.JWT_SECRET ?? "change-me",
  appUrl: process.env.APP_URL ?? "http://localhost:5173",
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
