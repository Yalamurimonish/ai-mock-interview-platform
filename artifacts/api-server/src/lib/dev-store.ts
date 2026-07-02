import type {
  interviewsTable,
  questionsTable,
  resumesTable,
  usersTable,
} from "@workspace/db";
import { hashPassword, verifyPassword, generateToken } from "./password";

type User = typeof usersTable.$inferSelect;
type Resume = typeof resumesTable.$inferSelect;
type Interview = typeof interviewsTable.$inferSelect;
type Question = typeof questionsTable.$inferSelect;

const usersByEmail = new Map<string, User>();
const sessionsByToken = new Map<string, { userId: number; expiresAt: Date }>();
const resumes: Resume[] = [];
const interviews: Interview[] = [];
const questions: Question[] = [];

let userIdSeq = 1;
let resumeIdSeq = 1;
let interviewIdSeq = 1;
let questionIdSeq = 1;

function now() {
  return new Date();
}

function createUser(name: string, email: string, password: string): User {
  const user: User = {
    id: userIdSeq++,
    name,
    email,
    passwordHash: hashPassword(password),
    role: "user",
    avatarUrl: null,
    targetRole: null,
    experienceLevel: null,
    createdAt: now(),
    updatedAt: now(),
    currentStreak: 0,
    bestScore: null,
    weeklyGoal: 3,
    preferredDifficulty: "intermediate",
    preferredDuration: 30,
    aiVoiceEnabled: true,
  };
  usersByEmail.set(email, user);
  return user;
}

function createSession(userId: number): string {
  const token = generateToken();
  sessionsByToken.set(token, {
    userId,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
  return token;
}

export function devRegister(name: string, email: string, password: string) {
  if (usersByEmail.has(email)) {
    return { error: "Email already in use" as const };
  }
  const user = createUser(name, email, password);
  const token = createSession(user.id);
  return { user, token };
}

export function devLogin(email: string, password: string) {
  const user = usersByEmail.get(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return null;
  }
  const token = createSession(user.id);
  return { user, token };
}

export function devLogout(token: string) {
  sessionsByToken.delete(token);
}

export function devGetUserByToken(token: string): User | null {
  const session = sessionsByToken.get(token);
  if (!session || session.expiresAt < now()) {
    return null;
  }
  return Array.from(usersByEmail.values()).find((u) => u.id === session.userId) ?? null;
}

export function devGetUserStats(userId: number) {
  const userInterviews = interviews.filter((i) => i.userId === userId);
  const completed = userInterviews.filter((i) => i.status === "completed");
  const scores = completed
    .map((i) => i.overallScore)
    .filter((s): s is number => s != null);
  const averageScore =
    scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const bestScore = scores.length > 0 ? Math.max(...scores) : null;

  return {
    totalInterviews: userInterviews.length,
    completedInterviews: completed.length,
    averageScore: parseFloat(averageScore.toFixed(1)),
    currentStreak: 0,
    totalHours: parseFloat(((userInterviews.length * 15) / 60).toFixed(1)),
    bestScore,
    recentImprovement: null,
  };
}

export function devListResumes(userId: number) {
  return resumes.filter((r) => r.userId === userId);
}

export function devCreateResume(
  userId: number,
  filename: string,
  content: string,
  parsedSkills: string,
  resumeScore: number | null = null,
  missingSkills: string | null = null,
  improvementSuggestions: string | null = null,
) {
  for (const r of resumes) {
    if (r.userId === userId) r.isActive = false;
  }
  const resume: Resume = {
    id: resumeIdSeq++,
    userId,
    filename,
    content,
    parsedSkills,
    isActive: true,
    uploadedAt: now(),
    resumeScore,
    missingSkills,
    improvementSuggestions,
  };
  resumes.push(resume);
  return resume;
}

export function devGetResume(userId: number, id: number) {
  return resumes.find((r) => r.id === id && r.userId === userId) ?? null;
}

export function devDeleteResume(userId: number, id: number) {
  const idx = resumes.findIndex((r) => r.id === id && r.userId === userId);
  if (idx === -1) return null;
  const [removed] = resumes.splice(idx, 1);
  return removed;
}

export function devListInterviews(userId: number, status?: string) {
  return interviews
    .filter((i) => i.userId === userId && (!status || i.status === status))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function devCreateInterview(
  userId: number,
  data: {
    title: string;
    type: string;
    difficulty: string;
    targetRole: string | null;
    questionCount: number;
    resumeId: number | null;
  },
) {
  const interview: Interview = {
    id: interviewIdSeq++,
    userId,
    title: data.title,
    type: data.type,
    difficulty: data.difficulty,
    status: "pending",
    targetRole: data.targetRole,
    overallScore: null,
    durationMinutes: null,
    questionCount: data.questionCount,
    answeredCount: 0,
    resumeId: data.resumeId,
    startedAt: null,
    completedAt: null,
    createdAt: now(),
    communicationScore: null,
    technicalScore: null,
    confidenceScore: null,
    improvementTips: null,
  };
  interviews.push(interview);
  return interview;
}

export function devGetInterview(userId: number, id: number) {
  return interviews.find((i) => i.id === id && i.userId === userId) ?? null;
}

export function devDeleteInterview(userId: number, id: number) {
  const idx = interviews.findIndex((i) => i.id === id && i.userId === userId);
  if (idx === -1) return null;
  const [removed] = interviews.splice(idx, 1);
  questions.splice(
    0,
    questions.length,
    ...questions.filter((q) => q.interviewId !== id),
  );
  return removed;
}

export function devStartInterview(userId: number, id: number) {
  const interview = devGetInterview(userId, id);
  if (!interview) return null;

  if (questions.some((q) => q.interviewId === interview.id)) {
    interview.status = "in_progress";
    interview.startedAt = interview.startedAt ?? now();
    return interview;
  }

  const pools = {
    behavioral: [
      "Tell me about yourself and your relevant experience for this role.",
      "Describe a project you are proud of and your contribution to it.",
      "Tell me about a time you handled pressure or a deadline.",
    ],
    technical: [
      "Explain JWT authentication and how protected routes work.",
      "How would you optimize a slow API response?",
      "Explain how frontend and backend communicate in this application.",
    ],
    coding: [
      "How would you detect duplicates in a large array efficiently?",
      "How would you implement pagination for many database records?",
      "How would you validate user input before saving it?",
    ],
    situational: [
      "A feature works locally but fails after deployment. How would you debug it?",
      "Your frontend cannot reach the backend API. What steps would you take?",
      "How would you handle unclear requirements from a stakeholder?",
    ],
    system_design: [
      "Design an AI mock interview platform with authentication, interviews, and analytics.",
      "Design a resume ATS scoring system at a high level.",
      "Design a scalable question generation service.",
    ],
    resume_based: [
      "Walk me through one resume project and explain your design decisions.",
      "What was the biggest technical challenge in your resume project?",
      "How would you improve one project from your resume?",
    ],
  };
  const plan = ["behavioral", "technical", "coding", "situational", "system_design", "resume_based"] as const;

  for (let i = 0; i < interview.questionCount; i++) {
    const type = plan[i % plan.length];
    const pool = pools[type];
    questions.push({
      id: questionIdSeq++,
      interviewId: interview.id,
      text: pool[Math.floor(i / plan.length) % pool.length],
      type,
      orderIndex: i,
      hint: "Use context, action, technical details, and result.",
      userAnswer: null,
      score: null,
      feedback: null,
      strengths: null,
      improvements: null,
      isAnswered: false,
      createdAt: now(),
    });
  }

  interview.status = "in_progress";
  interview.startedAt = now();
  return interview;
}

export function devListQuestions(interviewId: number) {
  return questions
    .filter((q) => q.interviewId === interviewId)
    .sort((a, b) => a.orderIndex - b.orderIndex);
}

export function devSubmitAnswer(
  userId: number,
  interviewId: number,
  questionId: number,
  answer: string,
  evaluation: { score: number; feedback: string; strengths: string[]; improvements: string[] },
) {
  const interview = devGetInterview(userId, interviewId);
  if (!interview) return null;

  const question = questions.find(
    (q) => q.id === questionId && q.interviewId === interviewId,
  );
  if (!question) return null;

  question.userAnswer = answer;
  question.score = evaluation.score;
  question.feedback = evaluation.feedback;
  question.strengths = JSON.stringify(evaluation.strengths);
  question.improvements = JSON.stringify(evaluation.improvements);
  question.isAnswered = true;

  interview.answeredCount = questions.filter(
    (q) => q.interviewId === interviewId && q.isAnswered,
  ).length;

  return { question, interview };
}

export function devGetNextQuestion(interviewId: number) {
  return questions.find((q) => q.interviewId === interviewId && !q.isAnswered) ?? null;
}

export function devCompleteInterview(userId: number, id: number) {
  const interview = devGetInterview(userId, id);
  if (!interview) return null;

  const interviewQuestions = devListQuestions(id);
  const answered = interviewQuestions.filter((q) => q.isAnswered);
  const avgScore =
    answered.length > 0
      ? answered.reduce((sum, q) => sum + (q.score ?? 0), 0) / answered.length
      : 0;

  const startedAt = interview.startedAt ?? now();
  interview.status = "completed";
  interview.completedAt = now();
  interview.overallScore = parseFloat(avgScore.toFixed(1));
  interview.answeredCount = answered.length;
  interview.durationMinutes = Math.round((Date.now() - startedAt.getTime()) / 60000);

  return interview;
}

export function devGetAnalyticsOverview(userId: number) {
  const stats = devGetUserStats(userId);
  const userQuestions = questions.filter((q) => {
    const interview = interviews.find((i) => i.id === q.interviewId);
    return interview?.userId === userId && q.isAnswered && q.score != null;
  });

  const skillMap: Record<string, number[]> = {};
  for (const q of userQuestions) {
    if (!skillMap[q.type]) skillMap[q.type] = [];
    skillMap[q.type].push(q.score!);
  }

  const skillAvgs = Object.entries(skillMap).map(([type, scores]) => ({
    type,
    avg: scores.reduce((a, b) => a + b, 0) / scores.length,
  }));

  const topSkill = skillAvgs.sort((a, b) => b.avg - a.avg)[0]?.type ?? "Technical";
  const weakestSkill = skillAvgs[skillAvgs.length - 1]?.type ?? "Behavioral";
  const averageScore = stats.averageScore;
  const completionRate =
    stats.totalInterviews > 0
      ? (stats.completedInterviews / stats.totalInterviews) * 100
      : 0;

  return {
    totalInterviews: stats.totalInterviews,
    averageScore,
    completionRate: parseFloat(completionRate.toFixed(1)),
    topSkill,
    weakestSkill,
    scoreThisWeek: averageScore > 0 ? parseFloat((averageScore + 2).toFixed(1)) : null,
    scoreLastWeek: averageScore > 0 ? parseFloat((averageScore - 2).toFixed(1)) : null,
  };
}
