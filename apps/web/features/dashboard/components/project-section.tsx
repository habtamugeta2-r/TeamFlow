"use client";

import {
  Archive,
  FolderKanban,
  LoaderCircle,
  Pencil,
  Plus,
} from "lucide-react";
import { formattedDate } from "@/lib/format";
import type { Project } from "@/lib/teamflow/types";

type ProjectSectionProps = {
  projects: Project[];
  activeProject?: Project;
  activeProjectId: string;
  loading: boolean;
  error: string;
  canManageTeam: boolean;
  busy: boolean;
  onRetry: () => void;
  onCreate: () => void;
  onEdit: (project: Project) => void;
  onArchive: (project: Project) => void;
  onSelect: (projectId: string) => void;
};

export default function ProjectSection({
  projects,
  activeProject,
  activeProjectId,
  loading,
  error,
  canManageTeam,
  busy,
  onRetry,
  onCreate,
  onEdit,
  onArchive,
  onSelect,
}: ProjectSectionProps) {
  return (
    <section className="project-section" id="projects">
      <div className="section-heading">
        <div>
          <p className="eyebrow">PLAN THE WORK</p>
          <h2>
            Projects <span>{projects.length}</span>
          </h2>
        </div>
        <button
          className="button button-primary"
          type="button"
          onClick={onCreate}
        >
          <Plus size={16} /> New project
        </button>
      </div>

      {error ? (
        <div className="project-state project-state-error" role="alert">
          <span>{error}</span>
          <button
            className="button button-quiet"
            type="button"
            onClick={onRetry}
          >
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className="project-state">
          <LoaderCircle className="spin" size={18} /> Loading projects
        </div>
      ) : projects.length === 0 ? (
        <div className="project-state">
          No projects yet. Create a project to organize your team&apos;s tasks.
        </div>
      ) : (
        <div className="project-grid">
          {projects.map((project) => (
            <article
              className={`project-card ${project.id === activeProjectId ? "is-selected" : ""}`}
              key={project.id}
            >
              <button
                className="project-card-select"
                type="button"
                aria-pressed={project.id === activeProjectId}
                onClick={() => onSelect(project.id)}
              >
                <span className="project-card-icon">
                  <FolderKanban size={18} />
                </span>
                <span className="project-card-heading">
                  <strong>{project.name}</strong>
                  {project.archivedAt && (
                    <span className="archived-label">Archived</span>
                  )}
                </span>
                <span className="project-card-description">
                  {project.description || "No description"}
                </span>
              </button>
              {canManageTeam && (
                <div className="project-card-actions">
                  <button
                    className="button button-quiet"
                    type="button"
                    onClick={() => onEdit(project)}
                  >
                    <Pencil size={14} /> Edit
                  </button>
                  {!project.archivedAt && (
                    <button
                      className="icon-button row-action"
                      type="button"
                      title={`Archive ${project.name}`}
                      aria-label={`Archive ${project.name}`}
                      onClick={() => onArchive(project)}
                      disabled={busy}
                    >
                      <Archive size={16} />
                    </button>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {activeProject && (
        <div className="project-detail">
          <div className="project-detail-copy">
            <p className="eyebrow">SELECTED PROJECT</p>
            <h3>{activeProject.name}</h3>
            <p>
              {activeProject.description ||
                "This project is ready for your team to add tasks."}
            </p>
          </div>
          {activeProject.archivedAt ? (
            <span className="archived-notice">
              <Archive size={15} /> Archived{" "}
              {formattedDate(activeProject.archivedAt)}
            </span>
          ) : (
            <span className="project-active-label">
              <span /> Active project
            </span>
          )}
        </div>
      )}
    </section>
  );
}
