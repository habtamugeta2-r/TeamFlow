"use client";

import { Layers3, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import DashboardShell from "@/features/dashboard/components/dashboard-shell";
import WorkspaceDirectory from "@/features/dashboard/components/workspace-directory";
import WorkspaceOverview from "@/features/dashboard/components/workspace-overview";
import { useActivityData } from "@/features/dashboard/hooks/use-activity-data";
import { useActionRunner } from "@/features/dashboard/hooks/use-action-runner";
import { useDashboardSession } from "@/features/dashboard/hooks/use-dashboard-session";
import { useProjectActions } from "@/features/dashboard/hooks/use-project-actions";
import { useProjectData } from "@/features/dashboard/hooks/use-project-data";
import { useTaskActions } from "@/features/dashboard/hooks/use-task-actions";
import { useTaskData } from "@/features/dashboard/hooks/use-task-data";
import { useWorkspaceData } from "@/features/dashboard/hooks/use-workspace-data";
import { useWorkspaceActions } from "@/features/dashboard/hooks/use-workspace-actions";
import type { WorkspaceDialogKind } from "@/features/dashboard/types";
import WorkspaceDialog from "@/features/dashboard/components/workspace-dialog";
import ProjectDialog from "@/features/dashboard/components/project-dialog";
import TaskDialog from "@/features/dashboard/components/task-dialog";

export default function WorkspaceDashboard({
  workspaceId,
}: {
  workspaceId?: string;
}) {
  const router = useRouter();
  const isDirectory = !workspaceId;
  const session = useDashboardSession(workspaceId);
  const {
    user,
    workspaces,
    setWorkspaces,
    activeWorkspaceId,
    setActiveWorkspaceId,
    loading,
    error: sessionError,
    reloadWorkspaces,
    endSession,
  } = session;
  const actionState = useActionRunner();
  const {
    busy,
    error: actionError,
    setError,
    notice,
    setNotice,
    runAction,
  } = actionState;
  const error = actionError || sessionError;
  const workspaceData = useWorkspaceData(user, activeWorkspaceId, setError);
  const { members, membersLoading, reloadMembers } = workspaceData;
  const projectData = useProjectData(user, activeWorkspaceId);
  const {
    projects,
    activeProjectId,
    setActiveProjectId,
    activeProject,
    projectsLoading,
    projectsError,
    refreshProjects,
  } = projectData;
  const taskData = useTaskData(user, activeWorkspaceId, activeProjectId);
  const {
    tasks,
    loading: tasksLoading,
    error: tasksError,
    page: taskPage,
    setPage: setTaskPage,
    totalPages: taskTotalPages,
    total: taskTotal,
    filters: taskFilters,
    updateFilters: updateTaskFilters,
    resetFilters: resetTaskFilters,
    clearError: clearTaskError,
    refresh: refreshTasks,
  } = taskData;
  const activityData = useActivityData(user, activeWorkspaceId);
  const {
    activities,
    page: activityPage,
    totalPages: activityTotalPages,
    loading: activityLoading,
    loadingMore: activityLoadingMore,
    error: activityError,
    refresh: refreshActivity,
    loadMore: loadMoreActivity,
  } = activityData;
  const projectActions = useProjectActions({
    workspaceId: activeWorkspaceId,
    setSelectedProjectId: setActiveProjectId,
    refreshProjects,
    refreshActivity: activityData.refresh,
    runAction,
  });
  const taskActions = useTaskActions({
    workspaceId: activeWorkspaceId,
    projectId: activeProjectId,
    refreshTasks,
    refreshActivity: activityData.refresh,
    runAction,
  });
  const [dialog, setDialog] = useState<WorkspaceDialogKind | null>(null);

  const activeWorkspace = isDirectory
    ? undefined
    : workspaces.find((item) => item.id === activeWorkspaceId);
  function selectProject(projectId: string) {
    setActiveProjectId(projectId);
    setTaskPage(1);
    resetTaskFilters();
    clearTaskError();
  }

  const workspaceActions = useWorkspaceActions({
    user,
    workspace: activeWorkspace,
    dialog,
    runAction,
    reloadWorkspaces,
    reloadMembers,
    setWorkspaces,
    endSession,
    onLeave: () => {
      setActiveWorkspaceId("");
      router.replace("/dashboard");
    },
    onOpenWorkspace: (id) => router.push(`/dashboard/${id}`),
    onClearAssignee: updateTaskFilters,
    currentAssigneeFilter: taskFilters.assigneeId,
    closeDialog: () => setDialog(null),
  });

  if (loading) {
    return (
      <main className="loading-screen" aria-live="polite">
        <span className="brand-mark">
          <Layers3 size={19} />
        </span>
        <LoaderCircle className="spin" size={18} />
        <span>Opening your workspace</span>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="loading-screen" aria-live="polite">
        <span className="brand-mark">
          <Layers3 size={19} />
        </span>
        {error ? (
          <>
            <p role="alert">{error}</p>
            <Link className="button button-quiet" href="/">
              Return to sign in
            </Link>
          </>
        ) : (
          <>
            <LoaderCircle className="spin" size={18} />
            <span>Opening your workspace</span>
          </>
        )}
      </main>
    );
  }

  return (
    <DashboardShell
      user={user}
      workspaces={workspaces}
      activeWorkspaceId={activeWorkspaceId}
      activeWorkspace={activeWorkspace}
      busy={busy}
      error={error}
      notice={notice}
      onCreateWorkspace={() => setDialog("create")}
      onSelectWorkspace={(workspaceId) => {
        setActiveWorkspaceId(workspaceId);
        setActiveProjectId("");
        setTaskPage(1);
        resetTaskFilters();
        setError("");
        setNotice("");
        router.push(`/dashboard/${workspaceId}`);
      }}
      onSignOut={() => void workspaceActions.signOut()}
      onDismissError={() => setError("")}
    >
      {isDirectory ? (
        <WorkspaceDirectory
          workspaces={workspaces}
          onCreateWorkspace={() => setDialog("create")}
          onSelectWorkspace={(id) => router.push(`/dashboard/${id}`)}
        />
      ) : (
        <WorkspaceOverview
          workspace={activeWorkspace}
          user={user}
          members={members}
          membersLoading={membersLoading}
          isOwner={activeWorkspace?.membership.role === "OWNER"}
          canManageTeam={
            activeWorkspace?.membership.role === "OWNER" ||
            activeWorkspace?.membership.role === "ADMIN"
          }
          busy={busy}
          projects={projects}
          activeProject={activeProject}
          activeProjectId={activeProjectId}
          projectsLoading={projectsLoading}
          projectsError={projectsError}
          tasks={tasks}
          tasksLoading={tasksLoading}
          tasksError={tasksError}
          taskTotal={taskTotal}
          taskPage={taskPage}
          taskTotalPages={taskTotalPages}
          taskFilters={taskFilters}
          activity={{
            events: activities,
            page: activityPage,
            totalPages: activityTotalPages,
            loading: activityLoading,
            loadingMore: activityLoadingMore,
            error: activityError,
          }}
          onCreateWorkspace={() => setDialog("create")}
          onRenameWorkspace={() => setDialog("rename")}
          onDeleteWorkspace={() => setDialog("delete")}
          onCreateProject={() => {
            projectActions.setEditingProject(undefined);
            projectActions.setDialogOpen(true);
          }}
          onEditProject={(project) => {
            projectActions.setEditingProject(project);
            projectActions.setDialogOpen(true);
          }}
          onArchiveProject={(project) =>
            void projectActions.archiveSelectedProject(project)
          }
          onSelectProject={selectProject}
          onRetryProjects={refreshProjects}
          onCreateTask={() => {
            taskActions.setEditingTask(undefined);
            taskActions.setDialogOpen(true);
          }}
          onEditTask={(task) => {
            taskActions.setEditingTask(task);
            taskActions.setDialogOpen(true);
          }}
          onChangeTaskStatus={(task, status) =>
            void taskActions.changeStatus(task, status)
          }
          onRetryTasks={refreshTasks}
          onTaskFiltersChange={updateTaskFilters}
          onTaskPageChange={setTaskPage}
          onInviteMember={() => setDialog("invite")}
          onUpdateMemberRole={(member, role) =>
            void workspaceActions.updateRole(member, role)
          }
          onRemoveMember={(member) =>
            void workspaceActions.removeWorkspaceMember(member)
          }
          onRetryActivity={refreshActivity}
          onLoadMoreActivity={() => void loadMoreActivity()}
        />
      )}

      {dialog && (
        <WorkspaceDialog
          kind={dialog}
          workspace={activeWorkspace}
          canInviteAdmin={activeWorkspace?.membership.role === "OWNER"}
          pending={busy}
          error={error}
          onClose={() => setDialog(null)}
          onSubmit={(values) => void workspaceActions.submitDialog(values)}
        />
      )}
      {projectActions.dialogOpen && (
        <ProjectDialog
          key={projectActions.editingProject?.id ?? "new-project"}
          project={projectActions.editingProject}
          pending={busy}
          error={error}
          onClose={() => {
            projectActions.setDialogOpen(false);
            projectActions.setEditingProject(undefined);
          }}
          onSubmit={(values) => void projectActions.submitProject(values)}
        />
      )}
      {taskActions.dialogOpen && (
        <TaskDialog
          key={taskActions.editingTask?.id ?? "new-task"}
          task={taskActions.editingTask}
          members={members}
          pending={busy}
          error={error}
          onClose={() => {
            taskActions.setDialogOpen(false);
            taskActions.setEditingTask(undefined);
          }}
          onSubmit={(values) => void taskActions.submitTask(values)}
        />
      )}
    </DashboardShell>
  );
}
