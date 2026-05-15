import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { config } from "./config.js";

export interface SessionUser {
  id: string;
  orgId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  customerId?: string | null;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signToken(user: SessionUser) {
  return jwt.sign(user, config.jwtSecret, { expiresIn: "7d" });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, config.jwtSecret) as SessionUser;
    if (payload.role === "viewer" && req.method !== "GET") {
      return res.status(403).json({ error: "Viewer accounts are read-only" });
    }
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}
