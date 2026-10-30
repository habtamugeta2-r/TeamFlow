# TeamFlow

TeamFlow is a project-management app for small teams. It brings team
workspaces, projects, tasks, and an activity history together in one place.

The project is under active development. This README describes the product
scope and how to work with the code; the
[implementation checklist](./docs/implementation-checklist.md) tracks delivery
and remaining work.

## MVP scope

The first release focuses on the core team workflow:

- **Accounts:** Register, sign in, and sign out.
- **Workspaces:** Create and manage team workspaces.
- **Membership and permissions:** Add registered users, manage member roles,
  and transfer workspace ownership.
- **Projects:** Create, update, browse, and archive workspace projects.
- **Tasks:** Create and update tasks, set priority and due dates, assign
  workspace members, and filter and paginate task lists.
- **Activity history:** Review project and task changes made in a workspace.

### Roles

- **Owner:** Full workspace administration, including ownership transfer.
- **Admin:** Manage workspace members and project details.
- **Member:** Work with workspace projects and tasks.

Every project belongs to a workspace. Workspace members can access its
projects, tasks, and activity; the API enforces these permissions on every
request. See [workspace permissions](./docs/permissions.md) for the full rules.

### Not included in the MVP

Real-time collaboration, recurring tasks, file attachments, advanced analytics,
billing, and native mobile apps are outside the initial scope.

## Technology and architecture

- **Web:** Next.js App Router and React.
- **API:** Express 5 REST API with TypeScript and Zod validation.
- **Data:** PostgreSQL and Prisma migrations.
- **Tests:** Vitest and Supertest for the API.
- **Workspace tooling:** npm workspaces.

The browser sends same-origin `/api` requests through the Next.js proxy to the
Express API. The API owns validation, authentication, authorization, and
business rules; frontend visibility is not an access-control boundary.

```text
apps/
  web/                 Next.js routes, features, and shared UI
  api/                 Express API and feature modules
    prisma/            Database schema and versioned migrations
docs/                  Architecture, permissions, and delivery checklist
```

For request flow, module boundaries, and engineering conventions, see
[Architecture](./docs/architecture.md).

## Getting started

### Requirements

- Node.js 22.13 or newer
- npm 10 or newer
- PostgreSQL for database-backed API features

### Install and configure

From the repository root:

```bash
npm ci
cp .env.example apps/api/.env
cp .env.example apps/web/.env.local
```

Set `DATABASE_URL` in `apps/api/.env` to your PostgreSQL database. The API
loads its environment from that file. The web app loads
`apps/web/.env.local`; set `API_URL` there if the API is not running at
`http://127.0.0.1:4000`. Both files are ignored by Git.

Database schema changes are versioned in `apps/api/prisma/migrations/`.
Database-backed features require a PostgreSQL database with the project
migrations applied.

### Run the app

```bash
npm run dev
```

This starts the API at `http://127.0.0.1:4000` and the web app at
`http://localhost:3000`. Open the web app to use TeamFlow. The API health
endpoint is available at `http://127.0.0.1:4000/api/health` and through the
web proxy at `http://localhost:3000/api/health`.

To start one app at a time:

```bash
npm run dev:api
npm run dev:web
```

The web app forwards `/api/*` requests to the `API_URL` origin. The API can
serve its health check without a database connection, but authentication and
workspace operations require a reachable, migrated PostgreSQL database.

## Quality checks

GitHub Actions runs linting, type-checking, API tests, and production builds on
pushes to `main` or `feature/**` branches and on pull requests targeting
`main`. Run the same checks locally from the repository root:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Run `npm run format:check` to check formatting, or `npm run format` to apply
the configured Prettier formatting.

## Project documentation

- [Architecture and engineering conventions](./docs/architecture.md)
- [Workspace permissions](./docs/permissions.md)
- [Implementation checklist and project progress](./docs/implementation-checklist.md)
- [Web application structure](./apps/web/README.md)
