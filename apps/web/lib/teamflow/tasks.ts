import { apiRequest } from "../api";
import type {
  Task,
  TaskListFilters,
  TaskPage,
  TaskPriority,
  TaskStatus,
} from "./types";

export async function listTasks(
  workspaceId: string,
  projectId: string,
  filters: TaskListFilters = {},
): Promise<TaskPage> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  const queryString = query.size > 0 ? `?${query}` : "";
  return apiRequest<TaskPage>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/projects/${encodeURIComponent(projectId)}/tasks${queryString}`,
  );
}

export async function createTask(
  workspaceId: string,
  projectId: string,
  input: {
    title: string;
    description?: string;
    priority: TaskPriority;
    assigneeId: string | null;
    dueDate: string | null;
  },
): Promise<Task> {
  const result = await apiRequest<{ task: Task }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/projects/${encodeURIComponent(projectId)}/tasks`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return result.task;
}

export async function updateTask(
  workspaceId: string,
  projectId: string,
  taskId: string,
  input: {
    title?: string;
    description?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    assigneeId?: string | null;
    dueDate?: string | null;
  },
): Promise<Task> {
  const result = await apiRequest<{ task: Task }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
  return result.task;
}
