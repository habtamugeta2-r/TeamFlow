"use client";

import type { useActionRunner } from "./use-action-runner";
import {
  changeMemberRole,
  createWorkspace,
  deleteWorkspace,
  inviteMember,
  listWorkspaces,
  removeMember,
  renameWorkspace,
} from "@/lib/teamflow/workspaces";
import type {
  TeamUser,
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
} from "@/lib/teamflow/types";
import type {
  TaskFilterState,
  WorkspaceDialogKind,
  WorkspaceDialogValues,
} from "@/features/dashboard/types";

type ActionRunner = ReturnType<typeof useActionRunner>;

export function useWorkspaceActions({
  user,
  workspace,
  dialog,
  runAction,
  reloadWorkspaces,
  reloadMembers,
  setWorkspaces,
  endSession,
  onLeave,
  onClearAssignee,
  currentAssigneeFilter,
  closeDialog,
}: {
  user: TeamUser | null;
  workspace?: Workspace;
  dialog: WorkspaceDialogKind | null;
  runAction: ActionRunner["runAction"];
  reloadWorkspaces: (preferredId?: string) => Promise<string>;
  reloadMembers: () => Promise<void>;
  setWorkspaces: (workspaces: Workspace[]) => void;
  endSession: () => Promise<void>;
  onLeave: () => void;
  onClearAssignee: (filters: Partial<TaskFilterState>) => void;
  currentAssigneeFilter: string;
  closeDialog: () => void;
}) {
  async function submitDialog(values: WorkspaceDialogValues) {
    if (dialog === "create" && values.name) {
      await runAction({
        action: async () => {
          const createdId = await createWorkspace(values.name!.trim());
          await reloadWorkspaces(createdId);
        },
        successMessage: "Workspace created.",
        onSuccess: closeDialog,
      });
    } else if (dialog === "rename" && workspace && values.name) {
      await runAction({
        action: async () => {
          await renameWorkspace(workspace.id, values.name!.trim());
          await reloadWorkspaces(workspace.id);
        },
        successMessage: "Workspace name updated.",
        onSuccess: closeDialog,
      });
    } else if (
      dialog === "invite" &&
      workspace &&
      values.email &&
      values.role
    ) {
      await runAction({
        action: () =>
          inviteMember(workspace.id, values.email!.trim(), values.role!),
        successMessage: "Teammate added.",
        refreshMembers: reloadMembers,
        onSuccess: closeDialog,
      });
    } else if (dialog === "delete" && workspace) {
      await runAction({
        action: async () => {
          await deleteWorkspace(workspace.id);
          await reloadWorkspaces();
        },
        successMessage: "Workspace deleted.",
        onSuccess: closeDialog,
      });
    }
  }

  async function signOut() {
    await runAction({
      action: endSession,
      successMessage: "Signed out.",
    });
  }

  async function updateRole(member: WorkspaceMember, role: WorkspaceRole) {
    if (!workspace || !user) return;
    if (
      role === "OWNER" &&
      !window.confirm(
        `Transfer ownership of ${workspace.name} to ${member.user.name}? You will become an admin.`,
      )
    ) {
      return;
    }
    await runAction({
      action: async () => {
        await changeMemberRole(workspace.id, member.id, role);
        if (role === "OWNER") {
          setWorkspaces(await listWorkspaces());
        }
      },
      successMessage:
        role === "OWNER"
          ? "Workspace ownership transferred."
          : "Member role updated.",
      refreshMembers: reloadMembers,
    });
  }

  async function removeWorkspaceMember(member: WorkspaceMember) {
    if (!workspace || !user) return;
    const leaving = member.userId === user.id;
    const prompt = leaving
      ? `Leave ${workspace.name}?`
      : `Remove ${member.user.name} from ${workspace.name}?`;
    if (!window.confirm(prompt)) return;
    const succeeded = await runAction({
      action: async () => {
        await removeMember(workspace.id, member.id);
        if (leaving) await reloadWorkspaces();
      },
      successMessage: leaving ? "You left the workspace." : "Teammate removed.",
      refreshMembers: leaving ? undefined : reloadMembers,
    });
    if (succeeded) {
      if (leaving) onLeave();
      if (currentAssigneeFilter === member.userId) {
        onClearAssignee({ assigneeId: "" });
      }
    }
  }

  return { submitDialog, signOut, updateRole, removeWorkspaceMember };
}
