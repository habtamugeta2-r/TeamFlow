"use client";

import { LoaderCircle, X } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import type { WorkspaceDialogProps } from "@/features/dashboard/types";
import type { WorkspaceRole } from "@/lib/teamflow/types";

export default function WorkspaceDialog({
  kind,
  workspace,
  canInviteAdmin,
  pending,
  error,
  onClose,
  onSubmit,
}: WorkspaceDialogProps) {
  const [name, setName] = useState(
    kind === "rename" ? (workspace?.name ?? "") : "",
  );
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Exclude<WorkspaceRole, "OWNER">>("MEMBER");

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, pending]);

  const title = {
    create: "Create a workspace",
    rename: "Rename workspace",
    invite: "Add a teammate",
    delete: "Delete workspace",
  }[kind];

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (kind === "create" || kind === "rename") onSubmit({ name });
    if (kind === "invite") onSubmit({ email, role });
    if (kind === "delete") onSubmit({});
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <section
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <header className="modal-heading">
          <div>
            <p className="eyebrow">WORKSPACE SETTINGS</p>
            <h2 id="dialog-title">{title}</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            title="Close dialog"
            aria-label="Close dialog"
            onClick={onClose}
            disabled={pending}
          >
            <X size={18} />
          </button>
        </header>

        <form className="dialog-form" onSubmit={submit}>
          {(kind === "create" || kind === "rename") && (
            <label className="field-label">
              Workspace name
              <input
                autoFocus
                minLength={2}
                maxLength={100}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Product team"
                required
              />
            </label>
          )}
          {kind === "invite" && (
            <>
              <label className="field-label">
                Teammate email
                <input
                  autoFocus
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@company.com"
                  required
                />
              </label>
              <label className="field-label">
                Workspace role
                <select
                  value={role}
                  onChange={(event) =>
                    setRole(
                      event.target.value as Exclude<WorkspaceRole, "OWNER">,
                    )
                  }
                >
                  <option value="MEMBER">Member</option>
                  {canInviteAdmin && <option value="ADMIN">Admin</option>}
                </select>
              </label>
              <p className="form-hint">
                Teammates need an existing TeamFlow account to join.
              </p>
            </>
          )}
          {kind === "delete" && (
            <div className="delete-warning">
              <p>
                This permanently removes <strong>{workspace?.name}</strong> and
                its team memberships.
              </p>
              <p>This action can&apos;t be undone.</p>
            </div>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <footer className="dialog-actions">
            <button
              className="button button-quiet"
              type="button"
              onClick={onClose}
              disabled={pending}
            >
              Cancel
            </button>
            <button
              className={`button ${kind === "delete" ? "button-danger" : "button-primary"}`}
              disabled={
                pending ||
                ((kind === "create" || kind === "rename") &&
                  name.trim().length < 2)
              }
            >
              {pending && <LoaderCircle className="spin" size={16} />}
              {kind === "create" ? "Create workspace" : null}
              {kind === "rename" ? "Save name" : null}
              {kind === "invite" ? "Add teammate" : null}
              {kind === "delete" ? "Delete workspace" : null}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
