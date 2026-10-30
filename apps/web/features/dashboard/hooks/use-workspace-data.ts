"use client";

import { useEffect, useState } from "react";
import { errorMessage } from "@/lib/error-message";
import { listWorkspaceMembers } from "@/lib/teamflow/workspaces";
import type { TeamUser, WorkspaceMember } from "@/lib/teamflow/types";

export function useWorkspaceData(
  user: TeamUser | null,
  workspaceId: string,
  setError: (message: string) => void,
) {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  async function reloadMembers() {
    if (!workspaceId) {
      setMembers([]);
      return;
    }
    const nextMembers = await listWorkspaceMembers(workspaceId);
    setMembers(nextMembers);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadMembers() {
      if (!user || !workspaceId) {
        setMembers([]);
        setMembersLoading(false);
        return;
      }
      setMembers([]);
      setMembersLoading(true);
      try {
        const nextMembers = await listWorkspaceMembers(workspaceId);
        if (!cancelled) setMembers(nextMembers);
      } catch (reason) {
        if (!cancelled) setError(errorMessage(reason));
      } finally {
        if (!cancelled) setMembersLoading(false);
      }
    }

    void loadMembers();
    return () => {
      cancelled = true;
    };
  }, [user, workspaceId, setError]);

  return { members, setMembers, membersLoading, reloadMembers };
}
