"use client";

import { LoaderCircle, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { ProjectDialogProps } from "@/features/dashboard/types";

export default function ProjectDialog({
  project,
  pending,
  error,
  onClose,
  onSubmit,
}: ProjectDialogProps) {
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, pending]);

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
        aria-labelledby="project-dialog-title"
      >
        <header className="modal-heading">
          <div>
            <p className="eyebrow">PROJECT DETAILS</p>
            <h2 id="project-dialog-title">
              {project ? "Edit project" : "Create a project"}
            </h2>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            disabled={pending}
          >
            <X size={18} />
          </button>
        </header>
        <form
          className="dialog-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit({ name, description });
          }}
        >
          <label className="field-label">
            Project name
            <input
              autoFocus
              minLength={2}
              maxLength={100}
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>
          <label className="field-label">
            Description
            <textarea
              maxLength={5000}
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
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
              className="button button-primary"
              disabled={pending || name.trim().length < 2}
            >
              {pending && <LoaderCircle className="spin" size={16} />}
              {project ? "Save project" : "Create project"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
