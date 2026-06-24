import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { resumesTable } from "./resumes";

export const interviewsTable = pgTable("interviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: text("type").notNull().default("mixed"),
  difficulty: text("difficulty").notNull().default("intermediate"),
  status: text("status").notNull().default("pending"),
  targetRole: text("target_role"),
  overallScore: real("overall_score"),
  durationMinutes: integer("duration_minutes"),
  questionCount: integer("question_count").notNull().default(5),
  answeredCount: integer("answered_count").notNull().default(0),
  resumeId: integer("resume_id").references(() => resumesTable.id, { onDelete: "set null" }),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  communicationScore: real("communication_score"),
  technicalScore: real("technical_score"),
  confidenceScore: real("confidence_score"),
  improvementTips: text("improvement_tips"),
});

export const insertInterviewSchema = createInsertSchema(interviewsTable).omit({ id: true, createdAt: true });
export type InsertInterview = z.infer<typeof insertInterviewSchema>;
export type Interview = typeof interviewsTable.$inferSelect;
