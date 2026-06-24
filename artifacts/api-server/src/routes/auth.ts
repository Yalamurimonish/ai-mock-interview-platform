import { Router, type IRouter } from "express";
import { db, isDatabaseConfigured, sessionsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import {
  hashPassword,
  verifyPassword,
  createSession,
  requireAuth,
  getUser,
} from "../lib/auth";
import * as devStore from "../lib/dev-store";

const router: IRouter = Router();

function serializeUser(user: {
  id: number;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  targetRole: string | null;
  experienceLevel: string | null;
  createdAt: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
    targetRole: user.targetRole,
    experienceLevel: user.experienceLevel,
    createdAt: user.createdAt.toISOString(),
  };
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, email, password } = parsed.data;

  if (!isDatabaseConfigured || !db) {
    const result = devStore.devRegister(name, email, password);
    if ("error" in result) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(201).json({
      user: serializeUser(result.user),
      token: result.token,
    });
    return;
  }

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(400).json({ error: "Email already in use" });
    return;
  }

  const [user] = await db
    .insert(usersTable)
    .values({ name, email, passwordHash: hashPassword(password), role: "user" })
    .returning();

  const token = await createSession(user.id);
  res.status(201).json({ user: serializeUser(user), token });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;

  if (!isDatabaseConfigured || !db) {
    const result = devStore.devLogin(email, password);
    if (!result) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    res.json({ user: serializeUser(result.user), token: result.token });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user || !verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = await createSession(user.id);
  res.json({ user: serializeUser(user), token });
});

router.post("/auth/logout", requireAuth, async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (token) {
    if (!isDatabaseConfigured || !db) {
      devStore.devLogout(token);
    } else {
      await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
    }
  }
  res.json({ ok: true });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  res.json(serializeUser(user));
});

export default router;
