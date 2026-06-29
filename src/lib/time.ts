import { prisma } from "@/lib/prisma";

// Minutes logged for many projects at once: time logged directly on a project
// PLUS time logged on tasks belonging to that project. Counts each entry once.
export async function projectTimeMap(projectIds: string[]): Promise<Record<string, number>> {
  if (projectIds.length === 0) return {};

  const tasks = await prisma.task.findMany({
    where: { projectId: { in: projectIds } },
    select: { id: true, projectId: true },
  });
  const taskToProject: Record<string, string> = {};
  for (const t of tasks) if (t.projectId) taskToProject[t.id] = t.projectId;
  const taskIds = tasks.map((t) => t.id);

  const or: any[] = [{ projectId: { in: projectIds } }];
  if (taskIds.length) or.push({ taskId: { in: taskIds } });

  const entries = await prisma.timeEntry.findMany({
    where: { OR: or },
    select: { minutes: true, projectId: true, taskId: true },
  });

  const map: Record<string, number> = {};
  for (const e of entries) {
    // Prefer a direct project match; otherwise roll up via the task's project.
    const pid =
      e.projectId && projectIds.includes(e.projectId)
        ? e.projectId
        : e.taskId
        ? taskToProject[e.taskId]
        : undefined;
    if (pid) map[pid] = (map[pid] ?? 0) + e.minutes;
  }
  return map;
}

export async function projectTimeMinutes(projectId: string): Promise<number> {
  const map = await projectTimeMap([projectId]);
  return map[projectId] ?? 0;
}
