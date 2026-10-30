"use client";

import {
  Activity,
  ArrowRight,
  CalendarDays,
  FolderKanban,
  LayoutGrid,
  ListTodo,
  Plus,
  Search,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { formattedDate, initials } from "@/lib/format";
import type { Workspace } from "@/lib/teamflow/types";

type WorkspaceDirectoryProps = {
  workspaces: Workspace[];
  onCreateWorkspace: () => void;
  onSelectWorkspace: (workspaceId: string) => void;
};

const workspaceFeatures = [
  { label: "Projects", icon: FolderKanban },
  { label: "Tasks", icon: ListTodo },
  { label: "People", icon: UsersRound },
  { label: "Activity", icon: Activity },
];

export default function WorkspaceDirectory({
  workspaces,
  onCreateWorkspace,
  onSelectWorkspace,
}: WorkspaceDirectoryProps) {
  const [query, setQuery] = useState("");
  const manageableCount = workspaces.filter(
    ({ membership }) =>
      membership.role === "OWNER" || membership.role === "ADMIN",
  ).length;
  const filteredWorkspaces = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return workspaces;
    return workspaces.filter((workspace) =>
      workspace.name.toLocaleLowerCase().includes(normalizedQuery),
    );
  }, [query, workspaces]);

  return (
    <div className="workspace-directory">
      <section className="directory-heading">
        <div>
          <p className="eyebrow">YOUR TEAM SPACES</p>
          <h1>All your teams, together.</h1>
          <p className="directory-description">
            Pick up where your team left off, or create a new space for the next
            project.
          </p>
        </div>
        <button
          className="button button-primary"
          type="button"
          onClick={onCreateWorkspace}
        >
          <Plus size={16} /> New workspace
        </button>
      </section>

      <section className="directory-summary" aria-label="Workspace summary">
        <div className="directory-stat">
          <span className="directory-stat-icon">
            <LayoutGrid size={17} />
          </span>
          <span>
            <strong>{workspaces.length}</strong>
            <small>
              {workspaces.length === 1 ? "team space" : "team spaces"}
            </small>
          </span>
        </div>
        <div className="directory-stat">
          <span className="directory-stat-icon directory-stat-icon-admin">
            <ShieldCheck size={17} />
          </span>
          <span>
            <strong>{manageableCount}</strong>
            <small>
              {manageableCount === 1 ? "space you manage" : "spaces you manage"}
            </small>
          </span>
        </div>
        <div className="directory-summary-note">
          <span className="directory-online-dot" />
          One place for projects, tasks, people, and team updates.
        </div>
      </section>

      <section className="directory-list" aria-labelledby="directory-title">
        <div className="directory-list-heading">
          <div>
            <p className="eyebrow">YOUR WORKSPACES</p>
            <h2 id="directory-title">Choose a team space</h2>
          </div>
          {workspaces.length > 0 && (
            <label className="directory-search">
              <Search size={16} aria-hidden="true" />
              <span className="sr-only">Search workspaces</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find a workspace"
              />
            </label>
          )}
        </div>

        {filteredWorkspaces.length > 0 ? (
          <div className="directory-grid">
            {filteredWorkspaces.map((workspace) => (
              <article className="directory-card" key={workspace.id}>
                <div className="directory-card-top">
                  <span className="directory-card-mark">
                    {initials(workspace.name).slice(0, 1)}
                  </span>
                  <span
                    className={`directory-role directory-role-${workspace.membership.role.toLowerCase()}`}
                  >
                    {workspace.membership.role.toLowerCase()}
                  </span>
                </div>
                <h3>{workspace.name}</h3>
                <p className="directory-card-date">
                  <CalendarDays size={14} aria-hidden="true" />
                  Joined {formattedDate(workspace.membership.joinedAt)}
                </p>
                <ul className="directory-features" aria-label="Workspace tools">
                  {workspaceFeatures.map(({ label, icon: Icon }) => (
                    <li key={label}>
                      <Icon size={13} aria-hidden="true" />
                      {label}
                    </li>
                  ))}
                </ul>
                <button
                  className="directory-open"
                  type="button"
                  onClick={() => onSelectWorkspace(workspace.id)}
                >
                  Open workspace <ArrowRight size={16} aria-hidden="true" />
                </button>
              </article>
            ))}
          </div>
        ) : workspaces.length === 0 ? (
          <div className="directory-empty">
            <span className="directory-empty-mark">
              <UsersRound size={23} />
            </span>
            <h3>Your first team space starts here.</h3>
            <p>
              Create a workspace to bring your projects, tasks, and teammates
              together.
            </p>
            <button
              className="button button-primary"
              type="button"
              onClick={onCreateWorkspace}
            >
              <Plus size={16} /> Create a workspace
            </button>
          </div>
        ) : (
          <div className="directory-empty directory-no-results">
            <span className="directory-empty-mark">
              <Search size={21} />
            </span>
            <h3>No matching workspaces</h3>
            <p>
              Try a different search, or clear the search to see every team.
            </p>
            <button
              className="button button-quiet"
              type="button"
              onClick={() => setQuery("")}
            >
              Clear search
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
