"use client";

import { useEffect, useState } from "react";
import { errorMessage } from "@/lib/error-message";
import { listProjects } from "@/lib/teamflow/projects";
import type { Project, TeamUser } from "@/lib/teamflow/types";

export function useProjectData(user: TeamUser | null, workspaceId: string) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState("");
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const activeProject = projects.find(
    (project) => project.id === activeProjectId,
  );

  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      if (!user || !workspaceId) {
        setProjects([]);
        setActiveProjectId("");
        setProjectsError("");
        setProjectsLoading(false);
        return;
      }
      setProjectsLoading(true);
      setProjectsError("");
      try {
        const nextProjects = await listProjects(workspaceId);
        if (cancelled) return;
        setProjects(nextProjects);
        setActiveProjectId((current) =>
          nextProjects.some((project) => project.id === current)
            ? current
            : (nextProjects[0]?.id ?? ""),
        );
      } catch (reason) {
        if (!cancelled) setProjectsError(errorMessage(reason));
      } finally {
        if (!cancelled) setProjectsLoading(false);
      }
    }

    void loadProjects();
    return () => {
      cancelled = true;
    };
  }, [user, workspaceId, refreshKey]);

  return {
    projects,
    setProjects,
    activeProjectId,
    setActiveProjectId,
    activeProject,
    projectsLoading,
    projectsError,
    refreshProjects: () => setRefreshKey((key) => key + 1),
  };
}
