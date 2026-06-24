import { Router, type IRouter } from "express";
import {
  db,
  isDatabaseConfigured,
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
import Anthropic from "@anthropic-ai/sdk";

const router: IRouter = Router();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

async function generateAIFeedbackScores(questions: Array<{ text: string; userAnswer: string | null; score: number | null }>) {
  try {
    const answeredQuestions = questions.filter(q => q.userAnswer && q.score !== null);
    if (answeredQuestions.length === 0) {
      return { communicationScore: 70, technicalScore: 70, confidenceScore: 70, improvementTips: "Complete more interviews for detailed feedback." };
    }

    const questionsText = answeredQuestions.map((q, i) => 
      `Q${i + 1}: ${q.text}\nA: ${q.userAnswer}\nScore: ${q.score}`
    ).join("\n\n");

    const message = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Analyze these interview Q&A pairs and provide:
1. Communication score (0-100) based on clarity, articulation, and structure
2. Technical score (0-100) based on technical accuracy and depth
3. Confidence score (0-100) based on certainty and composure
4. 2-3 specific improvement tips

Interview Q&A:
${questionsText}

Respond in JSON format with this structure:
{
  "communicationScore": number,
  "technicalScore": number,
  "confidenceScore": number,
  "improvementTips": string
}`,
        },
      ],
    });

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return {
      communicationScore: 75,
      technicalScore: 75,
      confidenceScore: 75,
      improvementTips: "Good performance overall. Focus on being more specific in your answers.",
    };
  } catch (error) {
    console.error("AI feedback generation failed:", error);
    return {
      communicationScore: 70,
      technicalScore: 70,
      confidenceScore: 70,
      improvementTips: "Unable to generate AI feedback. Please try again later.",
    };
  }
}

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

  const [interview] = await db
    .insert(interviewsTable)
    .values({
      userId: user.id,
      title,
      type,
      difficulty,
      status: "pending",
      targetRole: targetRole ?? null,
      questionCount,
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

  // Get resume content if attached
  let resumeContent: string | null = null;
  if (interview.resumeId) {
    const [resume] = await db.select().from(resumesTable).where(eq(resumesTable.id, interview.resumeId));
    resumeContent = resume?.content ?? null;
  }

  // Generate questions with AI
  try {
    const generatedQuestions = await generateInterviewQuestions(
      interview.type,
      interview.difficulty,
      interview.targetRole,
      interview.questionCount,
      resumeContent
    );

    await db.insert(questionsTable).values(
      generatedQuestions.map((q, i) => ({
        interviewId: interview.id,
        text: q.text,
        type: q.type,
        orderIndex: i,
        hint: q.hint ?? null,
        isAnswered: false,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to generate questions, using fallback");
    // Insert fallback questions
    const fallbackTypes = ["technical", "behavioral", "situational"] as const;
    await db.insert(questionsTable).values(
      Array.from({ length: interview.questionCount }, (_, i) => ({
        interviewId: interview.id,
        text: `Tell me about your experience with ${interview.type === "technical" ? "coding and problem solving" : "working in teams"} (question ${i + 1}).`,
        type: fallbackTypes[i % 3],
        orderIndex: i,
        isAnswered: false,
      }))
    );
  }

  const [updated] = await db
    .update(interviewsTable)
    .set({ status: "in_progress", startedAt: new Date() })
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
  const durationMs = Date.now() - startedAt.getTime();
  const durationMinutes = Math.round(durationMs / 60000);

  // Generate AI feedback scores
  const aiFeedback = await generateAIFeedbackScores(
    questions.map(q => ({ text: q.text, userAnswer: q.userAnswer, score: q.score }))
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
    .where(eq(questionsTable.interviewId, interview.id));

  const analysis = await generateInterviewAnalysis(
    questions.map((q) => ({
      text: q.text,
      userAnswer: q.userAnswer,
      score: q.score,
      type: q.type,
    }))
  );

  res.json({
    interviewId: interview.id,
    overallScore: interview.overallScore ?? 0,
    ...analysis,
  });
});

// Questions
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

  let evaluation = { score: 70, feedback: "Good answer.", strengths: ["Clear"], improvements: ["More detail"] };
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

  // Update answered count
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
