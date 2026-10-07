# Orbit

Orbit is a project management system with a shared API, web app, Android app, and PostgreSQL database.

## Local Development

Use the bundled workspace scripts from the repository root:

```bash
pnpm install
docker compose up -d db
pnpm typecheck
pnpm lint
```

The local Postgres container is exposed on host port `55432` to avoid conflicts with other local databases.

Use this local development database URL:

```text
DATABASE_URL=postgresql://orbit:orbit@localhost:55432/orbit?schema=public
```

The API also requires JWT secrets in local `.env` files:

```text
JWT_ACCESS_SECRET=replace-with-at-least-32-characters-access-secret
JWT_REFRESH_SECRET=replace-with-at-least-32-characters-refresh-secret
```

CI uses its own PostgreSQL service and sets its own `DATABASE_URL` pointing at `localhost:5432`.

## Auth API

Phase 2 adds these endpoints:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Register and login return a 15 minute access token plus a rotating refresh token. The API also sets the refresh token in an HTTP-only cookie for web clients.

## Seed Data

Phase 1 seeds two test users:

- `demo@orbit.test` / `StrongTestPassword123!`
- `other@orbit.test` / `StrongTestPassword123!`

The seed creates 3 projects and 15 varied tasks, including overdue and completed items.
