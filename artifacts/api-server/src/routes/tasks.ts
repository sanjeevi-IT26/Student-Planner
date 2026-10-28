import { and, asc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, groupAssignmentsTable, pointsLedgerTable, tasksTable } from "@workspace/db";
import {
  CompleteTaskParams,
  CompleteTaskResponse,
  CreateTaskBody,
  CreateTaskResponse,
  DeleteTaskParams,
  GetTaskStatsResponse,
  ListTasksResponse,
  UpdateTaskBody,
  UpdateTaskParams,
  UpdateTaskResponse,
  UpdateTaskStatusBody,
  UpdateTaskStatusParams,
  UpdateTaskStatusResponse,
} from "@workspace/api-zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";
import { calculateCompletionPoints } from "../lib/scoring";

const router: IRouter = Router();
const taskRouter = router.use(requireAuth);

function userId(req: Parameters<typeof requireAuth>[0]) {
  return (req as AuthenticatedRequest).userId;
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function nextDueDate(dateValue: string, recurrence: string): string {
  const date = new Date(`${dateValue}T12:00:00.000Z`);
  if (recurrence === "Daily") date.setUTCDate(date.getUTCDate() + 1);
  if (recurrence === "Weekly") date.setUTCDate(date.getUTCDate() + 7);
  if (recurrence === "Monthly") date.setUTCMonth(date.getUTCMonth() + 1);
  return dateOnly(date);
}

async function updateTaskCompletion(taskId: number, ownerId: string, isCompleted: boolean) {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(tasksTable)
      .where(and(eq(tasksTable.id, taskId), eq(tasksTable.userId, ownerId)))
      .limit(1);
    if (!current) return null;
    if (current.isCompleted === isCompleted) {
      return { task: current, nextTask: null };
    }

    const completedAt = isCompleted ? new Date() : null;
    let pointsAwarded = 0;
    let groupId: number | null = null;
    if (current.assignmentId !== null) {
      const [assignment] = await tx
        .select()
        .from(groupAssignmentsTable)
        .where(eq(groupAssignmentsTable.id, current.assignmentId))
        .limit(1);
      groupId = assignment?.groupId ?? null;
      if (isCompleted) {
        pointsAwarded = calculateCompletionPoints(current.dueDate, completedAt!);
      }
    }

    const [task] = await tx
      .update(tasksTable)
      .set({ isCompleted, completedAt, pointsAwarded })
      .where(
        and(
          eq(tasksTable.id, current.id),
          eq(tasksTable.userId, ownerId),
          eq(tasksTable.isCompleted, current.isCompleted),
        ),
      )
      .returning();
    if (!task) {
      const [latest] = await tx
        .select()
        .from(tasksTable)
        .where(and(eq(tasksTable.id, taskId), eq(tasksTable.userId, ownerId)))
        .limit(1);
      return latest ? { task: latest, nextTask: null } : null;
    }

    if (current.assignmentId !== null && isCompleted) {
      await tx.insert(pointsLedgerTable).values({
        userId: ownerId,
        groupId,
        taskId: current.id,
        createdBy: ownerId,
        points: pointsAwarded,
        source: "task_completion",
        reason: "Automatic points for completing an assigned task.",
      });
    } else if (current.assignmentId !== null && current.pointsAwarded !== 0) {
      await tx.insert(pointsLedgerTable).values({
        userId: ownerId,
        groupId,
        taskId: current.id,
        createdBy: ownerId,
        points: -current.pointsAwarded,
        source: "completion_reversal",
        reason: "Automatic points reversed after marking the task unfinished.",
      });
    }

    let nextTask = null;
    if (isCompleted && current.assignmentId === null && current.recurrence !== "None") {
      [nextTask] = await tx
        .insert(tasksTable)
        .values({
          userId: ownerId,
          title: current.title,
          category: current.category,
          dueDate: nextDueDate(current.dueDate, current.recurrence),
          priority: current.priority,
          recurrence: current.recurrence,
          isCompleted: false,
          pointsAwarded: 0,
        })
        .returning();
    }
    return { task, nextTask };
  });
}

taskRouter.get("/tasks", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.userId, userId(req)))
    .orderBy(asc(tasksTable.dueDate), asc(tasksTable.createdAt));
  res.json(ListTasksResponse.parse(rows));
});

taskRouter.post("/tasks", async (req, res): Promise<void> => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [task] = await db
    .insert(tasksTable)
    .values({
      userId: userId(req),
      title: parsed.data.title.trim(),
      category: parsed.data.category.trim(),
      dueDate: dateOnly(parsed.data.dueDate),
      priority: parsed.data.priority,
      recurrence: parsed.data.recurrence,
    })
    .returning();
  res.status(201).json(CreateTaskResponse.parse(task));
});

taskRouter.get("/tasks/stats", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.userId, userId(req)));
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const soon = new Date(today);
  soon.setUTCDate(soon.getUTCDate() + 7);
  const dueSoon = rows.filter((row) => {
    const due = new Date(`${row.dueDate}T00:00:00.000Z`);
    return !row.isCompleted && due >= today && due <= soon;
  }).length;
  const completed = rows.filter((row) => row.isCompleted).length;
  res.json(GetTaskStatsResponse.parse({
    total: rows.length,
    dueSoon,
    completed,
    completionRate: rows.length ? Math.round((completed / rows.length) * 100) : 0,
  }));
});

taskRouter.patch("/tasks/:taskId", async (req, res): Promise<void> => {
  const params = UpdateTaskParams.safeParse(req.params);
  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({
      error: !params.success
        ? params.error.message
        : parsed.success
          ? "Invalid request body"
          : parsed.error.message,
    });
    return;
  }
  const [current] = await db
    .select()
    .from(tasksTable)
    .where(and(eq(tasksTable.id, params.data.taskId), eq(tasksTable.userId, userId(req))))
    .limit(1);
  if (!current) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  if (current.assignmentId !== null) {
    res.status(403).json({ error: "Group-assigned tasks cannot be edited by students." });
    return;
  }

  const updates = {
    ...(parsed.data.title !== undefined ? { title: parsed.data.title.trim() } : {}),
    ...(parsed.data.category !== undefined ? { category: parsed.data.category.trim() } : {}),
    ...(parsed.data.dueDate !== undefined ? { dueDate: dateOnly(parsed.data.dueDate) } : {}),
    ...(parsed.data.priority !== undefined ? { priority: parsed.data.priority } : {}),
    ...(parsed.data.recurrence !== undefined ? { recurrence: parsed.data.recurrence } : {}),
  };
  const [task] = await db
    .update(tasksTable)
    .set(updates)
    .where(and(eq(tasksTable.id, params.data.taskId), eq(tasksTable.userId, userId(req))))
    .returning();
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json(UpdateTaskResponse.parse(task));
});

taskRouter.delete("/tasks/:taskId", async (req, res): Promise<void> => {
  const params = DeleteTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [current] = await db
    .select()
    .from(tasksTable)
    .where(and(eq(tasksTable.id, params.data.taskId), eq(tasksTable.userId, userId(req))))
    .limit(1);
  if (!current) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  if (current.assignmentId !== null) {
    res.status(403).json({ error: "Group-assigned tasks cannot be deleted by students." });
    return;
  }
  const [task] = await db
    .delete(tasksTable)
    .where(and(eq(tasksTable.id, params.data.taskId), eq(tasksTable.userId, userId(req))))
    .returning({ id: tasksTable.id });
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.sendStatus(204);
});

taskRouter.patch("/tasks/:taskId/complete", async (req, res): Promise<void> => {
  const params = CompleteTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const result = await updateTaskCompletion(params.data.taskId, userId(req), true);
  if (!result) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json(CompleteTaskResponse.parse(result));
});

taskRouter.patch("/tasks/:taskId/status", async (req, res): Promise<void> => {
  const params = UpdateTaskStatusParams.safeParse(req.params);
  const parsed = UpdateTaskStatusBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({
      error: !params.success
        ? params.error.message
        : parsed.success
          ? "Invalid request body"
          : parsed.error.message,
    });
    return;
  }

  const result = await updateTaskCompletion(
    params.data.taskId,
    userId(req),
    parsed.data.isCompleted,
  );
  if (!result) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json(UpdateTaskStatusResponse.parse(result.task));
});

export default router;