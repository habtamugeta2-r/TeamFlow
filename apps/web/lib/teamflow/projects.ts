import { apiRequest } from "../api";
import type { Project } from "./types";

export async function listProjects(workspaceId: string): Promise<Project[]> {
  const result = await apiRequest<{ projects: Project[] }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/projects`,
  );
  return result.projects;
}

export async function createProject(
  workspaceId: string,
  name: string,
  description: string,
): Promise<Project> {
  const result = await apiRequest<{ project: Project }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/projects`,
    {
      method: "POST",
      body: JSON.stringify({ name, description }),
    },
  );
  return result.project;
}

export async function updateProject(
  workspaceId: string,
  projectId: string,
  name: string,
  description: string | null,
): Promise<Project> {
  const result = await apiRequest<{ project: Project }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/projects/${encodeURIComponent(projectId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ name, description }),
    },
  );
  return result.project;
}

export async function archiveProject(
  workspaceId: string,
  projectId: string,
): Promise<Project> {
  const result = await apiRequest<{ project: Project }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/projects/${encodeURIComponent(projectId)}/archive`,
    { method: "POST" },
  );
  return result.project;
}
