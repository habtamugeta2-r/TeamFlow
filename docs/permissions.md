# Workspace roles and permissions

## Authorization rules

1. A user must have an active membership in a resource's workspace to read that
   workspace, its projects, tasks, or activity.
2. The API checks authorization on every protected request. Frontend visibility
   is never an access-control boundary.
3. A resource's workspace is derived from its persisted relationships, not
   trusted from a user-submitted workspace ID.
4. A task assignee must be a current member of the task's workspace.
5. Archived projects are readable but reject ordinary task creation and
   modification.
6. Membership removal revokes access immediately. Historical activity remains
   associated with its original actor and workspace.

## Roles

- **Owner:** One owner per workspace. Full administrative authority and
  responsibility for transferring ownership before leaving.
- **Admin:** Manages ordinary members and project metadata; cannot grant,
  revoke, or transfer owner/admin roles.
- **Member:** Participates in workspace projects and tasks; cannot administer
  workspace membership or archive/update project metadata.

Workspace creation makes its creator the initial owner. Initially, owners and
admins add already registered accounts by exact email; there are no public
workspace joins or self-service invitation links.

## Capability matrix

| Capability                                    | Owner | Admin | Member |
| --------------------------------------------- | ----: | ----: | -----: |
| View workspace, projects, tasks, and activity |   Yes |   Yes |    Yes |
| Create a project                              |   Yes |   Yes |    Yes |
| Update project name and description           |   Yes |   Yes |     No |
| Archive a project                             |   Yes |   Yes |     No |
| Create and update tasks in an active project  |   Yes |   Yes |    Yes |
| Assign a task to a workspace member           |   Yes |   Yes |    Yes |
| Change task status and priority               |   Yes |   Yes |    Yes |
| Add a registered user as a member             |   Yes |   Yes |     No |
| Remove a regular member                       |   Yes |   Yes |     No |
| Promote a member to admin                     |   Yes |    No |     No |
| Change or transfer workspace ownership        |   Yes |    No |     No |
| Remove an owner or leave while still owner    |    No |    No |     No |

Admins cannot change the role of another admin or the owner. An owner may
transfer ownership to a current member; after transfer, the previous owner
becomes an admin. An owner cannot leave or be removed until ownership has been
transferred. This preserves exactly one owner for every workspace.

There is no project-specific membership or role in the MVP: every workspace
member can access every project in that workspace. Archived projects remain
readable to members, but only owners and admins can archive or update project
metadata.

## Resource-specific behavior

### Workspaces and membership

- Any authenticated user can create a workspace and becomes its owner.
- Only workspace owners and admins can add registered accounts or remove
  regular members.
- Only the owner can promote a member to admin or transfer ownership.
- An admin cannot remove or change another admin's role.
- Membership changes must not permit removing or demoting the sole owner.

### Projects

- Any workspace member can create a project.
- All workspace members can view all workspace projects.
- Only owners and admins can update project metadata or archive it.
- Archived projects are retained and readable; normal task writes are rejected.

### Tasks

- Workspace members can create and update tasks in active workspace projects.
- An optional assignee must be a current member of the same workspace.
- The API validates allowed status transitions and priority values.
- Workspace members can filter and paginate tasks they are allowed to view.
- Task deletion is not included in the initial MVP.

### Activity

- Activity is scoped to the workspace that owns the affected resource.
- Any current workspace member can read that workspace's activity.
- Events retain the original actor for historical accuracy after membership
  changes.
- Clients cannot create or alter activity records directly.

## Authorization test requirements

Automated API tests must verify at least:

- Unauthenticated requests cannot access protected resources.
- A user in one workspace cannot read or modify another workspace's projects,
  tasks, or activity by changing an identifier.
- Members cannot perform owner/admin-only membership or project operations.
- Admins cannot grant administrative roles, change ownership, or remove an
  owner/admin.
- A workspace cannot be left without an owner.
- A task cannot be assigned to a user outside its workspace.
- Archived projects reject ordinary task writes.
