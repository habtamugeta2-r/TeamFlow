"use client";

import { useEffect, useRef, useState } from "react";
import { errorMessage } from "@/lib/error-message";
import { listWorkspaceActivity } from "@/lib/teamflow/activity";
import type { TeamUser, WorkspaceActivity } from "@/lib/teamflow/types";

export function useActivityData(user: TeamUser | null, workspaceId: string) {
  const [activities, setActivities] = useState<WorkspaceActivity[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const workspaceIdRef = useRef(workspaceId);

  useEffect(() => {
    workspaceIdRef.current = workspaceId;
  }, [workspaceId]);

  useEffect(() => {
    let cancelled = false;

    async function loadActivity() {
      if (!user || !workspaceId) {
        setActivities([]);
        setPage(1);
        setTotalPages(0);
        setError("");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      setActivities([]);
      setPage(1);
      try {
        const result = await listWorkspaceActivity(workspaceId);
        if (cancelled) return;
        setActivities(result.activities);
        setPage(result.pagination.page);
        setTotalPages(result.pagination.totalPages);
      } catch (reason) {
        if (!cancelled) setError(errorMessage(reason));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadActivity();
    return () => {
      cancelled = true;
    };
  }, [user, workspaceId, refreshKey]);

  async function loadMore() {
    if (!workspaceId || loadingMore || page >= totalPages) return;
    const requestedWorkspaceId = workspaceId;
    const nextPage = page + 1;
    setLoadingMore(true);
    setError("");
    try {
      const result = await listWorkspaceActivity(
        requestedWorkspaceId,
        nextPage,
      );
      if (workspaceIdRef.current !== requestedWorkspaceId) return;
      setActivities((current) => [...current, ...result.activities]);
      setPage(result.pagination.page);
      setTotalPages(result.pagination.totalPages);
    } catch (reason) {
      if (workspaceIdRef.current === requestedWorkspaceId) {
        setError(errorMessage(reason));
      }
    } finally {
      setLoadingMore(false);
    }
  }

  return {
    activities,
    page,
    totalPages,
    loading,
    loadingMore,
    error,
    refresh: () => setRefreshKey((key) => key + 1),
    loadMore,
  };
}
