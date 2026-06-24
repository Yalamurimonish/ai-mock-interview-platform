import { db, isDatabaseConfigured, sessionsTable, usersTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";
import * as devStore from "./dev-store";
import { generateToken } from "./password";

export { hashPassword, verifyPassword, generateToken } from "./password";

export async function createSession(userId: number): Promise<string> {
  if (!isDatabaseConfigured || !db) {
    throw new Error("createSession requires DATABASE_URL when using PostgreSQL");
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(sessionsTable).values({ userId, token, expiresAt });
  return token;
}

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: typeof usersTable.$inferSelect;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!isDatabaseConfigured || !db) {
    const user = devStore.devGetUserByToken(token);
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    req.user = user;
    next();
    return;
  }

  try {
    const [session] = await db
      .select()
      .from(sessionsTable)
      .where(
        and(eq(sessionsTable.token, token), gt(sessionsTable.expiresAt, new Date())),
      );

    if (!session) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, session.userId));

    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    req.user = user;
    next();
  } catch {
    const user = devStore.devGetUserByToken(token);
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    req.user = user;
    next();
  }
}

export function getUser(req: Request) {
  if (!req.user) throw new Error("User not found on request");
  return req.user;
}
