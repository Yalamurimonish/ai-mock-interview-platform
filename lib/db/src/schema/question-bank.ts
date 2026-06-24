import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const questionBankTable = pgTable("question_bank", {
  id: serial("id").primaryKey(),
  role: text("role").notNull(),
  category: text("category").notNull(),
  question: text("question").notNull(),
  difficulty: text("difficulty").notNull().default("intermediate"),
  tags: text("tags"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertQuestionBankSchema = createInsertSchema(questionBankTable).omit({ id: true, createdAt: true });
export type InsertQuestionBank = z.infer<typeof insertQuestionBankSchema>;
export type QuestionBank = typeof questionBankTable.$inferSelect;
