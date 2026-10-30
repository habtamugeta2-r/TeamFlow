"use client";

import { Pencil, Plus, Trash2, UsersRound } from "lucide-react";
import ActivityFeed from "@/features/dashboard/components/activity-feed";
import MembersSection from "@/features/dashboard/components/members-section";
import ProjectSection from "@/features/dashboard/components/project-section";
import TaskSection from "@/features/dashboard/components/task-section";
import type { TaskFilterState } from "@/features/dashboard/types";
import { formattedDate } from "@/lib/format";
import type {
  Project,
  Task,
  TaskStatus,
  TeamUser,
  Workspace,
  WorkspaceActivity,
  WorkspaceMember,
  WorkspaceRole,
} from "@/lib/teamflow/types";

type WorkspaceOverviewProps = {
  workspace?: Workspace;
  user: TeamUser;
  members: WorkspaceMember[];
  membersLoading: boolean;
  isOwner: boolean;
  canManageTeam: boolean;
  busy: boolean;
  projects: Project[];
  activeProject?: Project;
  activeProjectId: string;
  projectsLoading: boolean;
  projectsError: string;
  tasks: Task[];
  tasksLoading: boolean;
  tasksError: string;
  taskTotal: number;
  taskPage: number;
  taskTotalPages: number;
  taskFilters: TaskFilterState;
  activity: {
    events: WorkspaceActivity[];
    page: number;
    totalPages: number;
    loading: boolean;
    loadingMore: boolean;
    error: string;
  };
  onCreateWorkspace: () => void;
  onRenameWorkspace: () => void;
  onDeleteWorkspace: () => void;
  onCreateProject: () => void;
  onEditProject: (project: Project) => void;
  onArchiveProject: (project: Project) => void;
  onSelectProject: (projectId: string) => void;
  onRetryProjects: () => void;
  onCreateTask: () => void;
  onEditTask: (task: Task) => void;
  onChangeTaskStatus: (task: Task, status: TaskStatus) => void;
  onRetryTasks: () => void;
  onTaskFiltersChange: (filters: Partial<TaskFilterState>) => void;
  onTaskPageChange: (page: number) => void;
  onInviteMember: () => void;
  onUpdateMemberRole: (member: WorkspaceMember, role: WorkspaceRole) => void;
  onRemoveMember: (member: WorkspaceMember) => void;
  onRetryActivity: () => void;
  onLoadMoreActivity: () => void;
};

export default function WorkspaceOverview({
  workspace,
  user,
  members,
  membersLoading,
  isOwner,
  canManageTeam,
  busy,
  projects,
  activeProject,
  activeProjectId,
  projectsLoading,
  projectsError,
  tasks,
  tasksLoading,
  tasksError,
  taskTotal,
  taskPage,
  taskTotalPages,
  taskFilters,
  activity,
  onCreateWorkspace,
  onRenameWorkspace,
  onDeleteWorkspace,
  onCreateProject,
  onEditProject,
  onArchiveProject,
  onSelectProject,
  onRetryProjects,
  onCreateTask,
  onEditTask,
  onChangeTaskStatus,
  onRetryTasks,
  onTaskFiltersChange,
  onTaskPageChange,
  onInviteMember,
  onUpdateMemberRole,
  onRemoveMember,
  onRetryActivity,
  onLoadMoreActivity,
}: WorkspaceOverviewProps) {
  if (!workspace) {
    return (
      <section className="empty-workspace" id="overview">
        <p className="eyebrow">A PLACE FOR YOUR PEOPLE</p>
        <div className="empty-mark">
          <UsersRound size={25} />
        </div>
        <h1>
          Make a little room
          <br />
          for great work.
        </h1>
        <p className="empty-description">
          Create a workspace for your team. Invite people, set clear roles, and
          keep everyone connected.
        </p>
        <button
          className="button button-primary"
          type="button"
          onClick={onCreateWorkspace}
        >
          <Plus size={17} /> Create a workspace
        </button>
        <span className="empty-footnote">
          Your first workspace is a good place to start.
        </span>
      </section>
    );
  }

  const currentRole = workspace.membership.role;

  return (
    <>
      <section className="workspace-heading" id="overview">
        <div>
          <p className="eyebrow">YOUR TEAM SPACE</p>
          <h1>{workspace.name}</h1>
          <p className="heading-meta">
            Created {formattedDate(workspace.createdAt)} <span>·</span> You
            joined as <strong>{currentRole.toLowerCase()}</strong>
          </p>
        </div>
        <div className="heading-actions">
          {(currentRole === "OWNER" || currentRole === "ADMIN") && (
            <button
              className="button button-quiet"
              type="button"
              onClick={onRenameWorkspace}
            >
              <Pencil size={15} /> Rename
            </button>
          )}
          {isOwner && (
            <button
              className="icon-button danger-icon"
              type="button"
              title="Delete workspace"
              aria-label="Delete workspace"
              onClick={onDeleteWorkspace}
            >
              <Trash2 size={17} />
            </button>
          )}
        </div>
      </section>

      <section className="summary-strip" aria-label="Workspace summary">
        <div className="summary-item">
          <span className="summary-label">People</span>
          <strong>{members.length}</strong>
          <small>in this workspace</small>
        </div>
        <div className="summary-item">
          <span className="summary-label">Your access</span>
          <strong className="summary-role">{currentRole.toLowerCase()}</strong>
          <small>
            {isOwner
              ? "Full workspace control"
              : canManageTeam
                ? "Team administration"
                : "Team member"}
          </small>
        </div>
        <div className="summary-item">
          <span className="summary-label">Workspace status</span>
          <strong className="summary-status">
            <span /> Active
          </strong>
          <small>Shared with your team</small>
        </div>
      </section>

      <ProjectSection
        projects={projects}
        activeProject={activeProject}
        activeProjectId={activeProjectId}
        loading={projectsLoading}
        error={projectsError}
        canManageTeam={canManageTeam}
        busy={busy}
        onRetry={onRetryProjects}
        onCreate={onCreateProject}
        onEdit={onEditProject}
        onArchive={onArchiveProject}
        onSelect={onSelectProject}
      />

      <TaskSection
        activeProject={activeProject}
        projectCount={projects.length}
        tasks={tasks}
        members={members}
        loading={tasksLoading}
        error={tasksError}
        total={taskTotal}
        page={taskPage}
        totalPages={taskTotalPages}
        filters={taskFilters}
        busy={busy}
        onCreate={onCreateTask}
        onRetry={onRetryTasks}
        onFiltersChange={onTaskFiltersChange}
        onPageChange={onTaskPageChange}
        onStatusChange={onChangeTaskStatus}
        onEdit={onEditTask}
      />

      <MembersSection
        members={members}
        user={user}
        role={currentRole}
        loading={membersLoading}
        busy={busy}
        onInvite={onInviteMember}
        onUpdateRole={onUpdateMemberRole}
        onRemove={onRemoveMember}
      />

      <ActivityFeed
        activities={activity.events}
        page={activity.page}
        totalPages={activity.totalPages}
        loading={activity.loading}
        loadingMore={activity.loadingMore}
        error={activity.error}
        onRetry={onRetryActivity}
        onLoadMore={onLoadMoreActivity}
      />
    </>
  );
}
