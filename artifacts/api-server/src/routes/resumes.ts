import { Router, type IRouter } from "express";
import { db, isDatabaseConfigured, resumesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { UploadResumeBody, GetResumeParams, DeleteResumeParams } from "@workspace/api-zod";
import { requireAuth, getUser } from "../lib/auth";
import * as devStore from "../lib/dev-store";
import Anthropic from "@anthropic-ai/sdk";

const router: IRouter = Router();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

const skillKeywords = [
  "JavaScript", "TypeScript", "Python", "React", "Node.js", "SQL", "AWS",
  "Docker", "Kubernetes", "GraphQL", "REST", "Git", "Agile", "Scrum",
  "Java", "Go", "Rust", "C++", "Machine Learning", "Data Analysis",
];

function parseSkills(content: string) {
  return skillKeywords
    .filter((skill) => content.toLowerCase().includes(skill.toLowerCase()))
    .join(", ");
}

async function analyzeResumeWithAI(content: string) {
  try {
    const message = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Analyze this resume and provide:
1. A score from 0-100 based on overall quality
2. A list of missing skills (comma-separated) that would make this resume stronger
3. 3-5 specific improvement suggestions

Resume content:
${content}

Respond in JSON format with this structure:
{
  "score": number,
  "missingSkills": string,
  "improvements": string
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
      score: 75,
      missingSkills: "",
      improvements: "Good overall structure. Consider adding more quantifiable achievements.",
    };
  } catch (error) {
    console.error("AI analysis failed:", error);
    return {
      score: 70,
      missingSkills: "",
      improvements: "Unable to perform AI analysis. Please try again later.",
    };
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

  const resumes = await db
    .select()
    .from(resumesTable)
    .where(eq(resumesTable.userId, user.id));

  res.json(resumes.map(serializeResume));
});

router.post("/resumes", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const parsed = UploadResumeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const content = parsed.data.content;
  const parsedSkills = parseSkills(content);
  
  // Perform AI analysis
  const aiAnalysis = await analyzeResumeWithAI(content);

  if (!isDatabaseConfigured || !db) {
    const resume = devStore.devCreateResume(
      user.id,
      parsed.data.filename,
      content,
      parsedSkills,
    );
    res.status(201).json(serializeResume(resume));
    return;
  }

  await db
    .update(resumesTable)
    .set({ isActive: false })
    .where(eq(resumesTable.userId, user.id));

  const [resume] = await db
    .insert(resumesTable)
    .values({
      userId: user.id,
      filename: parsed.data.filename,
      content,
      parsedSkills,
      isActive: true,
      resumeScore: aiAnalysis.score,
      missingSkills: aiAnalysis.missingSkills,
      improvementSuggestions: aiAnalysis.improvements,
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
