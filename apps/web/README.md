# TeamFlow web application

This Next.js app is part of the TeamFlow npm workspace. Follow the setup and
development instructions in the repository [README](../../README.md).

## Application structure

- `app/` contains App Router entry points and route-level loading UI.
  - `(auth)/page.tsx` serves the sign-in and registration page at `/`.
  - `(workspace)/dashboard/page.tsx` serves the shared workspace directory at
    `/dashboard`.
  - `(workspace)/dashboard/[workspaceId]/page.tsx` serves a team's projects,
    tasks, members, and activity at `/dashboard/[workspaceId]`.
- `features/auth/` contains authentication screens and flows.
- `features/dashboard/` contains the dashboard composition, data/action hooks,
  typed form contracts, and focused UI components for each dashboard concern.
- `lib/teamflow/` separates API operations and shared contracts by domain:
  authentication, workspaces and members, projects, tasks, and activity.
- `lib/` also contains the shared HTTP client, formatting, and error helpers.
