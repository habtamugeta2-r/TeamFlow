"use client";

import { Pencil, Trash2 } from "lucide-react";
import { formattedDate } from "@/lib/format";
import type { Workspace } from "@/lib/teamflow/types";

type WorkspaceIntroProps = {
  workspace: Workspace;
  memberCount: number;
  isOwner: boolean;
  canManageTeam: boolean;
  onRename: () => void;
  onDelete: () => void;
};

export default function WorkspaceIntro({
  workspace,
  memberCount,
  isOwner,
  canManageTeam,
  onRename,
  onDelete,
}: WorkspaceIntroProps) {
  const role = workspace.membership.role;

  return (
    <>
      <section className="workspace-heading" id="overview">
        <div>
          <p className="eyebrow">YOUR TEAM SPACE</p>
          <h1>{workspace.name}</h1>
          <p className="heading-meta">
            Created {formattedDate(workspace.createdAt)} <span>·</span> You
            joined as <strong>{role.toLowerCase()}</strong>
          </p>
        </div>
        <div className="heading-actions">
          {canManageTeam && (
            <button
              className="button button-quiet"
              type="button"
              onClick={onRename}
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
              onClick={onDelete}
            >
              <Trash2 size={17} />
            </button>
          )}
        </div>
      </section>

      <section className="summary-strip" aria-label="Workspace summary">
        <div className="summary-item">
          <span className="summary-label">People</span>
          <strong>{memberCount}</strong>
          <small>in this workspace</small>
        </div>
        <div className="summary-item">
          <span className="summary-label">Your access</span>
          <strong className="summary-role">{role.toLowerCase()}</strong>
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
    </>
  );
}
