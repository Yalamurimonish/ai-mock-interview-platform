import { Router, type IRouter } from "express";
import { db as database, interviewsTable, questionsTable } from "@workspace/db";
import { eq, and, desc, avg, count, sql } from "drizzle-orm";
import { GetScoreTrendQueryParams } from "@workspace/api-zod";
import { requireAuth, getUser } from "../lib/auth";

const router: IRouter = Router();
if (!database) {
  throw new Error("Database connection is not initialized");
}

const db = database;

router.get("/analytics/overview", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);

  const [stats] = await db
    .select({
      totalInterviews: count(),
      completedCount: sql<number>`count(*) filter (where ${interviewsTable.status} = 'completed')`,
      averageScore: avg(interviewsTable.overallScore),
    })
    .from(interviewsTable)
    .where(eq(interviewsTable.userId, user.id));

  const totalInterviews = stats?.totalInterviews ?? 0;
  const completedCount = Number(stats?.completedCount ?? 0);
  const averageScore = stats?.averageScore ? parseFloat(String(stats.averageScore)) : 0;
  const completionRate = totalInterviews > 0 ? (completedCount / totalInterviews) * 100 : 0;

  // Get skill scores from questions
  const questions = await db
    .select()
    .from(questionsTable)
    .where(
      sql`${questionsTable.interviewId} in (select id from interviews where user_id = ${user.id})`
    );

  const skillMap: Record<string, number[]> = {};
  questions.forEach((q) => {
    if (q.isAnswered && q.score != null) {
      if (!skillMap[q.type]) skillMap[q.type] = [];
      skillMap[q.type].push(q.score);
    }
  });

  const skillAvgs = Object.entries(skillMap).map(([type, scores]) => ({
    type,
    avg: scores.reduce((a, b) => a + b, 0) / scores.length,
  }));

  const topSkill = skillAvgs.sort((a, b) => b.avg - a.avg)[0]?.type ?? "Technical";
  const weakestSkill = skillAvgs[skillAvgs.length - 1]?.type ?? "Behavioral";

  res.json({
    totalInterviews,
    averageScore: parseFloat(averageScore.toFixed(1)),
    completionRate: parseFloat(completionRate.toFixed(1)),
    topSkill,
    weakestSkill,
    scoreThisWeek: averageScore > 0 ? parseFloat((averageScore + 2).toFixed(1)) : null,
    scoreLastWeek: averageScore > 0 ? parseFloat((averageScore - 2).toFixed(1)) : null,
  });
});

router.get("/analytics/scores", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const queryParams = GetScoreTrendQueryParams.safeParse(req.query);
  const days = queryParams.success ? (queryParams.data.days ?? 30) : 30;

  const interviews = await db
    .select()
    .from(interviewsTable)
    .where(
      and(
        eq(interviewsTable.userId, user.id),
        eq(interviewsTable.status, "completed"),
        sql`${interviewsTable.completedAt} >= now() - interval '${sql.raw(String(days))} days'`
      )
    )
    .orderBy(interviewsTable.completedAt);

  res.json(
    interviews
      .filter((i) => i.overallScore != null && i.completedAt != null)
      .map((i) => ({
        date: i.completedAt!.toISOString().split("T")[0],
        score: i.overallScore!,
        interviewId: i.id,
      }))
  );
});

router.get("/analytics/skills", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);

  const questions = await db
    .select()
    .from(questionsTable)
    .where(
      sql`${questionsTable.interviewId} in (select id from interviews where user_id = ${user.id})`
    );

  const typeLabels: Record<string, string> = {
    technical: "Technical",
    behavioral: "Behavioral",
    situational: "Situational",
    coding: "Coding",
  };

  const skillMap: Record<string, number[]> = {};
  questions.forEach((q) => {
    if (q.isAnswered && q.score != null) {
      const label = typeLabels[q.type] ?? q.type;
      if (!skillMap[label]) skillMap[label] = [];
      skillMap[label].push(q.score);
    }
  });

  const result = Object.entries(skillMap).map(([skill, scores]) => ({
    skill,
    score: parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)),
    maxScore: 100,
  }));

  // Ensure all skill categories always present
  const allSkills = ["Technical", "Behavioral", "Situational", "Coding"];
  const existing = new Set(result.map((r) => r.skill));
  allSkills.forEach((skill) => {
    if (!existing.has(skill)) {
      result.push({ skill, score: 0, maxScore: 100 });
    }
  });

  res.json(result);
});

router.get("/analytics/categories", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);

  const interviews = await db
    .select()
    .from(interviewsTable)
    .where(and(eq(interviewsTable.userId, user.id), eq(interviewsTable.status, "completed")));

  const categoryMap: Record<string, number[]> = {};
  interviews.forEach((i) => {
    if (i.overallScore != null) {
      if (!categoryMap[i.type]) categoryMap[i.type] = [];
      categoryMap[i.type].push(i.overallScore);
    }
  });

  const typeLabels: Record<string, string> = {
    technical: "Technical",
    behavioral: "Behavioral",
    system_design: "System Design",
    mixed: "Mixed",
  };

  const result = Object.entries(categoryMap).map(([cat, scores]) => ({
    category: typeLabels[cat] ?? cat,
    averageScore: parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)),
    count: scores.length,
  }));

  const allCategories = ["Technical", "Behavioral", "System Design", "Mixed"];
  const existing = new Set(result.map((r) => r.category));
  allCategories.forEach((category) => {
    if (!existing.has(category)) {
      result.push({ category, averageScore: 0, count: 0 });
    }
  });

  res.json(result);
});

export default router;
