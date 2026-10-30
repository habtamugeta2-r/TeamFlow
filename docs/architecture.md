# Architecture

## System boundaries

| Component  | Responsibility                                                              |
| ---------- | --------------------------------------------------------------------------- |
| `apps/web` | Next.js interface and same-origin `/api` forwarding                         |
| `apps/api` | Express REST API, validation, authentication, authorization, business rules |
| PostgreSQL | Persistent data and relational integrity, accessed through Prisma           |

Express is the authority for business rules and access control. The web app may
hide unavailable actions for usability, but never replaces API authorization.

## Request flow

```text
Browser → Next.js (/api proxy) → Express → Prisma → PostgreSQL
```

In development, `API_URL` configures the Next.js rewrite. Production hosting
must provide the same-origin proxy and preserve methods, bodies, status codes,
and headers such as `Set-Cookie`. The proxy handles transport only; it does not
implement business logic or authorization.

## Code organization

```text
apps/
  web/                 Next.js App Router application
  api/
    src/
      app.module.ts    Root Express router and feature registration
      app.ts           Express app and global middleware
      server.ts        HTTP server lifecycle
      config/          Validated environment
      core/            Shared logger
      db/              Prisma client
      http/            Validation, responses, errors, and Express middleware
      modules/
        auth/          Routes, controller, session middleware, schemas, service
        activity/      Workspace-scoped append-only activity feed
        health/        Routes, controller, service
        projects/      Workspace-scoped project routes, schemas, and service
        tasks/         Project-scoped task routes, schemas, and service
        workspaces/    Routes, controller, schemas, service
    prisma/            Schema and versioned migrations
docs/                  Architecture, permissions, and delivery checklist
```

Keep related behavior in feature modules. Routers declare paths and middleware;
controllers translate HTTP input and service outcomes into HTTP responses;
services contain business rules and persistence without depending on Express.
Each `*.module.ts` function wires its feature's dependencies, service,
controller, and router. Route factories receive controllers rather than
constructing them, so feature boundaries own composition. The auth factory
provides its session guard to protected features. Health checks are registered
as a feature router;
readiness failures are logged and returned as an unavailable status without
exposing details. Add layers only when they have a clear responsibility. Do
not add a repository layer that merely wraps Prisma calls or a shared package
until both apps demonstrably need the same code.

`app.module.ts` creates feature routers, supplies shared dependencies, and
mounts them under `/api`. `app.ts` configures the Express instance, global
middleware, and error handling; `server.ts` only starts and shuts down the HTTP
server. Logging is injected into request logging, rate-limiting, health checks,
and the error handler rather than imported by those HTTP components. The
request flow is
`Express middleware → root router → feature router → controller → service → Prisma`.
Feature code does not import the global database singleton.

## Documentation style

- [README](../README.md): setup and common commands.
- [Architecture](./architecture.md): system boundaries and engineering rules.
- [Permissions](./permissions.md): roles and access decisions.
- [Implementation checklist](./implementation-checklist.md): delivery status.

In code, explain non-obvious behavior and invariants; avoid comments that repeat
what the code already says.

## API conventions

- Place REST endpoints under `/api`; validate bodies and route/query parameters
  with Zod at the boundary.
- Use authentication middleware for protected routes. Services report
  domain-level outcomes; routes translate expected errors to HTTP exceptions.
- Use Express 5 async handlers with the shared error middleware and response
  helpers. Rejected handler promises flow to the final Express error handler.
- Return successful payloads under `data`; return errors as
  `{ "error": { "code": "...", "message": "...", "details": [] } }`.
- Keep logs free of query strings. JSON bodies are limited to 100 KB, with a
  consistent `413` response when exceeded.
- Credential endpoints are rate limited per client IP and endpoint. The
  defaults are 20 requests per 60 seconds; `AUTH_RATE_LIMIT_MAX=0` disables the
  limiter. The in-memory limiter is process-local; use a shared gateway or
  store if multiple API instances need a common limit. Configure `TRUST_PROXY`
  only for the trusted reverse-proxy topology so client IPs are accurate
  without trusting caller-supplied forwarding headers.
- Responses include baseline security headers and a validated `X-Request-Id`
  for log correlation. Production responses add HSTS when TLS terminates at the
  deployment edge. The API drains HTTP connections and disconnects Prisma on
  `SIGINT` and `SIGTERM`.
- Do not return secrets, stack traces, or internal error details.
- Apply filtering and pagination in the database, validate sort fields, and
  bound page size.
- Tasks are nested under
  `/api/workspaces/:workspaceId/projects/:projectId/tasks`. Their project and
  workspace are taken from the route and checked against the authenticated
  user's membership. Assignees must be current members of that workspace.
- Task status transitions are `TODO → IN_PROGRESS → DONE`; completed tasks
  may be reopened to `TODO` or `IN_PROGRESS`. Direct `TODO → DONE` transitions
  are rejected. Archived projects remain readable but reject task writes.
- Task lists accept optional `status`, `priority`, and `assigneeId` filters;
  use `assigneeId=unassigned` for unassigned tasks. Pagination defaults to
  `page=1&limit=20` and caps `limit` at 100. Sorting is restricted to
  `createdAt`, `updatedAt`, `dueDate`, `title`, `priority`, `status`, or `id`,
  with `sortOrder=asc|desc`. List responses include `page`, `limit`, `total`,
  and `totalPages` under `data.pagination`.
- Workspace activity is read through
  `/api/workspaces/:workspaceId/activity`; every request verifies current
  workspace membership. Events are created only alongside the corresponding
  project/task transaction. Actor name and email are snapshotted for historical
  display in the workspace dashboard, while actor ID becomes nullable if that
  user is later deleted. Workspace deletion removes its activity records.
- Activity events cover project creation, metadata changes, and archive; task
  creation, field changes, status transitions, assignment/unassignment,
  priority changes, and completion. Read responses are ordered newest first
  and include the event type, workspace/resource IDs, actor snapshot, details,
  timestamp, and pagination metadata.

## Authentication and security

The API uses opaque, database-backed sessions. The browser receives the
high-entropy token in an `HttpOnly`, `SameSite=Lax` cookie; only its hash is
stored. Passwords are hashed with Argon2. Sessions expire, rotate on login,
and are revoked on logout. Login performs a dummy Argon2 verification for
unknown email addresses so they do not fail noticeably faster than incorrect
passwords for existing accounts.

Use `Secure` cookies in production and keep secrets in environment
configuration. Protect state-changing requests against CSRF before enabling
additional browser workflows. If web and API are deployed on separate origins,
review CORS, credentials, cookie policy, and CSRF together.

## Data and migrations

PostgreSQL is the source of truth. Prisma schema changes are captured in
checked-in migrations; production applies reviewed migrations as a controlled
deployment step. Do not use schema push as a substitute for production
migrations.

**Implemented foundation:** users, sessions, workspaces, workspace
memberships, workspace-scoped projects, project-scoped tasks, and transactional
workspace activity.
See the [implementation checklist](./implementation-checklist.md) for phase
status and [permissions](./permissions.md) for workspace access rules.

## Verification

Use Vitest and Supertest for API behavior, especially validation and access
boundaries. Database-backed integration tests should use a dedicated test
database. Add frontend and end-to-end coverage as user flows are implemented.
CI should run lint, formatting, type checks, tests, and production builds.

## Deferred decisions

- Select hosting and cloud services during the deployment phase.
- Keep project-level roles, fine-grained task permissions, and separate API
  origins out of scope until there is a concrete need.
- Membership invitations initially target existing registered users; email
  delivery and self-service links are deferred.
