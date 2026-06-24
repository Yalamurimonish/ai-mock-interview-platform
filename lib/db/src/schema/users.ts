import { pgTable, text, serial, timestamp, boolean, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("user"),
  avatarUrl: text("avatar_url"),
  targetRole: text("target_role"),
  experienceLevel: text("experience_level"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  currentStreak: integer("current_streak").notNull().default(0),
  bestScore: real("best_score"),
  weeklyGoal: integer("weekly_goal").notNull().default(3),
  preferredDifficulty: text("preferred_difficulty").notNull().default("intermediate"),
  preferredDuration: integer("preferred_duration").notNull().default(30),
  aiVoiceEnabled: boolean("ai_voice_enabled").notNull().default(true),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
