import { apiRequest } from "../api";
import type { Workspace, WorkspaceMember, WorkspaceRole } from "./types";

export async function listWorkspaces(): Promise<Workspace[]> {
  const result = await apiRequest<{ workspaces: Workspace[] }>(
    "/api/workspaces",
  );
  return result.workspaces;
}

export async function listWorkspaceMembers(
  workspaceId: string,
): Promise<WorkspaceMember[]> {
  const result = await apiRequest<{ members: WorkspaceMember[] }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/members`,
  );
  return result.members;
}

export async function createWorkspace(name: string): Promise<string> {
  const result = await apiRequest<{ workspace: Pick<Workspace, "id"> }>(
    "/api/workspaces",
    {
      method: "POST",
      body: JSON.stringify({ name }),
    },
  );
  return result.workspace.id;
}

export async function renameWorkspace(
  workspaceId: string,
  name: string,
): Promise<void> {
  await apiRequest<{ workspace: Workspace }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ name }),
    },
  );
}

export async function deleteWorkspace(workspaceId: string): Promise<void> {
  await apiRequest<void>(`/api/workspaces/${encodeURIComponent(workspaceId)}`, {
    method: "DELETE",
  });
}

export async function inviteMember(
  workspaceId: string,
  email: string,
  role: Exclude<WorkspaceRole, "OWNER">,
): Promise<void> {
  await apiRequest<{ membership: WorkspaceMember }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/members`,
    {
      method: "POST",
      body: JSON.stringify({ email, role }),
    },
  );
}

export async function changeMemberRole(
  workspaceId: string,
  membershipId: string,
  role: WorkspaceRole,
): Promise<void> {
  await apiRequest<{ membership: WorkspaceMember }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(membershipId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ role }),
    },
  );
}

export async function removeMember(
  workspaceId: string,
  membershipId: string,
): Promise<void> {
  await apiRequest<void>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(membershipId)}`,
    { method: "DELETE" },
  );
}
