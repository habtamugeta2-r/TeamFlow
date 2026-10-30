export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER";

export type TeamUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

export type Workspace = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  membership: {
    role: WorkspaceRole;
    joinedAt: string;
  };
};

export type Project = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

export type Task = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  assignee: Pick<TeamUser, "id" | "name" | "email"> | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TaskPage = {
  tasks: Task[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type TaskListFilters = {
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  page?: number;
  limit?: number;
};

export type WorkspaceMember = {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  createdAt: string;
  updatedAt: string;
  user: Pick<TeamUser, "id" | "name" | "email">;
};

export type ActivityEventType =
  | "PROJECT_CREATED"
  | "PROJECT_UPDATED"
  | "PROJECT_ARCHIVED"
  | "TASK_CREATED"
  | "TASK_UPDATED"
  | "TASK_STATUS_CHANGED"
  | "TASK_COMPLETED"
  | "TASK_ASSIGNED"
  | "TASK_UNASSIGNED"
  | "TASK_PRIORITY_CHANGED";

export type WorkspaceActivity = {
  id: string;
  actorId: string | null;
  actorName: string;
  actorEmail: string;
  eventType: ActivityEventType;
  resourceType: "PROJECT" | "TASK";
  resourceId: string;
  details: Record<string, unknown>;
  createdAt: string;
};

export type ActivityPage = {
  activities: WorkspaceActivity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
