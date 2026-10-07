# AGENTS.md: Standing rules for every session

## Product

"Orbit": a Project Management System. Users register, create projects, organize tasks, track progress and see a dashboard.
One account and one dataset work on BOTH a Next.js web app and an Expo (React Native) Android app. Both call the SAME Express REST API and the SAME PostgreSQL database. No second backend, no mocks, no hardcoded data in any UI.

## Stack (fixed, do not substitute)

- TypeScript everywhere, pnpm workspaces monorepo
- apps/api: Node.js + Express + Prisma + PostgreSQL, Zod validation, pino logging
- apps/web: Next.js (App Router) + Tailwind + TanStack Query
- apps/mobile: Expo (React Native) + expo-router + TanStack Query + expo-secure-store + @react-native-community/netinfo
- packages/shared: Zod schemas, enums, labels, error codes, DTO types (single source of truth)
- packages/api-client: typed fetch client used by BOTH web and mobile
- Tests: Vitest + Supertest (real Postgres via docker compose, not mocks)

## Requirement Traceability

Auth: register, login, logout, GET /api/auth/me. Unique email (case-insensitive). Passwords hashed. Stay logged in until logout or expiry.
Projects: CRUD. Fields: name, description, status, startDate, endDate, createdAt. List only own projects.
Tasks: CRUD plus mark completed. Fields: name, description, priority, status, dueDate, createdAt. List tasks per project.
Dashboard: totalProjects, totalTasks, completedTasks, pendingTasks, projectsInProgress, inProgressTasks and overdueTasks. Scoped to the logged-in user.
Search and filter: projects by name and status; tasks by name, status, priority.
Mobile: register, login, logout, dashboard, projects and tasks, task create/edit/delete, mark complete, change status and priority, search and filter tasks, pull-to-refresh, token in secure storage, expired token goes to login with a clear message, offline shows a clear message.
Backend: REST, route organization, middleware, centralized error handling, logging, clean structure, CORS limited to the web domain.
DB: relational, foreign keys, normalized.
Security: hashing, protected routes, strict per-user authorization, backend validation, SQL injection safe, rate limiting on auth endpoints, no sensitive data in responses.

## Architecture Rules

- API layers: route -> controller -> service -> repository.
- Every repository method takes userId as a required parameter and filters by it.
- Tasks carry user_id and use a composite foreign key (project_id, user_id) referencing projects (id, user_id).
- IDs are UUIDs. Email column is citext unique.
- Responses go through DTO mappers. Never return a raw DB row.
- Success envelope: { "success": true, "data": ... , "meta"?: ... }
- Error envelope: { "success": false, "error": { "code", "message", "fields"?, "requestId" } }
- Auth uses a 15 minute access JWT plus rotating opaque refresh token stored hashed in DB.
- Env vars are validated with Zod at boot. Only .env.example is committed.

## Security Rules

- helmet, CORS allow-list from env, express-rate-limit on /auth/*, body size limit, Zod .strict() on every body, query and param schema.
- No string-built SQL anywhere. Prisma only. No $queryRawUnsafe.
- pino redacts authorization, cookie, password, token fields.
- Generic "Invalid credentials" message. No user enumeration.
- No secrets in git. No console.log in committed code.

## Code Quality Rules

- Strict TypeScript, no any, no @ts-ignore. ESLint and Prettier must pass.
- Files under about 200 lines. Functions do one thing. Meaningful names.
- No TODO, placeholders, lorem ipsum, mocked API, fake data in UI, or commented-out code.
- Every UI screen has loading, empty, error and success states.
- Accessibility: labels on inputs, focus rings, color is never the only signal, 44px touch targets on mobile.

## UI Design System "Calm Focus"

Dark first, with light theme and system preference. Tokens:
bg #0B0F1A / #F7F8FC, surface #121829 / #FFFFFF, border #1E2740 / #E6E9F2, text #E8ECF8 / #0F1424, muted #8A94B2 / #5B6482,
primary #7C5CFF, accent #22D3EE, success #34D399, warning #FBBF24, danger #F87171.
Fonts: Inter and Space Grotesk. Radius 12 to 16px, 1px borders, soft shadows, 150 to 200ms transitions.

## Working Protocol

1. Before coding, restate the phase goal and list the files you will create.
2. Implement fully. No stubs.
3. After coding, run the acceptance commands of the phase and paste the real output.
4. Finish with a short report: what was built, what was verified, what is not done or needs the human.
5. Never claim a command passed unless it ran in this session.
6. Do not touch files outside the phase scope unless required, and say why.

## Definition Of Done

Typecheck, lint, tests and build all pass. Authorization matrix test passes. README lets a stranger run everything. APK points at the deployed API.
