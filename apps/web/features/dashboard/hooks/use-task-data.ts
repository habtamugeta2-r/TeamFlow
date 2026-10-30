"use client";

import { useEffect, useState } from "react";
import { errorMessage } from "@/lib/error-message";
import { listTasks } from "@/lib/teamflow/tasks";
import type { Task, TeamUser } from "@/lib/teamflow/types";
import type { TaskFilterState } from "@/features/dashboard/types";

export function useTaskData(
  user: TeamUser | null,
  workspaceId: string,
  projectId: string,
) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filters, setFilters] = useState<TaskFilterState>({
    status: "",
    priority: "",
    assigneeId: "",
  });

  useEffect(() => {
    let cancelled = false;

    async function loadTasks() {
      if (!user || !workspaceId || !projectId) {
        setTasks([]);
        setPage(1);
        setTotalPages(0);
        setTotal(0);
        setError("");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const result = await listTasks(workspaceId, projectId, {
          status: filters.status || undefined,
          priority: filters.priority || undefined,
          assigneeId: filters.assigneeId || undefined,
          page,
          limit: 20,
        });
        if (cancelled) return;
        const lastPage = Math.max(1, result.pagination.totalPages);
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }
        setTasks(result.tasks);
        setTotal(result.pagination.total);
        setTotalPages(result.pagination.totalPages);
      } catch (reason) {
        if (!cancelled) setError(errorMessage(reason));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadTasks();
    return () => {
      cancelled = true;
    };
  }, [user, workspaceId, projectId, filters, page, refreshKey]);

  function updateFilters(nextFilters: Partial<TaskFilterState>) {
    setFilters((current) => ({ ...current, ...nextFilters }));
    setPage(1);
  }

  function resetFilters() {
    setFilters({ status: "", priority: "", assigneeId: "" });
    setPage(1);
  }

  function clearError() {
    setError("");
  }

  return {
    tasks,
    loading,
    error,
    page,
    setPage,
    totalPages,
    total,
    filters,
    updateFilters,
    resetFilters,
    clearError,
    refresh: () => setRefreshKey((key) => key + 1),
  };
}
