"use client";

import { useState } from "react";
import {
  archiveProject,
  createProject,
  updateProject,
} from "@/lib/teamflow/projects";
import type { Project } from "@/lib/teamflow/types";
import type { ProjectFormValues } from "@/features/dashboard/types";
import type { useActionRunner } from "./use-action-runner";

type ActionRunner = ReturnType<typeof useActionRunner>;

export function useProjectActions({
  workspaceId,
  setSelectedProjectId,
  refreshProjects,
  refreshActivity,
  runAction,
}: {
  workspaceId: string;
  setSelectedProjectId: (projectId: string) => void;
  refreshProjects: () => void;
  refreshActivity: () => void;
  runAction: ActionRunner["runAction"];
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project>();

  async function submitProject(values: ProjectFormValues) {
    if (!workspaceId) return;
    let savedProject: Project | undefined;
    const wasEditing = Boolean(editingProject);
    const succeeded = await runAction({
      action: async () => {
        savedProject = editingProject
          ? await updateProject(
              workspaceId,
              editingProject.id,
              values.name.trim(),
              values.description.trim() || null,
            )
          : await createProject(
              workspaceId,
              values.name.trim(),
              values.description.trim(),
            );
      },
      successMessage: wasEditing ? "Project updated." : "Project created.",
      onSuccess: () => {
        if (savedProject && !wasEditing) {
          setSelectedProjectId(savedProject.id);
        }
        setDialogOpen(false);
        setEditingProject(undefined);
        refreshProjects();
        refreshActivity();
      },
    });
    if (!succeeded) return;
  }

  async function archiveSelectedProject(project: Project) {
    if (!workspaceId) return;
    if (
      !window.confirm(
        `Archive ${project.name}? Its tasks will become read-only.`,
      )
    ) {
      return;
    }
    await runAction({
      action: async () => {
        await archiveProject(workspaceId, project.id);
      },
      successMessage: "Project archived.",
      onSuccess: () => {
        refreshProjects();
        refreshActivity();
      },
    });
  }

  return {
    dialogOpen,
    setDialogOpen,
    editingProject,
    setEditingProject,
    submitProject,
    archiveSelectedProject,
  };
}
