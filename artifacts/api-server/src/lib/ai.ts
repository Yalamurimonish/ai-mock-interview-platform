import Anthropic from "@anthropic-ai/sdk";

export interface GeneratedQuestion {
  text: string;
  type: "technical" | "behavioral" | "situational" | "coding" | "system_design" | "resume_based";
  hint?: string;
}

export interface AnswerEvaluation {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

const QUESTION_TYPES: GeneratedQuestion["type"][] = [
  "behavioral",
  "technical",
  "coding",
  "situational",
  "system_design",
  "resume_based",
];

function getAnthropicClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  return apiKey ? new Anthropic({ apiKey }) : null;
}

function normalizeDifficulty(difficulty: string) {
  const value = difficulty?.toLowerCase();
  if (["beginner", "intermediate", "advanced"].includes(value)) return value;
  return "intermediate";
}

function normalizeQuestionType(type: string): GeneratedQuestion["type"] {
  if (QUESTION_TYPES.includes(type as GeneratedQuestion["type"])) {
    return type as GeneratedQuestion["type"];
  }
  if (type === "hr") return "behavioral";
  if (type === "mixed") return "situational";
  return "technical";
}

function buildQuestionPools(targetRole: string | null, difficulty: string, resumeContent?: string | null) {
  const role = targetRole?.trim() || "the target role";
  const level = normalizeDifficulty(difficulty);
  const resumePrompt = resumeContent
    ? "based on your resume/project experience"
    : "based on your most relevant project";

  const beginner = {
    behavioral: [
      `Tell me about yourself and why you are interested in ${role}.`,
      "Describe a project you are proud of and your contribution to it.",
      "Tell me about a time you learned something new quickly.",
    ],
    technical: [
      `Explain the core skills required for ${role}.`,
      "Explain the difference between frontend and backend responsibilities.",
      "What is an API, and how does a frontend communicate with a backend?",
    ],
    coding: [
      "How would you reverse a string? Explain the approach before coding.",
      "How would you find the largest number in an array?",
      "How would you check if a string is a palindrome?",
    ],
    situational: [
      "What would you do if your code works locally but fails after deployment?",
      "How would you handle a task when the requirements are unclear?",
      "How would you debug a login issue in a web application?",
    ],
    system_design: [
      "Design a simple login and signup system at a high level.",
      "Design a basic resume upload feature for a web app.",
      "Explain how you would store users and interviews in a database.",
    ],
    resume_based: [
      `Explain one project from your resume ${resumePrompt}.`,
      "What technologies did you use in your main project and why?",
      "What was the biggest challenge in your project?",
    ],
  };

  const intermediate = {
    behavioral: [
      `Tell me about a time you handled pressure while working on a ${role} related task.`,
      "Describe a conflict or disagreement in a team and how you handled it.",
      "Tell me about a time you improved an existing feature or process.",
    ],
    technical: [
      "Explain JWT authentication and how you would secure protected routes.",
      "How would you optimize a slow API response?",
      "Explain how you would structure a scalable full-stack application.",
    ],
    coding: [
      "Given an array of objects, how would you group items by a property efficiently?",
      "How would you detect duplicate values in a large array?",
      "How would you implement pagination for a large list of records?",
    ],
    situational: [
      "A user reports that signup returns an error only in production. How would you debug it?",
      "Your deployed frontend cannot reach the backend API. What steps would you take?",
      "A database query is slow after many users join. How would you investigate?",
    ],
    system_design: [
      "Design an AI mock interview platform with authentication, interviews, and analytics.",
      "Design a resume ATS scoring system that can scale to many uploads.",
      "Design a question generation service for different roles and difficulty levels.",
    ],
    resume_based: [
      `Walk me through a project from your resume and explain your architecture decisions.`,
      "Which project in your resume best proves your problem-solving ability?",
      "How did you test, deploy, or optimize the project mentioned in your resume?",
    ],
  };

  const advanced = {
    behavioral: [
      "Tell me about a time you influenced a technical decision without authority.",
      "Describe a high-impact failure and how you prevented it from happening again.",
      "How do you mentor others or improve engineering quality in a team?",
    ],
    technical: [
      "Explain how you would design authentication with access tokens, refresh tokens, and rotation.",
      "How would you handle consistency, retries, and idempotency in a distributed backend?",
      "How would you optimize frontend performance for a large React application?",
    ],
    coding: [
      "Design an efficient algorithm to rank candidates by multiple weighted interview scores.",
      "How would you implement rate limiting for API requests? Explain data structures and trade-offs.",
      "How would you process large log/resume files efficiently without blocking the server?",
    ],
    situational: [
      "Production latency suddenly increases after a deployment. How do you isolate the cause?",
      "A third-party AI API becomes unavailable during interviews. How would your system degrade gracefully?",
      "How would you handle security concerns around uploaded resumes and user data?",
    ],
    system_design: [
      "Design a scalable real-time interview platform with AI feedback, analytics, and resume scoring.",
      "Design a multi-tenant ATS/resume scoring pipeline with asynchronous processing.",
      "Design monitoring, logging, and rollback strategy for this platform in production.",
    ],
    resume_based: [
      "Choose the most complex project on your resume and explain its bottlenecks and trade-offs.",
      "How would you redesign one of your projects to support 100x more users?",
      "What measurable impact did your resume projects have, and how would you prove it?",
    ],
  };

  if (level === "beginner") return beginner;
  if (level === "advanced") return advanced;
  return intermediate;
}

function getTypePlan(interviewType: string, count: number, hasResume: boolean): GeneratedQuestion["type"][] {
  const normalized = interviewType?.toLowerCase();
  const plans: Record<string, GeneratedQuestion["type"][]> = {
    technical: ["behavioral", "technical", "coding", "technical", "situational", "system_design"],
    coding: ["behavioral", "coding", "coding", "technical", "situational", "coding"],
    hr: ["behavioral", "behavioral", "situational", "behavioral", "resume_based", "situational"],
    behavioral: ["behavioral", "situational", "behavioral", "resume_based", "situational"],
    system_design: ["behavioral", "system_design", "technical", "situational", "system_design"],
    mixed: ["behavioral", "technical", "coding", "situational", "system_design", "resume_based"],
  };

  const base = plans[normalized] ?? plans.mixed;
  const result = Array.from({ length: count }, (_, index) => base[index % base.length]);
  if (!hasResume) return result.map((type) => (type === "resume_based" ? "situational" : type));
  return result;
}

function fallbackQuestions(
  type: string,
  count: number,
  difficulty = "intermediate",
  targetRole: string | null = null,
  resumeContent?: string | null,
): GeneratedQuestion[] {
  const safeCount = Math.min(Math.max(Number(count) || 5, 3), 20);
  const pools = buildQuestionPools(targetRole, difficulty, resumeContent);
  const plan = getTypePlan(type, safeCount, Boolean(resumeContent?.trim()));
  const used = new Set<string>();

  return plan.map((questionType, index) => {
    const pool = pools[questionType] ?? pools.technical;
    const question = pool.find((item) => !used.has(item)) ?? pool[index % pool.length];
    used.add(question);
    return {
      text: question,
      type: normalizeQuestionType(questionType),
      hint: "Use a structured answer: context, action, technical details, and measurable result.",
    };
  });
}

function extractJsonArray(text: string): unknown {
  const direct = text.trim();
  if (direct.startsWith("[") && direct.endsWith("]")) return JSON.parse(direct);
  const match = direct.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("No JSON array found");
  return JSON.parse(match[0]);
}

export async function generateInterviewQuestions(
  type: string,
  difficulty: string,
  targetRole: string | null,
  count: number,
  resumeContent?: string | null,
): Promise<GeneratedQuestion[]> {
  const safeCount = Math.min(Math.max(Number(count) || 5, 3), 20);
  const fallback = fallbackQuestions(type, safeCount, difficulty, targetRole, resumeContent);
  const client = getAnthropicClient();
  if (!client) return fallback;

  const roleContext = targetRole?.trim() ? `for a ${targetRole} position` : "for a software engineering position";
  const resumeContext = resumeContent?.trim()
    ? `\nCandidate resume/background excerpt:\n${resumeContent.slice(0, 2500)}`
    : "";
  const plan = getTypePlan(type, safeCount, Boolean(resumeContent?.trim())).join(", ");

  const prompt = `Generate exactly ${safeCount} unique mock interview questions ${roleContext}.
Interview type selected by user: ${type}
Difficulty: ${difficulty}
Required question type mix in order: ${plan}${resumeContext}

Rules:
- Return exactly ${safeCount} questions.
- Do not repeat questions.
- Match the difficulty level.
- If resume context exists, include at least one project/resume-based question.
- Include practical, scenario-based, and role-relevant questions.
- Each item must include: text, type, hint.
- type must be one of: technical, behavioral, situational, coding, system_design, resume_based.

Return ONLY a valid JSON array. No markdown.`;

  try {
    const message = await client.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 2500,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") return fallback;

    const parsed = extractJsonArray(content.text);
    if (!Array.isArray(parsed)) return fallback;

    const generated = parsed
      .map((item, index) => {
        const q = item as Partial<GeneratedQuestion>;
        return {
          text: typeof q.text === "string" && q.text.trim() ? q.text.trim() : fallback[index]?.text,
          type: normalizeQuestionType(String(q.type || fallback[index]?.type || "technical")),
          hint: typeof q.hint === "string" && q.hint.trim() ? q.hint.trim() : fallback[index]?.hint,
        };
      })
      .filter((q) => q.text && q.text.trim().length > 0)

    const unique = generated.filter(
      (item, index, arr) => arr.findIndex((other) => other.text.toLowerCase() === item.text.toLowerCase()) === index,
    );

    if (unique.length >= safeCount) return unique.slice(0, safeCount);

    const needed = fallback.filter(
      (item) => !unique.some((q) => q.text.toLowerCase() === item.text.toLowerCase()),
    );
    return [...unique, ...needed].slice(0, safeCount);
  } catch (error) {
    console.error("AI question generation failed:", error);
    return fallback;
  }
}

export async function evaluateAnswer(
  question: string,
  answer: string,
  difficulty: string,
  type: string,
): Promise<AnswerEvaluation> {
  const wordCount = answer.trim().split(/\s+/).filter(Boolean).length;
  const hasExample = /project|example|built|implemented|designed|created|solved|improved|optimized/i.test(answer);
  const hasResult = /result|impact|reduced|increased|improved|faster|users|score|deployed|success/i.test(answer);
  const base = Math.min(88, Math.max(45, 40 + wordCount * 2 + (hasExample ? 10 : 0) + (hasResult ? 8 : 0)));

  const fallback: AnswerEvaluation = {
    score: Math.round(base),
    feedback:
      "Your answer was recorded successfully. Make it stronger by adding a clear example, your exact action, technical details, and measurable outcome.",
    strengths: [hasExample ? "Included a relevant example" : "Attempted the question", "Provided relevant context"],
    improvements: ["Use STAR structure", "Add measurable impact or technical depth"],
  };

  const client = getAnthropicClient();
  if (!client) return fallback;

  const prompt = `You are an expert interviewer. Evaluate this interview answer.

Question: ${question}
Answer: ${answer}
Difficulty: ${difficulty}
Question type: ${type}

Return JSON only:
{
  "score": number,
  "feedback": "2-3 sentence feedback",
  "strengths": ["...", "..."],
  "improvements": ["...", "..."]
}`;

  try {
    const message = await client.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 900,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") return fallback;
    const parsed = JSON.parse(content.text.match(/\{[\s\S]*\}/)?.[0] ?? content.text) as AnswerEvaluation;
    return {
      score: Math.min(100, Math.max(0, Math.round(Number(parsed.score) || fallback.score))),
      feedback: parsed.feedback || fallback.feedback,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 3) : fallback.strengths,
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements.slice(0, 3) : fallback.improvements,
    };
  } catch (error) {
    console.error("AI answer evaluation failed:", error);
    return fallback;
  }
}

export async function generateInterviewAnalysis(
  questions: Array<{ text: string; userAnswer: string | null; score: number | null; type: string }>,
): Promise<{
  summary: string;
  strengths: string[];
  improvements: string[];
  skillScores: Array<{ skill: string; score: number; maxScore: number }>;
  detailedFeedback: string;
}> {
  const answeredQuestions = questions.filter((question) => question.userAnswer);
  const avgScore =
    answeredQuestions.reduce((sum, question) => sum + (question.score ?? 0), 0) /
    (answeredQuestions.length || 1);

  const fallback = {
    summary: `You completed the interview with an average score of ${avgScore.toFixed(0)}/100. Review your answers and focus on adding clear examples, depth, and measurable results.`,
    strengths: ["Completed the session", "Provided answers for review", "Showed willingness to practice"],
    improvements: ["Use structured answers", "Add specific technical details", "Quantify achievements"],
    skillScores: [
      { skill: "Communication", score: Math.round(avgScore), maxScore: 100 },
      { skill: "Technical Knowledge", score: Math.round(avgScore * 0.9), maxScore: 100 },
      { skill: "Problem Solving", score: Math.round(avgScore * 0.85), maxScore: 100 },
      { skill: "Examples & Stories", score: Math.round(avgScore * 0.8), maxScore: 100 },
      { skill: "Clarity", score: Math.round(avgScore * 0.95), maxScore: 100 },
    ],
    detailedFeedback:
      "Use the STAR method for behavioral answers and explain your assumptions, trade-offs, and results for technical answers.",
  };

  const client = getAnthropicClient();
  if (!client || answeredQuestions.length === 0) return fallback;

  const prompt = `Analyze this completed interview and provide overall feedback as JSON only.

Questions and answers:
${answeredQuestions
  .map(
    (question, index) => `Q${index + 1} (${question.type}, score: ${question.score}/100): ${question.text}\nAnswer: ${question.userAnswer?.slice(0, 700) ?? "No answer"}`,
  )
  .join("\n\n")}

Average score: ${avgScore.toFixed(0)}/100

JSON keys: summary, strengths, improvements, skillScores, detailedFeedback.`;

  try {
    const message = await client.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1400,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") return fallback;
    return JSON.parse(content.text.match(/\{[\s\S]*\}/)?.[0] ?? content.text);
  } catch (error) {
    console.error("AI interview analysis failed:", error);
    return fallback;
  }
}
