import { Router, type IRouter } from "express";
import { db, isDatabaseConfigured, usersTable, interviewsTable } from "@workspace/db";
import * as devStore from "../lib/dev-store";
import { eq, and, sql, avg, count, max } from "drizzle-orm";
import { UpdateProfileBody } from "@workspace/api-zod";
import { requireAuth, getUser } from "../lib/auth";

const router: IRouter = Router();

router.patch("/users/profile", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (!isDatabaseConfigured || !db) {
    res.status(501).json({ error: "Profile updates require DATABASE_URL" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set(parsed.data)
    .where(eq(usersTable.id, user.id))
    .returning();

  res.json({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    role: updated.role,
    avatarUrl: updated.avatarUrl,
    targetRole: updated.targetRole,
    experienceLevel: updated.experienceLevel,
    createdAt: updated.createdAt.toISOString(),
  });
});

router.get("/users/stats", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);

  if (!isDatabaseConfigured || !db) {
    res.json(devStore.devGetUserStats(user.id));
    return;
  }

  const [stats] = await db
    .select({
      totalInterviews: count(),
      completedInterviews: sql<number>`count(*) filter (where ${interviewsTable.status} = 'completed')`,
      averageScore: avg(interviewsTable.overallScore),
      bestScore: max(interviewsTable.overallScore),
    })
    .from(interviewsTable)
    .where(eq(interviewsTable.userId, user.id));

  const totalHours = ((stats?.totalInterviews ?? 0) * 15) / 60;

  res.json({
    totalInterviews: stats?.totalInterviews ?? 0,
    completedInterviews: Number(stats?.completedInterviews ?? 0),
    averageScore: stats?.averageScore ? parseFloat(String(stats.averageScore)) : 0,
    currentStreak: 0,
    totalHours: parseFloat(totalHours.toFixed(1)),
    bestScore: stats?.bestScore ? parseFloat(String(stats.bestScore)) : null,
    recentImprovement: null,
  });
});

export default router;
