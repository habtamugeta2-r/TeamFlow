import type {
  Project,
  Task,
  TaskPriority,
  TaskStatus,
  Workspace,
  WorkspaceRole,
} from "@/lib/teamflow/types";

export type WorkspaceDialogKind = "create" | "rename" | "invite" | "delete";

export type WorkspaceDialogValues = {
  name?: string;
  email?: string;
  role?: Exclude<WorkspaceRole, "OWNER">;
};

export type ProjectFormValues = {
  name: string;
  description: string;
};

export type TaskFormValues = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  dueDate: string | null;
};

export type WorkspaceDialogProps = {
  kind: WorkspaceDialogKind;
  workspace?: Workspace;
  canInviteAdmin: boolean;
  pending: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (values: WorkspaceDialogValues) => void;
};

export type ProjectDialogProps = {
  project?: Project;
  pending: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (values: ProjectFormValues) => void;
};

export type TaskDialogProps = {
  task?: Task;
  members: import("@/lib/teamflow/types").WorkspaceMember[];
  pending: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (values: TaskFormValues) => void;
};

export type TaskFilterState = {
  status: TaskStatus | "";
  priority: TaskPriority | "";
  assigneeId: string;
};

export const taskStatusTransitions: Record<TaskStatus, TaskStatus[]> = {
  TODO: ["TODO", "IN_PROGRESS"],
  IN_PROGRESS: ["TODO", "IN_PROGRESS", "DONE"],
  DONE: ["TODO", "IN_PROGRESS", "DONE"],
};
