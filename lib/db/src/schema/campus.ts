import {
  date,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const campusUsersTable = pgTable("campus_users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull().default("student"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const groupsTable = pgTable("campus_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  joinCode: text("join_code").notNull().unique(),
  facultyId: text("faculty_id")
    .notNull()
    .references(() => campusUsersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const groupMembershipsTable = pgTable(
  "group_memberships",
  {
    groupId: integer("group_id")
      .notNull()
      .references(() => groupsTable.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => campusUsersTable.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    membershipPrimaryKey: primaryKey({ columns: [table.groupId, table.userId] }),
  }),
);

export const groupAssignmentsTable = pgTable("group_assignments", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id")
    .notNull()
    .references(() => groupsTable.id, { onDelete: "cascade" }),
  createdBy: text("created_by")
    .notNull()
    .references(() => campusUsersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  category: text("category").notNull(),
  dueDate: date("due_date", { mode: "string" }).notNull(),
  priority: text("priority").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pointsLedgerTable = pgTable("points_ledger", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => campusUsersTable.id, { onDelete: "cascade" }),
  groupId: integer("group_id").references(() => groupsTable.id, { onDelete: "set null" }),
  taskId: integer("task_id"),
  createdBy: text("created_by")
    .notNull()
    .references(() => campusUsersTable.id, { onDelete: "cascade" }),
  points: integer("points").notNull(),
  source: text("source").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CampusUser = typeof campusUsersTable.$inferSelect;
export type CampusGroup = typeof groupsTable.$inferSelect;
export type GroupMembership = typeof groupMembershipsTable.$inferSelect;
export type GroupAssignment = typeof groupAssignmentsTable.$inferSelect;
export type PointLedgerEntry = typeof pointsLedgerTable.$inferSelect;
