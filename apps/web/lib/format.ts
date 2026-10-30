import type { WorkspaceActivity } from "./teamflow/types";

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function formattedDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function formattedTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function dateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function activityCopy(activity: WorkspaceActivity): {
  message: string;
  detail: string;
} {
  const verbs: Record<WorkspaceActivity["eventType"], string> = {
    PROJECT_CREATED: "created a project",
    PROJECT_UPDATED: "updated a project",
    PROJECT_ARCHIVED: "archived a project",
    TASK_CREATED: "created a task",
    TASK_UPDATED: "updated a task",
    TASK_STATUS_CHANGED: "changed task status",
    TASK_COMPLETED: "completed a task",
    TASK_ASSIGNED: "assigned a task",
    TASK_UNASSIGNED: "unassigned a task",
    TASK_PRIORITY_CHANGED: "changed task priority",
  };
  const subject =
    (typeof activity.details.name === "string" && activity.details.name) ||
    (typeof activity.details.title === "string" && activity.details.title);
  const message = `${activity.actorName} ${verbs[activity.eventType]}${subject ? `: ${subject}` : ""}.`;
  const from = activity.details.from;
  const to = activity.details.to;
  const detail =
    typeof from === "string" && typeof to === "string"
      ? `${from.replaceAll("_", " ")} → ${to.replaceAll("_", " ")}`
      : activity.details.changes && typeof activity.details.changes === "object"
        ? `Updated ${Object.keys(activity.details.changes).join(", ")}`
        : "";

  return { message, detail };
}
