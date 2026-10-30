"use client";

import {
  Check,
  ChevronDown,
  Layers3,
  LogOut,
  Plus,
  ShieldCheck,
  X,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { initials } from "@/lib/format";
import type { TeamUser, Workspace } from "@/lib/teamflow/types";

type DashboardShellProps = {
  user: TeamUser;
  workspaces: Workspace[];
  activeWorkspaceId: string;
  activeWorkspace?: Workspace;
  busy: boolean;
  error: string;
  notice: string;
  children: ReactNode;
  onCreateWorkspace: () => void;
  onSelectWorkspace: (workspaceId: string) => void;
  onSignOut: () => void;
  onDismissError: () => void;
};

export default function DashboardShell({
  user,
  workspaces,
  activeWorkspaceId,
  activeWorkspace,
  busy,
  error,
  notice,
  children,
  onCreateWorkspace,
  onSelectWorkspace,
  onSignOut,
  onDismissError,
}: DashboardShellProps) {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="TeamFlow home">
          <span className="brand-mark">
            <Layers3 size={19} strokeWidth={2.2} />
          </span>
          <span>teamflow</span>
        </Link>

        <div className="sidebar-section">
          <div className="sidebar-label-row">
            <p className="sidebar-label">Your workspaces</p>
            <button
              className="icon-button icon-button-small"
              type="button"
              title="Create workspace"
              aria-label="Create workspace"
              onClick={onCreateWorkspace}
            >
              <Plus size={16} />
            </button>
          </div>
          {workspaces.length > 0 ? (
            <nav className="workspace-nav" aria-label="Workspaces">
              {workspaces.map((workspace) => (
                <button
                  className={`workspace-nav-item ${workspace.id === activeWorkspaceId ? "is-active" : ""}`}
                  key={workspace.id}
                  type="button"
                  aria-current={
                    workspace.id === activeWorkspaceId ? "page" : undefined
                  }
                  onClick={() => onSelectWorkspace(workspace.id)}
                >
                  <span className="workspace-glyph">
                    {initials(workspace.name).slice(0, 1)}
                  </span>
                  <span className="workspace-nav-name">{workspace.name}</span>
                  {workspace.id === activeWorkspaceId && (
                    <ChevronDown className="workspace-current" size={14} />
                  )}
                </button>
              ))}
            </nav>
          ) : (
            <p className="sidebar-empty">
              Create a workspace to bring your team together.
            </p>
          )}
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-status">
            <span /> Workspace data is up to date
          </div>
          <div className="account-row">
            <span className="avatar avatar-self">{initials(user.name)}</span>
            <span className="account-copy">
              <strong>{user.name}</strong>
              <small>{user.email}</small>
            </span>
            <button
              className="icon-button account-logout"
              type="button"
              title="Sign out"
              aria-label="Sign out"
              onClick={onSignOut}
              disabled={busy}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      <div className="main-panel">
        <header className="topbar">
          <div className="breadcrumbs">
            <span>WORKSPACE</span>
            <span className="breadcrumb-slash">/</span>
            <strong>{activeWorkspace?.name ?? "Overview"}</strong>
          </div>
          <div className="topbar-right">
            <span className="secure-label">
              <ShieldCheck size={15} /> Private team space
            </span>
            <button
              className="mobile-signout"
              type="button"
              onClick={onSignOut}
              disabled={busy}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={17} />
            </button>
          </div>
        </header>

        <div className="page-content">
          {(error || notice) && (
            <div
              className={`notice-bar ${error ? "notice-error" : "notice-success"}`}
              role={error ? "alert" : "status"}
            >
              <span>{error || notice}</span>
              {error && (
                <button
                  type="button"
                  onClick={onDismissError}
                  aria-label="Dismiss message"
                >
                  <X size={16} />
                </button>
              )}
              {notice && <Check size={16} />}
            </div>
          )}
          {children}
        </div>
      </div>
    </main>
  );
}
