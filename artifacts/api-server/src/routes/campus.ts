import { clerkClient } from "@clerk/express";
import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { Router, type IRouter, type RequestHandler } from "express";
import {
  AwardPointsBody,
  AwardPointsResponse,
  AddFacultyBody,
  AddFacultyResponse,
  CreateGroupAssignmentBody,
  CreateGroupAssignmentParams,
  CreateGroupAssignmentResponse,
  CreateGroupBody,
  CreateGroupResponse,
  GetCurrentUserResponse,
  GetGroupReportParams,
  GetGroupReportResponse,
  GetMyPointsResponse,
  JoinGroupBody,
  JoinGroupResponse,
  ListFacultyResponse,
  ListGroupMembersParams,
  ListGroupMembersResponse,
  ListGroupsResponse,
  UpdateGroupMemberRoleBody,
  UpdateGroupMemberRoleParams,
  UpdateGroupMemberRoleResponse,
} from "@workspace/api-zod";
import {
  campusUsersTable,
  db,
  groupAssignmentsTable,
  groupMembershipsTable,
  groupsTable,
  pointsLedgerTable,
  tasksTable,
  type CampusUser,
} from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";
import { getClerkUserForEmail, profileFromClerkUser } from "../lib/campus-profile";

type CampusRequest = AuthenticatedRequest & { campusUser: CampusUser };

const router: IRouter = Router();

const attachCampusUser: RequestHandler = async (req, res, next) => {
  const userId = (req as AuthenticatedRequest).userId;
  const [existing] = await db
    .select()
    .from(campusUsersTable)
    .where(eq(campusUsersTable.id, userId))
    .limit(1);

  let profile: CampusUser | null = existing ?? null;
  if (profile === null) {
    const clerkUser = await clerkClient.users.getUser(userId);
    profile = await profileFromClerkUser(clerkUser);
  }

  if (profile === null) {
    res.status(403).json({ error: "A verified primary email is required." });
    return;
  }

  (req as CampusRequest).campusUser = profile;
  next();
};

router.use(requireAuth, attachCampusUser);

function currentUser(req: Parameters<RequestHandler>[0]): CampusUser {
  return (req as CampusRequest).campusUser;
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

async function groupById(groupId: number) {
  const [group] = await db
    .select()
    .from(groupsTable)
    .where(eq(groupsTable.id, groupId))
    .limit(1);
  return group ?? null;
}

async function accessToGroup(groupId: number, user: CampusUser) {
  const group = await groupById(groupId);
  if (!group) return { group: null, access: null };
  if (group.facultyId === user.id) return { group, access: "faculty" as const };

  const [membership] = await db
    .select()
    .from(groupMembershipsTable)
    .where(
      and(
        eq(groupMembershipsTable.groupId, groupId),
        eq(groupMembershipsTable.userId, user.id),
      ),
    )
    .limit(1);
  return { group, access: membership?.role === "admin" ? "admin" as const : membership ? "member" as const : null };
}

router.get("/me", (req, res) => {
  res.json(GetCurrentUserResponse.parse(currentUser(req)));
});

router.get("/faculty", async (req, res): Promise<void> => {
  if (currentUser(req).role !== "faculty") {
    res.status(403).json({ error: "Faculty access required." });
    return;
  }
  const faculty = await db
    .select()
    .from(campusUsersTable)
    .where(eq(campusUsersTable.role, "faculty"))
    .orderBy(asc(campusUsersTable.displayName));
  res.json(ListFacultyResponse.parse(faculty));
});

router.post("/faculty", async (req, res): Promise<void> => {
  if (currentUser(req).role !== "faculty") {
    res.status(403).json({ error: "Faculty access required." });
    return;
  }
  const parsed = AddFacultyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const email = parsed.data.email.trim().toLowerCase();
  const clerkUser = await getClerkUserForEmail(email);
  if (!clerkUser) {
    res.status(404).json({ error: "No verified CampusTrack account was found for that email." });
    return;
  }
  const target = await profileFromClerkUser(clerkUser);
  if (!target) {
    res.status(400).json({ error: "That account needs a verified primary email first." });
    return;
  }
  if (target.id === currentUser(req).id) {
    res.status(400).json({ error: "You are already a faculty member." });
    return;
  }

  const [faculty] = await db
    .update(campusUsersTable)
    .set({ role: "faculty" })
    .where(eq(campusUsersTable.id, target.id))
    .returning();
  res.json(AddFacultyResponse.parse(faculty));
});

router.get("/groups", async (req, res): Promise<void> => {
  const user = currentUser(req);
  const ownedGroups = user.role === "faculty"
    ? await db.select().from(groupsTable).where(eq(groupsTable.facultyId, user.id))
    : [];
  const memberships = await db
    .select({ group: groupsTable, role: groupMembershipsTable.role })
    .from(groupMembershipsTable)
    .innerJoin(groupsTable, eq(groupMembershipsTable.groupId, groupsTable.id))
    .where(eq(groupMembershipsTable.userId, user.id));

  const accessibleGroups = new Map<number, { group: typeof groupsTable.$inferSelect; accessRole: "faculty" | "admin" | "member" }>();
  for (const group of ownedGroups) accessibleGroups.set(group.id, { group, accessRole: "faculty" });
  for (const membership of memberships) {
    if (!accessibleGroups.has(membership.group.id)) {
      accessibleGroups.set(membership.group.id, {
        group: membership.group,
        accessRole: membership.role === "admin" ? "admin" : "member",
      });
    }
  }

  const summaries = await Promise.all(
    [...accessibleGroups.values()].map(async ({ group, accessRole }) => {
      const [memberCount] = await db
        .select({ count: count() })
        .from(groupMembershipsTable)
        .where(eq(groupMembershipsTable.groupId, group.id));
      return {
        ...group,
        memberCount: memberCount?.count ?? 0,
        accessRole,
      };
    }),
  );
  res.json(ListGroupsResponse.parse(summaries));
});

router.post("/groups", async (req, res): Promise<void> => {
  const user = currentUser(req);
  if (user.role !== "faculty") {
    res.status(403).json({ error: "Only faculty can create groups." });
    return;
  }
  const parsed = CreateGroupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [group] = await db
    .insert(groupsTable)
    .values({
      name: parsed.data.name.trim(),
      joinCode: randomBytes(8).toString("hex").toUpperCase(),
      facultyId: user.id,
    })
    .returning();
  res.status(201).json(
    CreateGroupResponse.parse({
      ...group,
      memberCount: 0,
      accessRole: "faculty",
    }),
  );
});

router.post("/groups/join", async (req, res): Promise<void> => {
  const user = currentUser(req);
  if (user.role !== "student") {
    res.status(403).json({ error: "Only student accounts can join a class group." });
    return;
  }
  const parsed = JoinGroupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const code = parsed.data.code.trim().toUpperCase();
  const [group] = await db
    .select()
    .from(groupsTable)
    .where(eq(groupsTable.joinCode, code))
    .limit(1);
  if (!group) {
    res.status(404).json({ error: "That group code was not found." });
    return;
  }

  await db
    .insert(groupMembershipsTable)
    .values({ groupId: group.id, userId: user.id, role: "member" })
    .onConflictDoNothing();
  const [memberCount] = await db
    .select({ count: count() })
    .from(groupMembershipsTable)
    .where(eq(groupMembershipsTable.groupId, group.id));
  res.json(
    JoinGroupResponse.parse({
      ...group,
      memberCount: memberCount?.count ?? 0,
      accessRole: "member",
    }),
  );
});

router.get("/groups/:groupId/members", async (req, res): Promise<void> => {
  const parsed = ListGroupMembersParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { group, access } = await accessToGroup(parsed.data.groupId, currentUser(req));
  if (!group) {
    res.status(404).json({ error: "Group not found." });
    return;
  }
  if (access !== "faculty" && access !== "admin") {
    res.status(403).json({ error: "Only this group's faculty or student admins can view its members." });
    return;
  }

  const members = await db
    .select({
      userId: campusUsersTable.id,
      email: campusUsersTable.email,
      displayName: campusUsersTable.displayName,
      role: groupMembershipsTable.role,
      joinedAt: groupMembershipsTable.joinedAt,
    })
    .from(groupMembershipsTable)
    .innerJoin(campusUsersTable, eq(groupMembershipsTable.userId, campusUsersTable.id))
    .where(eq(groupMembershipsTable.groupId, group.id))
    .orderBy(asc(campusUsersTable.displayName));
  res.json(ListGroupMembersResponse.parse(members));
});

router.patch("/groups/:groupId/members/:userId/role", async (req, res): Promise<void> => {
  const params = UpdateGroupMemberRoleParams.safeParse(req.params);
  const parsed = UpdateGroupMemberRoleBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({
      error: !params.success ? params.error.message : parsed.success ? "Invalid request." : parsed.error.message,
    });
    return;
  }
  const { group, access } = await accessToGroup(params.data.groupId, currentUser(req));
  if (!group) {
    res.status(404).json({ error: "Group not found." });
    return;
  }
  if (access !== "faculty") {
    res.status(403).json({ error: "Only the group's faculty can appoint student admins." });
    return;
  }

  const [updated] = await db
    .update(groupMembershipsTable)
    .set({ role: parsed.data.role })
    .where(
      and(
        eq(groupMembershipsTable.groupId, group.id),
        eq(groupMembershipsTable.userId, params.data.userId),
      ),
    )
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Student is not a member of this group." });
    return;
  }
  const [student] = await db
    .select({
      userId: campusUsersTable.id,
      email: campusUsersTable.email,
      displayName: campusUsersTable.displayName,
    })
    .from(campusUsersTable)
    .where(eq(campusUsersTable.id, updated.userId))
    .limit(1);
  if (!student) {
    res.status(404).json({ error: "Student profile not found." });
    return;
  }
  res.json(
    UpdateGroupMemberRoleResponse.parse({
      ...student,
      role: updated.role,
      joinedAt: updated.joinedAt,
    }),
  );
});

router.post("/groups/:groupId/assignments", async (req, res): Promise<void> => {
  const params = CreateGroupAssignmentParams.safeParse(req.params);
  const parsed = CreateGroupAssignmentBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({
      error: !params.success ? params.error.message : parsed.success ? "Invalid request." : parsed.error.message,
    });
    return;
  }
  const user = currentUser(req);
  const { group, access } = await accessToGroup(params.data.groupId, user);
  if (!group) {
    res.status(404).json({ error: "Group not found." });
    return;
  }
  if (access !== "faculty" && access !== "admin") {
    res.status(403).json({ error: "Only group faculty or a student admin can assign tasks." });
    return;
  }
  if (access === "admin" && parsed.data.studentIds === undefined) {
    res.status(400).json({ error: "Student admins must select one or more recipients." });
    return;
  }

  const groupMembers = await db
    .select({ userId: groupMembershipsTable.userId })
    .from(groupMembershipsTable)
    .where(eq(groupMembershipsTable.groupId, group.id));
  const allMemberIds = groupMembers.map((member) => member.userId);
  const recipientIds = parsed.data.studentIds ?? allMemberIds;
  if (recipientIds.length === 0) {
    res.status(400).json({ error: "Add students to this group before assigning a task." });
    return;
  }
  if (recipientIds.some((studentId) => !allMemberIds.includes(studentId))) {
    res.status(400).json({ error: "Every recipient must be a member of this group." });
    return;
  }

  const dueDate = dateOnly(parsed.data.dueDate);
  const assignment = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(groupAssignmentsTable)
      .values({
        groupId: group.id,
        createdBy: user.id,
        title: parsed.data.title.trim(),
        category: parsed.data.category.trim(),
        dueDate,
        priority: parsed.data.priority,
      })
      .returning();
    await tx.insert(tasksTable).values(
      recipientIds.map((studentId) => ({
        userId: studentId,
        assignmentId: created.id,
        title: created.title,
        category: created.category,
        dueDate: created.dueDate,
        priority: created.priority,
        recurrence: "None",
      })),
    );
    return created;
  });

  res.status(201).json(
    CreateGroupAssignmentResponse.parse({
      ...assignment,
      studentCount: recipientIds.length,
    }),
  );
});

router.get("/groups/:groupId/report", async (req, res): Promise<void> => {
  const params = GetGroupReportParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { group, access } = await accessToGroup(params.data.groupId, currentUser(req));
  if (!group) {
    res.status(404).json({ error: "Group not found." });
    return;
  }
  if (access !== "faculty") {
    res.status(403).json({ error: "Only the group's faculty can view the full student report." });
    return;
  }

  const report = await db
    .select({
      assignmentId: groupAssignmentsTable.id,
      assignmentTitle: groupAssignmentsTable.title,
      groupId: groupAssignmentsTable.groupId,
      dueDate: groupAssignmentsTable.dueDate,
      priority: groupAssignmentsTable.priority,
      userId: tasksTable.userId,
      studentName: campusUsersTable.displayName,
      studentEmail: campusUsersTable.email,
      isCompleted: tasksTable.isCompleted,
      completedAt: tasksTable.completedAt,
      pointsAwarded: tasksTable.pointsAwarded,
    })
    .from(groupAssignmentsTable)
    .innerJoin(tasksTable, eq(tasksTable.assignmentId, groupAssignmentsTable.id))
    .innerJoin(campusUsersTable, eq(campusUsersTable.id, tasksTable.userId))
    .where(eq(groupAssignmentsTable.groupId, group.id))
    .orderBy(desc(groupAssignmentsTable.createdAt), asc(campusUsersTable.displayName));
  res.json(GetGroupReportResponse.parse(report));
});

router.get("/points", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(pointsLedgerTable)
    .where(eq(pointsLedgerTable.userId, currentUser(req).id))
    .orderBy(desc(pointsLedgerTable.createdAt));
  const total = rows.reduce((sum, entry) => sum + entry.points, 0);
  res.json(
    GetMyPointsResponse.parse({
      total,
      entries: rows.slice(0, 100),
    }),
  );
});

router.post("/points/award", async (req, res): Promise<void> => {
  const user = currentUser(req);
  if (user.role !== "faculty") {
    res.status(403).json({ error: "Only faculty can award points." });
    return;
  }
  const parsed = AwardPointsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (parsed.data.points === 0) {
    res.status(400).json({ error: "Enter a non-zero point adjustment." });
    return;
  }
  const group = await groupById(parsed.data.groupId);
  if (!group || group.facultyId !== user.id) {
    res.status(404).json({ error: "Faculty-owned group not found." });
    return;
  }
  const [membership] = await db
    .select()
    .from(groupMembershipsTable)
    .where(
      and(
        eq(groupMembershipsTable.groupId, group.id),
        eq(groupMembershipsTable.userId, parsed.data.userId),
      ),
    )
    .limit(1);
  if (!membership) {
    res.status(404).json({ error: "Student is not a member of this group." });
    return;
  }

  const [entry] = await db
    .insert(pointsLedgerTable)
    .values({
      userId: parsed.data.userId,
      groupId: group.id,
      createdBy: user.id,
      points: parsed.data.points,
      source: "faculty_adjustment",
      reason: parsed.data.reason.trim(),
    })
    .returning();
  res.status(201).json(AwardPointsResponse.parse(entry));
});

export default router;
