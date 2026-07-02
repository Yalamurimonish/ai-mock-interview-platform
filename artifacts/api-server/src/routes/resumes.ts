import { Router, type IRouter } from "express";
import { db, isDatabaseConfigured, resumesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { UploadResumeBody, GetResumeParams, DeleteResumeParams } from "@workspace/api-zod";
import { requireAuth, getUser } from "../lib/auth";
import * as devStore from "../lib/dev-store";
import Anthropic from "@anthropic-ai/sdk";

const router: IRouter = Router();

const CORE_SKILLS = [
  "JavaScript", "TypeScript", "React", "Node.js", "Express", "Fastify", "HTML", "CSS",
  "Tailwind", "SQL", "PostgreSQL", "MongoDB", "Drizzle", "Prisma", "REST", "GraphQL",
  "Git", "GitHub", "Vercel", "Render", "Railway", "Docker", "AWS", "Azure", "GCP",
  "Java", "Python", "C++", "DSA", "Data Structures", "Algorithms", "OOP",
  "Authentication", "JWT", "API", "Testing", "CI/CD", "Linux", "Agile", "Scrum",
];

const ROLE_KEYWORDS: Record<string, string[]> = {
  frontend: ["React", "TypeScript", "JavaScript", "HTML", "CSS", "Tailwind", "REST", "Testing", "Git"],
  backend: ["Node.js", "Express", "Fastify", "PostgreSQL", "SQL", "REST", "Authentication", "JWT", "Docker"],
  fullstack: ["React", "TypeScript", "Node.js", "PostgreSQL", "REST", "Authentication", "Git", "Deployment"],
  default: ["JavaScript", "React", "Node.js", "SQL", "Git", "REST", "Authentication", "Deployment"],
};

type AtsAnalysis = {
  score: number;
  missingSkills: string;
  improvements: string;
};

function normalizeText(content: string) {
  return content.replace(/\s+/g, " ").trim();
}

function parseSkills(content: string) {
  const lower = content.toLowerCase();
  return CORE_SKILLS.filter((skill) => lower.includes(skill.toLowerCase())).join(", ");
}

function detectRole(content: string) {
  const lower = content.toLowerCase();
  if (/frontend|front-end|react|ui developer/.test(lower)) return "frontend";
  if (/backend|back-end|api developer|server/.test(lower)) return "backend";
  if (/full stack|fullstack|mern/.test(lower)) return "fullstack";
  return "default";
}

function countMatches(content: string, patterns: RegExp[]) {
  return patterns.reduce((count, pattern) => count + (pattern.test(content) ? 1 : 0), 0);
}

function clampScore(score: number) {
  return Math.min(100, Math.max(0, Math.round(score)));
}

function analyzeResumeLocally(content: string): AtsAnalysis {
  const text = normalizeText(content);
  const lower = text.toLowerCase();
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const role = detectRole(text);
  const expectedSkills = ROLE_KEYWORDS[role] ?? ROLE_KEYWORDS.default;
  const foundSkills = CORE_SKILLS.filter((skill) => lower.includes(skill.toLowerCase()));
  const missingSkills = expectedSkills.filter(
    (skill) => !foundSkills.some((found) => found.toLowerCase() === skill.toLowerCase()),
  );

  const hasContact = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text) || /\+?\d[\d\s().-]{8,}/.test(text);
  const hasLinks = /github|linkedin|portfolio|https?:\/\//i.test(text);
  const hasEducation = /education|degree|bachelor|b\.tech|btech|university|college|cgpa|gpa/i.test(text);
  const hasExperience = /experience|intern|internship|worked|developer|engineer|freelance/i.test(text);
  const hasProjects = /project|built|developed|implemented|designed|deployed|created/i.test(text);
  const hasMetrics = /\b\d+%|\b\d+x|\b\d+\+|reduced|increased|improved|optimized|faster|users|requests|latency/i.test(text);
  const hasActionVerbs = countMatches(text, [
    /\bbuilt\b/i,
    /\bdeveloped\b/i,
    /\bimplemented\b/i,
    /\boptimized\b/i,
    /\bdesigned\b/i,
    /\bdeployed\b/i,
    /\bintegrated\b/i,
    /\bautomated\b/i,
  ]);

  const skillScore = Math.min(30, Math.round((foundSkills.length / Math.max(expectedSkills.length, 1)) * 30));
  const contentScore = Math.min(20, Math.round((wordCount >= 250 ? 10 : wordCount / 25) + (wordCount <= 900 ? 5 : 2) + (hasActionVerbs >= 4 ? 5 : hasActionVerbs)));
  const projectScore = (hasProjects ? 8 : 0) + (hasMetrics ? 7 : 0);
  const experienceScore = (hasExperience ? 10 : 0) + (hasEducation ? 5 : 0);
  const atsScore = (hasContact ? 5 : 0) + (hasLinks ? 5 : 0) + (/\n|•|-/.test(content) ? 5 : 0) + (!/table|image|photo/i.test(lower) ? 5 : 0);
  const score = clampScore(skillScore + contentScore + projectScore + experienceScore + atsScore);

  const suggestions: string[] = [];
  if (!hasContact) suggestions.push("Add email and phone number at the top of the resume.");
  if (!hasLinks) suggestions.push("Add GitHub, LinkedIn, or portfolio links.");
  if (missingSkills.length > 0) suggestions.push(`Add role-relevant keywords: ${missingSkills.slice(0, 5).join(", ")}.`);
  if (!hasMetrics) suggestions.push("Add measurable achievements such as percentages, users, latency, or performance improvements.");
  if (!hasProjects) suggestions.push("Add 2-3 strong projects with tech stack, features, and deployment details.");
  if (wordCount < 250) suggestions.push("Add more detail to experience, projects, skills, and education sections.");
  if (wordCount > 900) suggestions.push("Shorten the resume and keep it concise for better ATS readability.");

  return {
    score,
    missingSkills: missingSkills.length ? missingSkills.slice(0, 8).join(", ") : "No major role keywords missing",
    improvements: suggestions.length ? suggestions.join(" ") : "Strong resume. Keep achievements measurable and role-specific.",
  };
}

async function analyzeResumeWithAI(content: string): Promise<AtsAnalysis> {
  const fallback = analyzeResumeLocally(content);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fallback;

  try {
    const anthropic = new Anthropic({ apiKey });
    const message = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1200,
      messages: [
        {
          role: "user",
          content: `Analyze this resume like an ATS system.

Score rules:
- Skills and keywords: 30
- Experience relevance: 20
- Projects and measurable impact: 20
- Education and certifications: 10
- ATS readability/formatting: 10
- Contact info and links: 10

Return JSON only:
{
  "score": number,
  "missingSkills": "comma separated missing skills",
  "improvements": "3-5 specific improvement suggestions"
}

Resume:
${content.slice(0, 6000)}`,
        },
      ],
    });

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonText = responseText.match(/\{[\s\S]*\}/)?.[0];
    if (!jsonText) return fallback;
    const parsed = JSON.parse(jsonText) as Partial<AtsAnalysis>;

    return {
      score: clampScore(Number(parsed.score) || fallback.score),
      missingSkills: parsed.missingSkills || fallback.missingSkills,
      improvements: parsed.improvements || fallback.improvements,
    };
  } catch (error) {
    console.error("AI resume analysis failed:", error);
    return fallback;
  }
}

function serializeResume(r: { uploadedAt: Date; [key: string]: unknown }) {
  return { ...r, uploadedAt: r.uploadedAt.toISOString() };
}

router.get("/resumes", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);

  if (!isDatabaseConfigured || !db) {
    res.json(devStore.devListResumes(user.id).map(serializeResume));
    return;
  }

  const resumes = await db.select().from(resumesTable).where(eq(resumesTable.userId, user.id));
  res.json(resumes.map(serializeResume));
});

router.post("/resumes", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const parsed = UploadResumeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const content = normalizeText(parsed.data.content);
  if (content.length < 50) {
    res.status(400).json({ error: "Resume text is too short. Paste the full resume content." });
    return;
  }

  const parsedSkills = parseSkills(content);
  const analysis = await analyzeResumeWithAI(content);

  if (!isDatabaseConfigured || !db) {
    const resume = devStore.devCreateResume(
      user.id,
      parsed.data.filename,
      content,
      parsedSkills,
      analysis.score,
      analysis.missingSkills,
      analysis.improvements,
    );
    res.status(201).json(serializeResume(resume));
    return;
  }

  await db.update(resumesTable).set({ isActive: false }).where(eq(resumesTable.userId, user.id));

  const [resume] = await db
    .insert(resumesTable)
    .values({
      userId: user.id,
      filename: parsed.data.filename,
      content,
      parsedSkills,
      isActive: true,
      resumeScore: analysis.score,
      missingSkills: analysis.missingSkills,
      improvementSuggestions: analysis.improvements,
    })
    .returning();

  res.status(201).json(serializeResume(resume));
});

router.get("/resumes/:id", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const params = GetResumeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!isDatabaseConfigured || !db) {
    const resume = devStore.devGetResume(user.id, params.data.id);
    if (!resume) {
      res.status(404).json({ error: "Resume not found" });
      return;
    }
    res.json(serializeResume(resume));
    return;
  }

  const [resume] = await db
    .select()
    .from(resumesTable)
    .where(and(eq(resumesTable.id, params.data.id), eq(resumesTable.userId, user.id)));

  if (!resume) {
    res.status(404).json({ error: "Resume not found" });
    return;
  }

  res.json(serializeResume(resume));
});

router.delete("/resumes/:id", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const params = DeleteResumeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!isDatabaseConfigured || !db) {
    const resume = devStore.devDeleteResume(user.id, params.data.id);
    if (!resume) {
      res.status(404).json({ error: "Resume not found" });
      return;
    }
    res.sendStatus(204);
    return;
  }

  const [resume] = await db
    .delete(resumesTable)
    .where(and(eq(resumesTable.id, params.data.id), eq(resumesTable.userId, user.id)))
    .returning();

  if (!resume) {
    res.status(404).json({ error: "Resume not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
