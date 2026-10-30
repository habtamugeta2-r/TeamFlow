"use client";

import { LoaderCircle, X } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { dateInputValue } from "@/lib/format";
import { taskStatusTransitions } from "@/features/dashboard/types";
import type { TaskDialogProps } from "@/features/dashboard/types";

export default function TaskDialog({
  task,
  members,
  pending,
  error,
  onClose,
  onSubmit,
}: TaskDialogProps) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState(task?.status ?? "TODO");
  const [priority, setPriority] = useState(task?.priority ?? "MEDIUM");
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? "");
  const [dueDate, setDueDate] = useState(dateInputValue(task?.dueDate));

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, pending]);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <section
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-dialog-title"
      >
        <header className="modal-heading">
          <div>
            <p className="eyebrow">TASK DETAILS</p>
            <h2 id="task-dialog-title">
              {task ? "Edit task" : "Create a task"}
            </h2>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            disabled={pending}
          >
            <X size={18} />
          </button>
        </header>
        <form
          className="dialog-form task-dialog-form"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const date = dueDate
              ? new Date(`${dueDate}T23:59:59`).toISOString()
              : null;
            onSubmit({
              title,
              description,
              status,
              priority,
              assigneeId: assigneeId || null,
              dueDate: date,
            });
          }}
        >
          <label className="field-label">
            Task title
            <input
              autoFocus
              maxLength={200}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </label>
          <label className="field-label">
            Description
            <textarea
              maxLength={5000}
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <div className="task-form-grid">
            <label className="field-label">
              Status
              <select
                value={status}
                disabled={!task}
                onChange={(event) =>
                  setStatus(event.target.value as typeof status)
                }
              >
                {(task ? taskStatusTransitions[task.status] : ["TODO"]).map(
                  (item) => (
                    <option value={item} key={item}>
                      {item.replaceAll("_", " ")}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label className="field-label">
              Priority
              <select
                value={priority}
                onChange={(event) =>
                  setPriority(event.target.value as typeof priority)
                }
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </label>
            <label className="field-label">
              Assignee
              <select
                value={assigneeId}
                onChange={(event) => setAssigneeId(event.target.value)}
              >
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option value={member.userId} key={member.userId}>
                    {member.user.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Due date
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </label>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <footer className="dialog-actions">
            <button
              className="button button-quiet"
              type="button"
              onClick={onClose}
              disabled={pending}
            >
              Cancel
            </button>
            <button
              className="button button-primary"
              disabled={pending || !title.trim()}
            >
              {pending && <LoaderCircle className="spin" size={16} />}
              {task ? "Save task" : "Create task"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
