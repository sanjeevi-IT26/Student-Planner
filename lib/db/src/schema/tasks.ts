import { boolean, date, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { groupAssignmentsTable } from "./campus";

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  assignmentId: integer("assignment_id").references(() => groupAssignmentsTable.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  category: text("category").notNull(),
  dueDate: date("due_date", { mode: "string" }).notNull(),
  priority: text("priority").notNull(),
  recurrence: text("recurrence").notNull().default("None"),
  isCompleted: boolean("is_completed").notNull().default(false),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  pointsAwarded: integer("points_awarded").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({
  id: true,
  createdAt: true,
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;