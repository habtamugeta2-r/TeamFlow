"use client";

import {
  CalendarDays,
  ListTodo,
  LoaderCircle,
  Pencil,
  Plus,
} from "lucide-react";
import type {
  Project,
  Task,
  TaskPriority,
  TaskStatus,
  WorkspaceMember,
} from "@/lib/teamflow/types";
import {
  taskStatusTransitions,
  type TaskFilterState,
} from "@/features/dashboard/types";
import { formattedDate } from "@/lib/format";

type TaskSectionProps = {
  activeProject?: Project;
  projectCount: number;
  tasks: Task[];
  members: WorkspaceMember[];
  loading: boolean;
  error: string;
  total: number;
  page: number;
  totalPages: number;
  filters: TaskFilterState;
  busy: boolean;
  onCreate: () => void;
  onRetry: () => void;
  onFiltersChange: (filters: Partial<TaskFilterState>) => void;
  onPageChange: (page: number) => void;
  onStatusChange: (task: Task, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
};

export default function TaskSection({
  activeProject,
  projectCount,
  tasks,
  members,
  loading,
  error,
  total,
  page,
  totalPages,
  filters,
  busy,
  onCreate,
  onRetry,
  onFiltersChange,
  onPageChange,
  onStatusChange,
  onEdit,
}: TaskSectionProps) {
  return (
    <section className="task-section" id="tasks">
      <div className="section-heading">
        <div>
          <p className="eyebrow">MAKE PROGRESS TOGETHER</p>
          <h2>
            Tasks <span>{total}</span>
          </h2>
        </div>
        <button
          className="button button-primary"
          type="button"
          onClick={onCreate}
          disabled={!activeProject || Boolean(activeProject.archivedAt)}
        >
          <Plus size={16} /> New task
        </button>
      </div>

      {!activeProject ? (
        <div className="task-state">
          {projectCount === 0
            ? "Create a project before adding tasks."
            : "Select a project to view its tasks."}
        </div>
      ) : (
        <>
          <div className="task-toolbar">
            <label className="field-label">
              Status
              <select
                value={filters.status}
                onChange={(event) =>
                  onFiltersChange({
                    status: event.target.value as TaskStatus | "",
                  })
                }
              >
                <option value="">All statuses</option>
                <option value="TODO">To do</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="DONE">Done</option>
              </select>
            </label>
            <label className="field-label">
              Priority
              <select
                value={filters.priority}
                onChange={(event) =>
                  onFiltersChange({
                    priority: event.target.value as TaskPriority | "",
                  })
                }
              >
                <option value="">All priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </label>
            <label className="field-label">
              Assignee
              <select
                value={filters.assigneeId}
                onChange={(event) =>
                  onFiltersChange({ assigneeId: event.target.value })
                }
              >
                <option value="">All assignees</option>
                <option value="unassigned">Unassigned</option>
                {members.map((member) => (
                  <option value={member.userId} key={member.userId}>
                    {member.user.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="task-list" aria-busy={loading}>
            {loading ? (
              <div className="task-state">
                <LoaderCircle className="spin" size={18} /> Loading tasks
              </div>
            ) : error ? (
              <div className="task-state task-state-error" role="alert">
                <span>{error}</span>
                <button
                  className="button button-quiet"
                  type="button"
                  onClick={onRetry}
                >
                  Retry
                </button>
              </div>
            ) : tasks.length === 0 ? (
              <div className="task-state">
                {filters.status || filters.priority || filters.assigneeId
                  ? "No tasks match these filters."
                  : "No tasks in this project yet."}
              </div>
            ) : (
              tasks.map((task) => (
                <article className="task-row" key={task.id}>
                  <div className="task-main">
                    <div className="task-title-row">
                      <ListTodo size={16} aria-hidden="true" />
                      <h3>{task.title}</h3>
                    </div>
                    {task.description && (
                      <p className="task-description">{task.description}</p>
                    )}
                    <div className="task-meta">
                      <span
                        className={`priority-pill priority-${task.priority.toLowerCase()}`}
                      >
                        {task.priority.toLowerCase()}
                      </span>
                      <span>{task.assignee?.name ?? "Unassigned"}</span>
                      {task.dueDate && (
                        <time dateTime={task.dueDate}>
                          <CalendarDays size={13} /> Due{" "}
                          {formattedDate(task.dueDate)}
                        </time>
                      )}
                    </div>
                  </div>
                  <label className="sr-only" htmlFor={`task-status-${task.id}`}>
                    Status for {task.title}
                  </label>
                  <select
                    id={`task-status-${task.id}`}
                    className={`task-status status-${task.status.toLowerCase()}`}
                    value={task.status}
                    disabled={busy || Boolean(activeProject.archivedAt)}
                    onChange={(event) =>
                      onStatusChange(task, event.target.value as TaskStatus)
                    }
                  >
                    {taskStatusTransitions[task.status].map((status) => (
                      <option value={status} key={status}>
                        {status.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                  <button
                    className="icon-button row-action"
                    type="button"
                    title={`Edit ${task.title}`}
                    aria-label={`Edit ${task.title}`}
                    disabled={busy || Boolean(activeProject.archivedAt)}
                    onClick={() => onEdit(task)}
                  >
                    <Pencil size={15} />
                  </button>
                </article>
              ))
            )}
          </div>

          {!loading && !error && totalPages > 0 && (
            <div className="task-pagination">
              <span>
                Page {page} of {totalPages} · {total}{" "}
                {total === 1 ? "task" : "tasks"}
              </span>
              <div>
                <button
                  className="button button-quiet"
                  type="button"
                  onClick={() => onPageChange(Math.max(1, page - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </button>
                <button
                  className="button button-quiet"
                  type="button"
                  onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
