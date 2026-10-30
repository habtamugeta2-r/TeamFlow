"use client";

import { useState } from "react";
import { createTask, updateTask } from "@/lib/teamflow/tasks";
import type { Task } from "@/lib/teamflow/types";
import type { TaskFormValues } from "@/features/dashboard/types";
import { dateInputValue } from "@/lib/format";
import type { useActionRunner } from "./use-action-runner";

type ActionRunner = ReturnType<typeof useActionRunner>;

export function useTaskActions({
  workspaceId,
  projectId,
  refreshTasks,
  refreshActivity,
  runAction,
}: {
  workspaceId: string;
  projectId: string;
  refreshTasks: () => void;
  refreshActivity: () => void;
  runAction: ActionRunner["runAction"];
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task>();

  async function submitTask(values: TaskFormValues) {
    if (!workspaceId || !projectId) return;
    await runAction({
      action: async () => {
        if (editingTask) {
          await updateTask(workspaceId, projectId, editingTask.id, {
            title: values.title.trim(),
            description: values.description.trim() || null,
            status: values.status,
            priority: values.priority,
            ...(values.assigneeId !== editingTask.assigneeId
              ? { assigneeId: values.assigneeId }
              : {}),
            ...(dateInputValue(values.dueDate) !==
            dateInputValue(editingTask.dueDate)
              ? { dueDate: values.dueDate }
              : {}),
          });
        } else {
          await createTask(workspaceId, projectId, {
            title: values.title.trim(),
            ...(values.description.trim()
              ? { description: values.description.trim() }
              : {}),
            priority: values.priority,
            assigneeId: values.assigneeId,
            dueDate: values.dueDate,
          });
        }
      },
      successMessage: editingTask ? "Task updated." : "Task created.",
      onSuccess: () => {
        setDialogOpen(false);
        setEditingTask(undefined);
        refreshTasks();
        refreshActivity();
      },
    });
  }

  async function changeStatus(task: Task, status: Task["status"]) {
    if (!workspaceId || !projectId || status === task.status) return;
    await runAction({
      action: async () => {
        await updateTask(workspaceId, projectId, task.id, { status });
      },
      successMessage: "Task status updated.",
      onSuccess: () => {
        refreshTasks();
        refreshActivity();
      },
    });
  }

  return {
    dialogOpen,
    setDialogOpen,
    editingTask,
    setEditingTask,
    submitTask,
    changeStatus,
  };
}
