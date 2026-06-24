import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export interface GeneratedQuestion {
  text: string;
  type: "technical" | "behavioral" | "situational" | "coding";
  hint?: string;
}

export interface AnswerEvaluation {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

export async function generateInterviewQuestions(
  type: string,
  difficulty: string,
  targetRole: string | null,
  count: number,
  resumeContent?: string | null
): Promise<GeneratedQuestion[]> {
  const roleContext = targetRole ? `for a ${targetRole} position` : "for a software engineering position";
  const resumeContext = resumeContent
    ? `\n\nThe candidate's resume/background:\n${resumeContent.slice(0, 2000)}`
    : "";

  const prompt = `Generate ${count} interview questions ${roleContext}.
Interview type: ${type}
Difficulty: ${difficulty}${resumeContext}

Return a JSON array of questions. Each question must have:
- text: the question text
- type: one of "technical", "behavioral", "situational", "coding"
- hint: a brief hint to help the candidate (optional)

Focus on ${
    type === "technical"
      ? "technical skills, system design, algorithms, and coding"
      : type === "behavioral"
      ? "past experiences, teamwork, conflict resolution, and leadership"
      : type === "system_design"
      ? "system architecture, scalability, and design trade-offs"
      : "a mix of technical, behavioral, and situational questions"
  } questions appropriate for ${difficulty} level.

Return ONLY valid JSON array, no markdown.`;

  const message = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  try {
    const questions = JSON.parse(content.text);
    return questions as GeneratedQuestion[];
  } catch {
    // Fallback questions if parsing fails
    return Array.from({ length: count }, (_, i) => ({
      text: `Question ${i + 1}: Tell me about your experience with ${type === "technical" ? "software engineering" : "your team"}.`,
      type: (type === "technical" ? "technical" : "behavioral") as GeneratedQuestion["type"],
    }));
  }
}

export async function evaluateAnswer(
  question: string,
  answer: string,
  difficulty: string,
  type: string
): Promise<AnswerEvaluation> {
  const prompt = `You are an expert interviewer. Evaluate this interview answer.

Question: ${question}
Answer: ${answer}
Difficulty: ${difficulty}
Question type: ${type}

Rate the answer from 0-100 and provide detailed feedback.

Return JSON with:
- score: number 0-100
- feedback: detailed evaluation paragraph (2-3 sentences)
- strengths: array of 2-3 specific strengths
- improvements: array of 2-3 specific areas to improve

Return ONLY valid JSON, no markdown.`;

  const message = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 800,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  try {
    return JSON.parse(content.text) as AnswerEvaluation;
  } catch {
    return {
      score: 70,
      feedback: "Your answer shows understanding of the topic. Consider providing more specific examples.",
      strengths: ["Clear communication", "Shows relevant knowledge"],
      improvements: ["Add concrete examples", "Be more specific about outcomes"],
    };
  }
}

export async function generateInterviewAnalysis(
  questions: Array<{ text: string; userAnswer: string | null; score: number | null; type: string }>
): Promise<{
  summary: string;
  strengths: string[];
  improvements: string[];
  skillScores: Array<{ skill: string; score: number; maxScore: number }>;
  detailedFeedback: string;
}> {
  const answeredQuestions = questions.filter((q) => q.userAnswer);
  const avgScore =
    answeredQuestions.reduce((sum, q) => sum + (q.score ?? 0), 0) /
    (answeredQuestions.length || 1);

  const prompt = `Analyze this completed interview and provide overall feedback.

Questions and answers:
${answeredQuestions
  .map(
    (q, i) => `Q${i + 1} (${q.type}, score: ${q.score}/100): ${q.text}
Answer: ${q.userAnswer?.slice(0, 500) ?? "No answer"}`
  )
  .join("\n\n")}

Average score: ${avgScore.toFixed(0)}/100

Provide a comprehensive interview analysis as JSON:
- summary: 2-3 sentence overall assessment
- strengths: array of 3 top strengths demonstrated
- improvements: array of 3 key areas to improve
- skillScores: array of {skill, score, maxScore:100} for skills like "Communication", "Technical Knowledge", "Problem Solving", "Examples & Stories", "Clarity"
- detailedFeedback: detailed paragraph with specific advice

Return ONLY valid JSON, no markdown.`;

  const message = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1200,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  try {
    return JSON.parse(content.text);
  } catch {
    return {
      summary: `You completed the interview with an average score of ${avgScore.toFixed(0)}/100. Overall a solid performance.`,
      strengths: ["Good communication", "Demonstrated relevant knowledge", "Structured answers"],
      improvements: ["Add more specific examples", "Quantify your achievements", "Practice concise delivery"],
      skillScores: [
        { skill: "Communication", score: avgScore, maxScore: 100 },
        { skill: "Technical Knowledge", score: avgScore * 0.9, maxScore: 100 },
        { skill: "Problem Solving", score: avgScore * 0.85, maxScore: 100 },
        { skill: "Examples & Stories", score: avgScore * 0.8, maxScore: 100 },
        { skill: "Clarity", score: avgScore * 0.95, maxScore: 100 },
      ],
      detailedFeedback: "Focus on providing concrete examples and quantifying your achievements for a stronger impression.",
    };
  }
}
