"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { errorMessage } from "@/lib/error-message";
import { getCurrentUser, signOut } from "@/lib/teamflow/auth";
import { listWorkspaces } from "@/lib/teamflow/workspaces";
import type { TeamUser, Workspace } from "@/lib/teamflow/types";

export function useDashboardSession() {
  const router = useRouter();
  const [user, setUser] = useState<TeamUser | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        const currentUser = await getCurrentUser();
        const nextWorkspaces = await listWorkspaces();
        if (cancelled) return;
        setUser(currentUser);
        setWorkspaces(nextWorkspaces);
        setActiveWorkspaceId(nextWorkspaces[0]?.id ?? "");
      } catch (reason) {
        if (!cancelled) {
          if (reason instanceof ApiError && reason.status === 401) {
            router.replace("/");
          } else {
            setError(errorMessage(reason));
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void initialize();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function reloadWorkspaces(preferredId = activeWorkspaceId) {
    const nextWorkspaces = await listWorkspaces();
    const nextActiveId = nextWorkspaces.some((item) => item.id === preferredId)
      ? preferredId
      : (nextWorkspaces[0]?.id ?? "");
    setWorkspaces(nextWorkspaces);
    setActiveWorkspaceId(nextActiveId);
    return nextActiveId;
  }

  async function endSession() {
    await signOut();
    router.replace("/");
  }

  return {
    user,
    workspaces,
    setWorkspaces,
    activeWorkspaceId,
    setActiveWorkspaceId,
    loading,
    error,
    setError,
    reloadWorkspaces,
    endSession,
  };
}
