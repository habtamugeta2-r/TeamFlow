# TeamFlow implementation checklist

Use this as the source of truth for phase progress. Check an item only after
the behavior or deliverable has been verified. Tests should be added alongside
the feature they protect, not deferred until the testing phase.

## Phase 0 — Project definition and engineering decisions

**Status: Complete**

- [x] Define the first-release scope and deferred features.
- [x] Define workspace roles, permissions, and authorization rules.
- [x] Define project and task workflows.
- [x] Decide how the web app reaches the API.
- [x] Decide the authentication and session approach.
- [x] Decide how PostgreSQL schema changes are managed.
- [x] Define the repository structure and engineering conventions.
- [x] Create the README, architecture, permissions, and implementation checklist.

**Definition of done:** The application boundary, main entities, authentication
approach, MVP, and permission model are documented before feature development.

## Phase 1 — Repository and development environment

**Status: Complete**

- [x] Configure npm workspaces.
- [x] Complete root development scripts for both applications.
- [x] Create the Next.js scaffold in `apps/web`.
- [x] Establish the Express application in `apps/api`.
- [x] Configure TypeScript, environment validation, linting, and formatting.
- [x] Add and test the API health endpoint.
- [x] Verify both applications start locally and the web proxy reaches the API.
- [x] Document prerequisites, environment variables, and exact setup commands.

**Definition of done:** A fresh clone can be installed and both applications
started by following the README.

## Phase 2 — Database design

**Status: In progress**

- [x] Define fields, relations, constraints, indexes, and deletion behavior for
      users, sessions, workspaces, memberships, projects, and tasks.
- [x] Create versioned Prisma schema migrations for implemented entities.
- [x] Apply migrations to the development database.
- [ ] Add a development seed script and verify the relationships.

**Definition of done:** The schema can be recreated from migrations and its
relationships and integrity rules are understood.

## Phase 3 — Express API foundation

**Status: Complete**

- [x] Structure the Express app around routes, middleware, and feature modules.
- [x] Add request parsing/logging, not-found handling, and centralized errors.
- [x] Establish Zod validation conventions and Prisma connection handling.
- [x] Add health endpoint and API foundation tests.

**Definition of done:** The API starts and handles health checks, invalid
routes, validation errors, and unexpected failures consistently.

## Phase 4 — Authentication

**Status: In progress**

- [x] Implement registration, login, logout, session validation, and current
      user endpoint.
- [x] Implement password hashing, cookie security, session expiry, and rotation.
- [ ] Add CSRF protection for state-changing browser requests.
- [x] Test valid and invalid authentication and protected-route behavior.

**Definition of done:** Users can register, log in, retrieve their identity,
and log out; protected routes reject unauthenticated requests.

## Phase 5 — Workspaces and permissions

**Status: Complete**

- [x] Create and list a user's workspaces and read workspace details.
- [x] Add and remove members using the Phase 0 controlled membership flow.
- [x] Implement owner/admin/member authorization and ownership transfer.
- [x] Test cross-workspace access and prohibited role changes.

**Definition of done:** Workspace data is isolated and role rules are enforced
by the API and covered by tests.

## Phase 6 — Project management

**Status: Complete**

- [x] Create, list, view, and update workspace projects.
- [x] Archive projects while keeping archived records readable.
- [x] Validate input and enforce workspace/project permissions.
- [x] Add API tests for project rules.

**Definition of done:** Authorized users can manage projects in the correct
workspace; tests verify access boundaries.

## Phase 7 — Task management

**Status: Complete**

- [x] Create and view project tasks through the authenticated API.
- [x] Update task fields and enforce workspace membership for assignees.
- [x] Validate status transitions, including reopening completed tasks.
- [x] Add API tests for task authorization, validation, and workflow rules.
- [x] Apply the task migration to the development database.

**Definition of done:** Tasks can progress through the documented workflow
with validation, authorization, and persistence.

## Phase 8 — Filtering, pagination, and API quality

**Status: Complete**

- [x] Filter tasks by status, priority, and assignee, including unassigned tasks.
- [x] Add validated sorting and bounded pagination (maximum page size: 100).
- [x] Query filters and pages in the database and return pagination metadata.
- [x] Test filter combinations, invalid parameters, and empty results.

**Definition of done:** Task lists return correct bounded results and handle
invalid query parameters consistently.

## Phase 9 — Activity history

**Status: Complete**

- [x] Record project and task creation, updates, status, assignment, priority,
      completion, and archive events with actor and workspace.
- [x] Write activity atomically with the related business change.
- [x] Add a paginated, permission-checked workspace activity endpoint.
- [x] Test activity permission checks, filters, pagination, and recorded events.
- [x] Display recent workspace activity with loading, error, empty, and load-more
      states in the web dashboard.
- [x] Apply the activity migration to the development database.

**Definition of done:** Important changes produce durable history that only
authorized workspace members can read.

## Phase 10 — Next.js frontend

**Status: In progress**

- [x] Add application layout, navigation, shared UI, and API client.
- [x] Organize App Router entry points and frontend API modules by responsibility.
- [x] Build registration, login, and logout flows.
- [x] Build workspace/project dashboard and project details.
- [x] Build task create/edit/status/assignment flows, filters, and pagination.
- [x] Show activity, loading/error states, and useful empty states.
- [ ] Verify the main user workflow end to end.

**Definition of done:** A user can complete the main TeamFlow workflow through
the interface without manually calling API endpoints.

## Phase 11 — Automated testing and quality assurance

**Status: In progress**

- [x] Review API integration and authorization coverage; add tests alongside
      implemented features.
- [ ] Add end-to-end coverage for the critical user workflow where practical.
- [ ] Verify failure handling, loading states, validation, and empty results.

**Definition of done:** Critical workflows and permission boundaries have
repeatable automated coverage.

## Phase 12 — GitHub Actions and CI/CD

**Status: Not started**

- [ ] Run install, lint, type-check, tests, and production builds in CI.
- [ ] Add a test database service for integration tests as needed.
- [ ] Verify pull-request checks fail when a required check fails.
- [ ] Add deployment automation only after the deployment design is selected.
- [ ] Use protected secrets or OIDC; never put credentials in the repository.

**Definition of done:** Pull requests receive automated quality checks and
deployment does not rely on hard-coded credentials.

## Phase 13 — Deployment

**Status: Not started**

- [ ] Select hosting and database services based on cost and operational needs.
- [ ] Configure production secrets, HTTPS, health checks, and API forwarding.
- [ ] Deploy the API and web app; apply migrations through a controlled step.
- [ ] Verify the deployed workflow and document operations, recovery, and cost.

**Definition of done:** Another person can use the deployed application and
understand how it is hosted and operated.

## Phase 14 — Final review and portfolio presentation

**Status: Not started**

- [ ] Verify setup, architecture, API, testing, migration, and deployment docs.
- [ ] Review authorization, error handling, TypeScript, and secret hygiene.
- [ ] Capture actual application screenshots and document known limitations.
- [ ] Prepare a concise demonstration of the complete workflow.

**Definition of done:** A new engineer can run, evaluate, and understand the
application and its key engineering decisions.
