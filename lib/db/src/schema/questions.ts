import { pgTable, text, serial, timestamp, integer, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { interviewsTable } from "./interviews";

export const questionsTable = pgTable("questions", {
  id: serial("id").primaryKey(),
  interviewId: integer("interview_id").notNull().references(() => interviewsTable.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  type: text("type").notNull().default("technical"),
  orderIndex: integer("order_index").notNull().default(0),
  hint: text("hint"),
  userAnswer: text("user_answer"),
  score: real("score"),
  feedback: text("feedback"),
  strengths: text("strengths"),
  improvements: text("improvements"),
  isAnswered: boolean("is_answered").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertQuestionSchema = createInsertSchema(questionsTable).omit({ id: true, createdAt: true });
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questionsTable.$inferSelect;
