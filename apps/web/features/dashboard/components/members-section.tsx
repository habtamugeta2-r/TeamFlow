"use client";

import { LoaderCircle, Search, ShieldCheck, UserPlus, X } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { initials, formattedDate } from "@/lib/format";
import type {
  TeamUser,
  WorkspaceMember,
  WorkspaceRole,
} from "@/lib/teamflow/types";

type MembersSectionProps = {
  members: WorkspaceMember[];
  user: TeamUser;
  role?: WorkspaceRole;
  loading: boolean;
  busy: boolean;
  onInvite: () => void;
  onUpdateRole: (member: WorkspaceMember, role: WorkspaceRole) => void;
  onRemove: (member: WorkspaceMember) => void;
};

export default function MembersSection({
  members,
  user,
  role,
  loading,
  busy,
  onInvite,
  onUpdateRole,
  onRemove,
}: MembersSectionProps) {
  const [search, setSearch] = useState("");
  const query = useDeferredValue(search.trim().toLowerCase());
  const isOwner = role === "OWNER";
  const canManageTeam = isOwner || role === "ADMIN";
  const visibleMembers = members.filter(
    (member) =>
      !query ||
      member.user.name.toLowerCase().includes(query) ||
      member.user.email.toLowerCase().includes(query) ||
      member.role.toLowerCase().includes(query),
  );

  return (
    <section className="team-section" id="members">
      <div className="section-heading">
        <div>
          <p className="eyebrow">THE PEOPLE BEHIND THE WORK</p>
          <h2>
            Team members <span>{members.length}</span>
          </h2>
        </div>
        {canManageTeam && (
          <button
            className="button button-primary"
            type="button"
            onClick={onInvite}
          >
            <UserPlus size={16} /> Add teammate
          </button>
        )}
      </div>

      <div className="member-toolbar">
        <label className="search-field">
          <Search size={16} />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Find a teammate"
            aria-label="Find a teammate"
          />
          {search && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearch("")}
            >
              <X size={15} />
            </button>
          )}
        </label>
        <span className="member-count">
          {visibleMembers.length}{" "}
          {visibleMembers.length === 1 ? "person" : "people"}
        </span>
      </div>

      <div className="member-list" aria-busy={loading}>
        <div className="member-list-head">
          <span>NAME</span>
          <span>ROLE</span>
          <span>JOINED</span>
          <span className="sr-only">ACTIONS</span>
        </div>
        {loading ? (
          <div className="list-state">
            <LoaderCircle className="spin" size={18} /> Loading teammates
          </div>
        ) : visibleMembers.length === 0 ? (
          <div className="list-state">
            {members.length
              ? "No teammates match that search."
              : "No teammates found."}
          </div>
        ) : (
          visibleMembers.map((member) => {
            const isSelf = member.userId === user.id;
            const canRemove = isSelf
              ? member.role !== "OWNER"
              : canManageTeam && (isOwner || member.role === "MEMBER");
            const canChangeRole = isOwner && member.role !== "OWNER";
            return (
              <article className="member-row" key={member.id}>
                <div className="member-identity">
                  <span className={`avatar ${isSelf ? "avatar-self" : ""}`}>
                    {initials(member.user.name)}
                  </span>
                  <span className="member-name">
                    <strong>
                      {member.user.name}
                      {isSelf && <em>You</em>}
                    </strong>
                    <small>{member.user.email}</small>
                  </span>
                </div>
                <div className="member-role-cell">
                  {canChangeRole ? (
                    <>
                      <label className="sr-only" htmlFor={`role-${member.id}`}>
                        Role for {member.user.name}
                      </label>
                      <select
                        id={`role-${member.id}`}
                        className={`role-select role-${member.role.toLowerCase()}`}
                        value={member.role}
                        disabled={busy}
                        onChange={(event) =>
                          onUpdateRole(
                            member,
                            event.target.value as WorkspaceRole,
                          )
                        }
                      >
                        <option value="MEMBER">Member</option>
                        <option value="ADMIN">Admin</option>
                        <option value="OWNER">Transfer ownership</option>
                      </select>
                    </>
                  ) : (
                    <span
                      className={`role-pill role-${member.role.toLowerCase()}`}
                    >
                      {member.role.toLowerCase()}
                    </span>
                  )}
                </div>
                <time className="member-joined" dateTime={member.createdAt}>
                  {formattedDate(member.createdAt)}
                </time>
                <div className="member-actions">
                  {canRemove && (
                    <button
                      className="icon-button row-action"
                      type="button"
                      title={
                        isSelf
                          ? "Leave workspace"
                          : `Remove ${member.user.name}`
                      }
                      aria-label={
                        isSelf
                          ? "Leave workspace"
                          : `Remove ${member.user.name}`
                      }
                      disabled={busy}
                      onClick={() => onRemove(member)}
                    >
                      <X size={17} />
                    </button>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>
      <p className="permission-note">
        <ShieldCheck size={15} /> Roles control who can invite teammates and
        manage this workspace.
      </p>
    </section>
  );
}
