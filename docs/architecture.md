# TeamFlow architecture

## Goals and boundaries

TeamFlow is a TypeScript monorepo with three clear responsibilities:

- **Next.js (`apps/web`)** renders the application and collects user input.
- **Express (`apps/api`)** owns the REST API, sessions, validation,
  authorization, and business rules.
- **PostgreSQL** persists application data and enforces relational integrity.

The frontend may hide actions a user cannot take, but this is only a usability
feature. Every protected API operation must independently authenticate the
request and authorize it against the relevant workspace and resource.

## Request and data flow

```text
Browser
  |
  | same-origin pages and /api requests
  v
Next.js web app / same-origin API forwarding
  |
  | HTTP; forwards request and response, including session cookies
  v
Express REST API
  |
  | Prisma queries and migrations
  v
PostgreSQL
```

In development, Next.js forwards `/api/*` to the local Express service using a
rewrite configured by `API_URL`. In production, the hosting or reverse-proxy
configuration provides the same same-origin route. The forwarding layer must
preserve HTTP methods, request bodies, status codes, and relevant headers,
including `Set-Cookie`.

The forwarding layer is transport only. It must not duplicate business logic,
make authorization decisions, or become a second source of application data.
The browser uses relative `/api` URLs. Express is the single API and
authorization authority.

## Initial repository structure

```text
teamflow/
├── apps/
│   ├── web/                 # Next.js App Router application
│   └── api/                 # Express 5 REST API
├── docs/
│   ├── architecture.md
│   ├── implementation-checklist.md
│   └── permissions.md
├── .github/
│   └── workflows/           # CI workflows, added during implementation
├── package.json             # npm workspaces and root scripts
├── package-lock.json
└── README.md
```

Do not add a shared package until both applications demonstrably need the same
schemas or types. The API's validation remains authoritative even if a future
shared package is introduced.

## API conventions

- Use REST endpoints under `/api`; do not add versioning until a compatibility
  need exists.
- Validate request bodies, path parameters, and query parameters with Zod at
  the API boundary.
- Return appropriate HTTP status codes rather than success-shaped error
  responses.
- Use a consistent JSON error envelope:

  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "The request is invalid.",
      "details": []
    }
  }
  ```

- Do not expose stack traces, secrets, or internal implementation details in
  production error responses.
- Apply pagination and filters in the database, validate sort fields, and set
  a maximum page size.

## Authentication and browser security

Use an opaque, high-entropy, database-backed session. The browser receives only
the session token in a cookie; persist a hash of the token in the database.
Authenticate API requests from this cookie, not from frontend state or
client-controlled user IDs.

- Hash passwords with Argon2id and use a unique salt per password.
- Set the session cookie `HttpOnly`, `SameSite=Lax`, and `Secure` in production.
- Rotate the session on successful login and revoke it on logout.
- Expire sessions and support server-side revocation.
- Protect state-changing requests with CSRF defenses, including origin checks
  and a CSRF token where needed.
- Keep secrets in environment configuration; never commit them.

The same-origin API route avoids a browser-facing cross-origin cookie setup. If
hosting later requires separate frontend and API origins, explicitly review
credentialed CORS, cookie policy, and CSRF protections before enabling it.

## Persistence and migrations

PostgreSQL is the source of truth. Prisma defines the schema and creates
versioned, checked-in migrations. Local development uses migrations to evolve
the schema; production applies reviewed migrations as a controlled deployment
step. Do not use schema-push shortcuts as a substitute for production
migrations.

The initial conceptual entities are:

- **User** — registered account and password hash.
- **Session** — hashed session token, user, and expiry.
- **Workspace** — team boundary.
- **Membership** — user-to-workspace relationship and workspace role.
- **Project** — workspace-owned work area with active or archived lifecycle.
- **Task** — project-owned item, optional member assignee, status, priority, and
  optional due date.
- **Activity** — append-only record of important changes, actor, workspace,
  resource, and event data.

Exact columns, indexes, constraints, and deletion behavior will be finalized in
Phase 2 before the initial migration. Membership is a separate entity because
a user's role is specific to each workspace.

## Initial workflows

### Project lifecycle

Projects are created active. A workspace owner or admin can update project
metadata and archive a project. Archived projects remain readable for history
but do not accept ordinary task changes. Project deletion is not part of the
initial MVP.

### Task lifecycle

The initial states are `TODO`, `IN_PROGRESS`, and `DONE`. Normal progression is
`TODO → IN_PROGRESS → DONE`. Reopening is allowed: `DONE → IN_PROGRESS`, and
work may return from `IN_PROGRESS → TODO`. A direct `TODO → DONE` transition is
not allowed. The API validates every transition.

Task priority starts with `LOW`, `MEDIUM`, and `HIGH`. Tasks may be unassigned;
an assignee, when present, must be a current member of the task's workspace.

### Activity

Record project creation, update, and archive, and task creation, status change,
assignment change, priority change, and completion. Store the actor and
workspace with each event. Persist a business change and its activity record in
the same database transaction when both must succeed together. Activity is
append-only in the application and readable only by workspace members.

## Testing and quality

Use Vitest for unit and integration test execution and Supertest for HTTP API
tests. Test the API's validation and permission boundaries, including attempts
to access another workspace's resources. Keep a dedicated test database for
database integration tests. Add frontend and end-to-end coverage as the
corresponding user flows are implemented.

GitHub Actions will eventually run linting, type-checking, tests, and
production builds. CI is introduced early in implementation and expanded as
applications and database tests are added.

## Deliberately deferred decisions

- Production hosting and AWS service selection are deferred until Phase 13 so
  cost and operational complexity can be evaluated against the completed
  application.
- Email delivery and self-service invitation links are not required for the
  initial membership flow. Initially, an owner or admin can add an already
  registered user by exact account email.
- Project-level roles, fine-grained task permissions, and workspace deletion
  are outside the initial MVP.
