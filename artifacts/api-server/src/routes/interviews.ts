import { Router, type IRouter } from "express";
import {
  db as database,
  interviewsTable,
  questionsTable,
  resumesTable,
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import {
  CreateInterviewBody,
  GetInterviewParams,
  DeleteInterviewParams,
  StartInterviewParams,
  CompleteInterviewParams,
  GetInterviewAnalysisParams,
  ListInterviewsQueryParams,
  ListInterviewQuestionsParams,
  SubmitAnswerParams,
  SubmitAnswerBody,
  GetNextQuestionParams,
} from "@workspace/api-zod";
import { requireAuth, getUser } from "../lib/auth";
import { generateInterviewQuestions, evaluateAnswer, generateInterviewAnalysis } from "../lib/ai";

const router: IRouter = Router();

if (!database) {
  throw new Error("Database connection is not initialized");
}

const db = database;

function serializeInterview(i: typeof interviewsTable.$inferSelect) {
  return {
    id: i.id,
    userId: i.userId,
    title: i.title,
    type: i.type,
    difficulty: i.difficulty,
    status: i.status,
    targetRole: i.targetRole,
    overallScore: i.overallScore,
    durationMinutes: i.durationMinutes,
    questionCount: i.questionCount,
    answeredCount: i.answeredCount,
    resumeId: i.resumeId,
    startedAt: i.startedAt?.toISOString() ?? null,
    completedAt: i.completedAt?.toISOString() ?? null,
    createdAt: i.createdAt.toISOString(),
    communicationScore: i.communicationScore,
    technicalScore: i.technicalScore,
    confidenceScore: i.confidenceScore,
    improvementTips: i.improvementTips,
  };
}

async function generateAIFeedbackScores(
  questions: Array<{ text: string; userAnswer: string | null; score: number | null }>,
) {
  const answeredQuestions = questions.filter((q) => q.userAnswer && q.score !== null);

  if (answeredQuestions.length === 0) {
    return {
      communicationScore: 70,
      technicalScore: 70,
      confidenceScore: 70,
      improvementTips: "Complete more interviews for detailed feedback.",
    };
  }

  const averageScore =
    answeredQuestions.reduce((sum, q) => sum + (q.score ?? 0), 0) / answeredQuestions.length;

  return {
    communicationScore: Math.min(100, Math.max(40, Math.round(averageScore + 5))),
    technicalScore: Math.min(100, Math.max(40, Math.round(averageScore))),
    confidenceScore: Math.min(100, Math.max(40, Math.round(averageScore - 3))),
    improvementTips:
      "Use structured answers, include specific examples, explain your decision-making clearly, and quantify the impact of your work.",
  };
}

router.get("/interviews", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const queryParams = ListInterviewsQueryParams.safeParse(req.query);

  let query = db
    .select()
    .from(interviewsTable)
    .where(eq(interviewsTable.userId, user.id))
    .orderBy(desc(interviewsTable.createdAt))
    .$dynamic();

  if (queryParams.success && queryParams.data.status) {
    query = db
      .select()
      .from(interviewsTable)
      .where(and(eq(interviewsTable.userId, user.id), eq(interviewsTable.status, queryParams.data.status)))
      .orderBy(desc(interviewsTable.createdAt))
      .$dynamic();
  }

  const interviews = await query;
  res.json(interviews.map(serializeInterview));
});

router.get("/interviews/recent", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);

  const interviews = await db
    .select()
    .from(interviewsTable)
    .where(eq(interviewsTable.userId, user.id))
    .orderBy(desc(interviewsTable.createdAt))
    .limit(5);

  res.json(interviews.map(serializeInterview));
});

router.post("/interviews", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const parsed = CreateInterviewBody.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { title, type, difficulty, targetRole, questionCount = 5, resumeId } = parsed.data;

  const safeQuestionCount = Math.max(3, Math.min(questionCount, 20));

  const [interview] = await db
    .insert(interviewsTable)
    .values({
      userId: user.id,
      title,
      type,
      difficulty,
      status: "pending",
      targetRole: targetRole ?? null,
      questionCount: safeQuestionCount,
      answeredCount: 0,
      resumeId: resumeId ?? null,
    })
    .returning();

  res.status(201).json(serializeInterview(interview));
});

router.get("/interviews/:id", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const params = GetInterviewParams.safeParse(req.params);

  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [interview] = await db
    .select()
    .from(interviewsTable)
    .where(and(eq(interviewsTable.id, params.data.id), eq(interviewsTable.userId, user.id)));

  if (!interview) {
    res.status(404).json({ error: "Interview not found" });
    return;
  }

  res.json(serializeInterview(interview));
});

router.delete("/interviews/:id", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const params = DeleteInterviewParams.safeParse(req.params);

  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [interview] = await db
    .delete(interviewsTable)
    .where(and(eq(interviewsTable.id, params.data.id), eq(interviewsTable.userId, user.id)))
    .returning();

  if (!interview) {
    res.status(404).json({ error: "Interview not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/interviews/:id/start", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const params = StartInterviewParams.safeParse(req.params);

  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [interview] = await db
    .select()
    .from(interviewsTable)
    .where(and(eq(interviewsTable.id, params.data.id), eq(interviewsTable.userId, user.id)));

  if (!interview) {
    res.status(404).json({ error: "Interview not found" });
    return;
  }

  const existingQuestions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.interviewId, interview.id))
    .orderBy(questionsTable.orderIndex);

  if (existingQuestions.length === 0) {
    let resumeContent: string | null = null;

    if (interview.resumeId) {
      const [resume] = await db
        .select()
        .from(resumesTable)
        .where(eq(resumesTable.id, interview.resumeId));

      resumeContent = resume?.content ?? null;
    }

    const generatedQuestions = await generateInterviewQuestions(
      interview.type,
      interview.difficulty,
      interview.targetRole,
      interview.questionCount,
      resumeContent,
    );

    await db.insert(questionsTable).values(
      generatedQuestions.map((q, index) => ({
        interviewId: interview.id,
        text: q.text,
        type: q.type,
        orderIndex: index,
        hint: q.hint ?? null,
        isAnswered: false,
      })),
    );
  }

  const [updated] = await db
    .update(interviewsTable)
    .set({
      status: "in_progress",
      startedAt: interview.startedAt ?? new Date(),
    })
    .where(eq(interviewsTable.id, interview.id))
    .returning();

  res.json(serializeInterview(updated));
});

router.post("/interviews/:id/complete", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const params = CompleteInterviewParams.safeParse(req.params);

  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [interview] = await db
    .select()
    .from(interviewsTable)
    .where(and(eq(interviewsTable.id, params.data.id), eq(interviewsTable.userId, user.id)));

  if (!interview) {
    res.status(404).json({ error: "Interview not found" });
    return;
  }

  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.interviewId, interview.id));

  const answeredQuestions = questions.filter((q) => q.isAnswered);
  const avgScore =
    answeredQuestions.length > 0
      ? answeredQuestions.reduce((sum, q) => sum + (q.score ?? 0), 0) / answeredQuestions.length
      : 0;

  const startedAt = interview.startedAt ?? new Date();
  const durationMinutes = Math.max(1, Math.round((Date.now() - startedAt.getTime()) / 60000));

  const aiFeedback = await generateAIFeedbackScores(
    questions.map((q) => ({
      text: q.text,
      userAnswer: q.userAnswer,
      score: q.score,
    })),
  );

  const [updated] = await db
    .update(interviewsTable)
    .set({
      status: "completed",
      completedAt: new Date(),
      overallScore: parseFloat(avgScore.toFixed(1)),
      answeredCount: answeredQuestions.length,
      durationMinutes,
      communicationScore: aiFeedback.communicationScore,
      technicalScore: aiFeedback.technicalScore,
      confidenceScore: aiFeedback.confidenceScore,
      improvementTips: aiFeedback.improvementTips,
    })
    .where(eq(interviewsTable.id, interview.id))
    .returning();

  res.json(serializeInterview(updated));
});

router.get("/interviews/:id/analysis", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const params = GetInterviewAnalysisParams.safeParse(req.params);

  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [interview] = await db
    .select()
    .from(interviewsTable)
    .where(and(eq(interviewsTable.id, params.data.id), eq(interviewsTable.userId, user.id)));

  if (!interview) {
    res.status(404).json({ error: "Interview not found" });
    return;
  }

  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.interviewId, interview.id))
    .orderBy(questionsTable.orderIndex);

  const analysis = await generateInterviewAnalysis(
    questions.map((q) => ({
      text: q.text,
      userAnswer: q.userAnswer,
      score: q.score,
      type: q.type,
    })),
  );

  res.json({
    interviewId: interview.id,
    overallScore: interview.overallScore ?? 0,
    ...analysis,
  });
});

router.get("/interviews/:id/questions", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const params = ListInterviewQuestionsParams.safeParse(req.params);

  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [interview] = await db
    .select()
    .from(interviewsTable)
    .where(and(eq(interviewsTable.id, params.data.id), eq(interviewsTable.userId, user.id)));

  if (!interview) {
    res.status(404).json({ error: "Interview not found" });
    return;
  }

  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.interviewId, interview.id))
    .orderBy(questionsTable.orderIndex);

  res.json(questions);
});

router.post("/interviews/:id/answer", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const params = SubmitAnswerParams.safeParse(req.params);

  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = SubmitAnswerBody.safeParse(req.body);

  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [interview] = await db
    .select()
    .from(interviewsTable)
    .where(and(eq(interviewsTable.id, params.data.id), eq(interviewsTable.userId, user.id)));

  if (!interview) {
    res.status(404).json({ error: "Interview not found" });
    return;
  }

  const [question] = await db
    .select()
    .from(questionsTable)
    .where(and(eq(questionsTable.id, body.data.questionId), eq(questionsTable.interviewId, interview.id)));

  if (!question) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  let evaluation = {
    score: 70,
    feedback: "Good answer. Try to add more examples and structure.",
    strengths: ["Clear attempt"],
    improvements: ["Add more detail"],
  };

  try {
    evaluation = await evaluateAnswer(question.text, body.data.answer, interview.difficulty, question.type);
  } catch (err) {
    req.log.error({ err }, "Failed to evaluate answer");
  }

  await db
    .update(questionsTable)
    .set({
      userAnswer: body.data.answer,
      score: evaluation.score,
      feedback: evaluation.feedback,
      strengths: JSON.stringify(evaluation.strengths),
      improvements: JSON.stringify(evaluation.improvements),
      isAnswered: true,
    })
    .where(eq(questionsTable.id, question.id));

  const answeredQuestions = await db
    .select()
    .from(questionsTable)
    .where(and(eq(questionsTable.interviewId, interview.id), eq(questionsTable.isAnswered, true)));

  await db
    .update(interviewsTable)
    .set({ answeredCount: answeredQuestions.length })
    .where(eq(interviewsTable.id, interview.id));

  res.json({
    questionId: question.id,
    score: evaluation.score,
    feedback: evaluation.feedback,
    strengths: evaluation.strengths,
    improvements: evaluation.improvements,
  });
});

router.post("/interviews/:id/next-question", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const params = GetNextQuestionParams.safeParse(req.params);

  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [interview] = await db
    .select()
    .from(interviewsTable)
    .where(and(eq(interviewsTable.id, params.data.id), eq(interviewsTable.userId, user.id)));

  if (!interview) {
    res.status(404).json({ error: "Interview not found" });
    return;
  }

  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.interviewId, interview.id))
    .orderBy(questionsTable.orderIndex);

  const nextQuestion = questions.find((q) => !q.isAnswered);

  if (!nextQuestion) {
    res.status(404).json({ error: "No more questions" });
    return;
  }

  res.json(nextQuestion);
});

export default router;