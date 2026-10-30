# TeamFlow

TeamFlow is a project-management workspace for small teams. It brings workspaces,
projects, tasks, and an auditable activity history together behind a permission-
checked API.

## Project status

**Phase 0 — Project definition and engineering decisions: complete.**
**Phase 1 — Repository and development environment: complete.**
The implementation checklist in [docs/implementation-checklist.md](./docs/implementation-checklist.md)
tracks verified deliverables and remaining work across the implementation
phases.

## MVP

The first release is intended to let a team:

1. Register, log in, and log out.
2. Create and access a workspace.
3. Manage workspace membership and roles.
4. Create, view, update, and archive projects.
5. Create, assign, filter, and update tasks.
6. Review important project and task activity.

Real-time collaboration, recurring tasks, file attachments, advanced analytics,
billing, and mobile applications are out of scope for the first release.

## Architecture

- **Web:** Next.js App Router, responsible for the user interface.
- **API:** Express 5 REST API, responsible for validation, authentication,
  authorization, and business rules.
- **Database:** PostgreSQL, accessed and migrated with Prisma.
- **Validation:** Zod at the API boundary.
- **Testing:** Vitest and Supertest, with tests added alongside API features.
- **Repository:** npm workspaces, with separate `apps/web` and `apps/api`
  applications.

The browser uses a same-origin `/api` path that is forwarded to Express.
Express—not the frontend—remains the authority for access checks. See
[docs/architecture.md](./docs/architecture.md) and
[docs/permissions.md](./docs/permissions.md) for the decisions and constraints.

## Development

### Prerequisites

- Node.js 22.13 or newer (Node.js 24.22.1 and npm 11.19.1 were used to verify
  the current setup).
- npm 10 or newer.

### First-time setup

Run these commands from the repository root:

```bash
npm ci
cp .env.example apps/api/.env
cp .env.example apps/web/.env.local
```

The API reads its configuration from `apps/api/.env`; Next.js reads
`apps/web/.env.local`. Both environment files are ignored by Git. Adjust
`DATABASE_URL`, `API_HOST`, or `API_PORT` for the API, and `API_URL` for the web
proxy, if your local setup uses different values. Each app ignores the other
app's settings from the shared example. The example database URL is for a
local PostgreSQL instance; change it if your database uses different
credentials, host, port, or database name.

### Run the applications

```bash
npm run dev
```

This starts the Express API at `http://127.0.0.1:4000` and the Next.js app at
`http://localhost:3000`. Open the web app in a browser. The API health check is
available directly at `http://127.0.0.1:4000/api/health` and through the
same-origin web proxy at `http://localhost:3000/api/health`. Both return:

```json
{ "status": "ok" }
```

The apps can also be started independently with `npm run dev:api` and
`npm run dev:web`. The web app forwards `/api/*` requests to the `API_URL`
origin; keep it pointed at the API service.

### Quality checks and production builds

```bash
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
```

`npm run format` applies the configured Prettier formatting.

The API can start and serve its liveness check without a running PostgreSQL
instance, but authentication, workspace operations, and the database readiness
check require a reachable database at `DATABASE_URL`.

## Roadmap

Work is divided into small phases with acceptance criteria. Track progress in
[docs/implementation-checklist.md](./docs/implementation-checklist.md).
